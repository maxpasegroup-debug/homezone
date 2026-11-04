import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { access, lstat, mkdir, open, readFile, realpath, link, unlink } from "node:fs/promises";
import path from "node:path";
import { authOrigin } from "@/lib/auth/redirect";

const stagingOrigin = "https://homezone-staging.up.railway.app";
const maximumBytes = 6 * 1024 * 1024;
const photoDirectory = "property-photos";
const filenamePattern = /^[a-f0-9]{48}\.(jpg|png|webp)$/;
const mimeExtensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
type PhotoMime = keyof typeof mimeExtensions;

export class PropertyPhotoStorageUnavailable extends Error {
  constructor() { super("Property photo storage unavailable"); }
}

export function propertyPhotoStorageProvider(): "cloudinary" | "railway-volume" {
  const provider = process.env.PROPERTY_PHOTO_STORAGE;
  if (provider === undefined || provider === "" || provider === "cloudinary") return "cloudinary";
  if (provider === "railway-volume") return provider;
  throw new PropertyPhotoStorageUnavailable();
}

function mimeForBytes(bytes: Uint8Array): PhotoMime | null {
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes.length >= 12 && Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" &&
      Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP") return "image/webp";
  return null;
}

function samePath(first: string, second: string) { return path.relative(first, second) === ""; }
function containsPath(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}
function decodeMountPath(value: string) { return value.replace(/\\([0-7]{3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8))); }
function storageFailure(): never { throw new PropertyPhotoStorageUnavailable(); }
function missing(error: unknown) { return (error as NodeJS.ErrnoException)?.code === "ENOENT"; }

async function directoryIfPresent(directory: string) {
  try {
    const entry = await lstat(directory);
    if (!entry.isDirectory() || entry.isSymbolicLink() || !samePath(directory, await realpath(directory))) storageFailure();
    return entry;
  } catch (error) {
    if (missing(error)) return null;
    throw error;
  }
}

async function volumeConfiguration(writable: boolean) {
  try {
    // Staging Next.js uses NODE_ENV=production. The canonical origin, not the
    // build mode or an incoming Host header, limits this temporary adapter.
    if (process.env.AUTH_STAGING_ORIGIN?.replace(/\/$/, "") !== stagingOrigin || authOrigin() !== stagingOrigin) storageFailure();
    const name = process.env.RAILWAY_VOLUME_NAME;
    const configured = process.env.RAILWAY_VOLUME_MOUNT_PATH;
    if (!name || name.trim() !== name || name.length > 120 || /[\x00-\x1f\x7f]/.test(name) ||
        /postgres(?:ql)?|pgdata|database|private[-_ ]?(?:file|document)/i.test(name) ||
        !configured || configured.trim() !== configured || !path.isAbsolute(configured) ||
        configured.split(/[\\/]/).includes("..")) storageFailure();
    const root = path.resolve(configured);
    const unsafeRoots = new Set([path.parse(root).root, "/app", "/tmp", "/var", "/etc", "/usr", "/bin", "/sbin", "/proc", "/sys", "/dev", "/home", "/root", "/workspace"]);
    if (unsafeRoots.has(root) || root.split(/[\\/]/).some(part => /^(?:postgres(?:ql)?|pgdata|private(?:[-_]files)?|documents?|secrets?|credentials?)$/i.test(part))) storageFailure();
    if (process.env.PGDATA) {
      const pgdata = path.resolve(process.env.PGDATA);
      if (containsPath(root, pgdata) || containsPath(pgdata, root)) storageFailure();
    }
    const rootEntry = await directoryIfPresent(root);
    if (!rootEntry) storageFailure();
    // An ordinary directory plus an environment variable must never silently
    // become ephemeral storage. Railway mounts are available only at runtime.
    const mountInfo = await readFile("/proc/self/mountinfo", "utf8");
    if (!mountInfo.split("\n").some(line => {
      const fields = line.split(" ");
      const separator = fields.indexOf("-");
      const filesystem = fields[separator + 1];
      return fields.length > 6 && separator > 5 &&
        !["tmpfs", "ramfs", "overlay", "rootfs", "proc", "sysfs", "devtmpfs", "squashfs"].includes(filesystem) &&
        (!writable || fields[5].split(",").includes("rw")) &&
        samePath(root, path.resolve(decodeMountPath(fields[4])));
    })) storageFailure();
    // Never reuse a PostgreSQL data volume, even if its mount is named /data.
    for (const marker of ["PG_VERSION", "postgresql.conf", "pgdata", "postgres", "postgresql", "private-files", "private_files", "documents"]) {
      try { await lstat(path.join(root, marker)); storageFailure(); }
      catch (error) { if (!missing(error)) throw error; }
    }
    const directory = path.join(root, photoDirectory);
    const existing = await directoryIfPresent(directory);
    await access(root, constants.R_OK | constants.X_OK | (writable ? constants.W_OK : 0));
    if (existing) await access(directory, constants.R_OK | constants.X_OK | (writable ? constants.W_OK : 0));
    return { root, directory };
  } catch { return storageFailure(); }
}

/** Read-only readiness: a fresh mounted volume needs no pre-created subfolder. */
export async function propertyPhotoVolumeReady(): Promise<boolean> {
  try { await volumeConfiguration(true); return true; }
  catch { return false; }
}

export async function storeVolumePropertyPhoto(bytes: Uint8Array, declaredMimeType: string): Promise<{
  url: string; publicId: string; resourceType: "image";
}> {
  if (!bytes.length || bytes.length > maximumBytes) throw new Error("Use a JPEG, PNG or WebP photograph up to 6 MiB");
  // Own the size-admitted bytes before asynchronous filesystem work.
  bytes = Uint8Array.from(bytes);
  const mime = mimeForBytes(bytes);
  if (!mime || mime !== declaredMimeType) {
    throw new Error("Use a JPEG, PNG or WebP photograph up to 6 MiB");
  }
  const { root, directory } = await volumeConfiguration(true);
  let temporaryPath: string | undefined;
  let publishedPath: string | undefined;
  let ownedInode: number | undefined;
  try {
    try { await mkdir(directory, { mode: 0o700 }); }
    catch (error) { if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") throw error; }
    if (!await directoryIfPresent(directory)) storageFailure();
    const filename = `${randomBytes(24).toString("hex")}.${mimeExtensions[mime]}`;
    temporaryPath = path.join(directory, `.upload-${randomBytes(24).toString("hex")}.tmp`);
    const file = await open(temporaryPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    try {
      ownedInode = (await file.stat()).ino;
      await file.writeFile(bytes);
      await file.sync();
    } finally { await file.close(); }
    // Recheck containment before publication. link() is atomic and will never
    // replace an existing random filename; incomplete files have no public URL.
    if (!await directoryIfPresent(root) || !await directoryIfPresent(directory)) storageFailure();
    const destination = path.join(directory, filename);
    await link(temporaryPath, destination);
    publishedPath = destination;
    await unlink(temporaryPath);
    temporaryPath = undefined;
    // Persist the directory entry as well as the image before acknowledging it.
    // Real Railway is Linux; Windows synthetic filesystem tests cannot fsync directories.
    if (process.platform !== "win32") {
      const handle = await open(directory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      try { await handle.sync(); } finally { await handle.close(); }
    }
    return { url: `${stagingOrigin}/api/property-photos/${filename}`, publicId: `property-volume/${filename}`, resourceType: "image" };
  } catch {
    // Only files created by this invocation may be removed after a failed write.
    for (const ownPath of [temporaryPath, publishedPath]) {
      if (ownPath) try {
        const entry = await lstat(ownPath);
        if (entry.isFile() && !entry.isSymbolicLink() && entry.ino === ownedInode) await unlink(ownPath);
      } catch { /* Preserve uncertain files; never delete another record's photo. */ }
    }
    return storageFailure();
  }
}

/** Reads remain available after new uploads switch back to Cloudinary. */
export async function readVolumePropertyPhoto(filename: string): Promise<{ bytes: Uint8Array; contentType: PhotoMime } | null> {
  if (!filenamePattern.test(filename)) return null;
  const { directory } = await volumeConfiguration(false);
  if (!await directoryIfPresent(directory)) return null;
  const filenamePath = path.join(directory, filename);
  let pathEntry;
  try { pathEntry = await lstat(filenamePath); }
  catch (error) { if (missing(error)) return null; return storageFailure(); }
  if (!pathEntry.isFile() || pathEntry.isSymbolicLink()) return null;
  let file;
  try { file = await open(filenamePath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
  catch (error) {
    if (missing(error) || ["ELOOP", "EINVAL"].includes((error as NodeJS.ErrnoException)?.code ?? "")) return null;
    return storageFailure();
  }
  try {
    const entry = await file.stat();
    if (!entry.isFile() || entry.ino !== pathEntry.ino || entry.dev !== pathEntry.dev || entry.size < 1 || entry.size > maximumBytes) return null;
    // Never use an unbounded readFile() on a mutable path. The extra byte detects
    // a growing file without allocating or reading past the fixed size ceiling.
    const bytes = new Uint8Array(entry.size + 1);
    let length = 0;
    while (length < bytes.length) {
      const result = await file.read(bytes, length, bytes.length - length, null);
      if (!result.bytesRead) break;
      length += result.bytesRead;
    }
    if (length !== entry.size) return null;
    const result = bytes.subarray(0, length);
    const mime = mimeForBytes(result);
    if (!mime || !filename.endsWith(`.${mimeExtensions[mime]}`)) return null;
    return { bytes: result, contentType: mime };
  } finally { await file.close(); }
}
