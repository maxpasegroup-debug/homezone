import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as filesystem from "node:fs/promises";
import { registerHooks } from "node:module";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// The real storage and route run against synthetic temporary files only.
// Mount evidence is synthetic; no real Railway, network or database is used.
const fixture = { filesystem, mountInfo: "", failWrite: false };
globalThis.__propertyVolumeFixture = fixture;
const fsFixture = `
const state=globalThis.__propertyVolumeFixture;
export const access=state.filesystem.access;
export const lstat=state.filesystem.lstat;
export const mkdir=state.filesystem.mkdir;
export const realpath=state.filesystem.realpath;
export const link=state.filesystem.link;
export const unlink=state.filesystem.unlink;
export const readFile=(name,...rest)=>name==='/proc/self/mountinfo'?Promise.resolve(state.mountInfo):state.filesystem.readFile(name,...rest);
export const open=async (...args)=>{
 const file=await state.filesystem.open(...args);
 if(state.failWrite&&String(args[0]).includes('.upload-')){
  const original=file.writeFile.bind(file);
  file.writeFile=async bytes=>{await original(bytes.subarray(0,1));throw new Error('SYNTHETIC_PRIVATE_CAPACITY_FAILURE');};
 }
 return file;
};`;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "node:fs/promises" && context.parentURL?.includes("property-photo-storage.ts")) {
      return { url: `data:text/javascript,${encodeURIComponent(fsFixture)}`, shortCircuit: true };
    }
    if (specifier.startsWith("@/")) return { url: new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith(".ts") && !url.includes("node_modules")) return {
      format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
      }).outputText
    };
    return next(url, context);
  }
});
const storage = await import("../src/lib/media/property-photo-storage.ts");
const route = await import("../src/app/api/property-photos/[filename]/route.ts");
hooks.deregister();

const origin = "https://homezone-staging.up.railway.app";
const environmentKeys = ["PROPERTY_PHOTO_STORAGE", "AUTH_URL", "NEXTAUTH_URL", "AUTH_STAGING_ORIGIN", "RAILWAY_VOLUME_NAME", "RAILWAY_VOLUME_MOUNT_PATH", "PGDATA", "NODE_ENV"];
const originalEnvironment = Object.fromEntries(environmentKeys.map(key => [key, process.env[key]]));
const jpeg = new Uint8Array([255, 216, 255, 1, 2, 3]);
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 1]);
const webp = new Uint8Array([82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80]);
function mountPath(value) { return value.replaceAll("\\", "\\134").replaceAll(" ", "\\040"); }
function reset(root) {
  Object.assign(process.env, {
    PROPERTY_PHOTO_STORAGE: "railway-volume", AUTH_URL: origin,
    NEXTAUTH_URL: origin, AUTH_STAGING_ORIGIN: origin,
    RAILWAY_VOLUME_NAME: "synthetic-property-photos", RAILWAY_VOLUME_MOUNT_PATH: root,
    NODE_ENV: "production"
  });
  delete process.env.PGDATA;
  fixture.mountInfo = `42 21 0:53 / ${mountPath(root)} rw - ext4 /dev/synthetic rw\n`;
  fixture.failWrite = false;
}
function photoName(upload) { return new URL(upload.url).pathname.split("/").at(-1); }
function request() { return new Request(`${origin}/api/property-photos/synthetic`); }
function context(filename) { return { params: Promise.resolve({ filename }) }; }

test("staging volume property photos are durable, isolated and safely public", async t => {
  const temporaryRoot = await filesystem.mkdtemp(path.join(os.tmpdir(), "homezone-volume-test-"));
  const roots = [];
  async function freshRoot() {
    const root = await filesystem.mkdtemp(path.join(temporaryRoot, "mount-"));
    roots.push(root);
    reset(root);
    return root;
  }
  try {
    await t.test("default remains Cloudinary, explicit volume opt-in and unknown providers fail closed", async () => {
      await freshRoot();
      delete process.env.PROPERTY_PHOTO_STORAGE;
      assert.equal(storage.propertyPhotoStorageProvider(), "cloudinary");
      process.env.PROPERTY_PHOTO_STORAGE = "cloudinary";
      assert.equal(storage.propertyPhotoStorageProvider(), "cloudinary");
      process.env.PROPERTY_PHOTO_STORAGE = "railway-volume";
      assert.equal(storage.propertyPhotoStorageProvider(), "railway-volume");
      process.env.PROPERTY_PHOTO_STORAGE = "filesystem";
      assert.throws(storage.propertyPhotoStorageProvider, /storage unavailable/);
    });
    await t.test("readiness is read-only and accepts a fresh real-mount fixture", async () => {
      const root = await freshRoot();
      assert.equal(await storage.propertyPhotoVolumeReady(), true);
      assert.deepEqual(await filesystem.readdir(root), []);
      fixture.mountInfo = "42 21 0:53 / /unrelated rw - ext4 /dev/synthetic rw\n";
      assert.equal(await storage.propertyPhotoVolumeReady(), false);
      assert.deepEqual(await filesystem.readdir(root), []);
      for (const filesystemType of ["tmpfs", "ramfs", "overlay"]) {
        fixture.mountInfo = `42 21 0:53 / ${mountPath(root)} rw - ${filesystemType} /dev/synthetic rw\n`;
        assert.equal(await storage.propertyPhotoVolumeReady(), false);
      }
      fixture.mountInfo = `42 21 0:53 / ${mountPath(root)} ro - ext4 /dev/synthetic ro\n`;
      assert.equal(await storage.propertyPhotoVolumeReady(), false);
    });
    await t.test("missing injected mount identity, nonexistent path and production/conflicting origin fail closed", async () => {
      const root = await freshRoot();
      for (const key of ["RAILWAY_VOLUME_NAME", "RAILWAY_VOLUME_MOUNT_PATH", "AUTH_STAGING_ORIGIN"]) {
        reset(root); delete process.env[key];
        assert.equal(await storage.propertyPhotoVolumeReady(), false);
      }
      for (const [key, value] of [
        ["AUTH_URL", "https://speeko.online"], ["NEXTAUTH_URL", "https://speeko.online"],
        ["AUTH_STAGING_ORIGIN", "https://speeko.online"],
        ["RAILWAY_VOLUME_MOUNT_PATH", path.join(root, "absent")],
        ["RAILWAY_VOLUME_MOUNT_PATH", "relative/path"]
      ]) {
        reset(root); process.env[key] = value;
        assert.equal(await storage.propertyPhotoVolumeReady(), false);
      }
      assert.deepEqual(await filesystem.readdir(root), []);
    });
    await t.test("PostgreSQL and private-document mounts are never reused", async () => {
      const root = await freshRoot();
      for (const marker of ["PG_VERSION", "postgresql.conf", "pgdata", "private-files", "documents"]) {
        await filesystem.writeFile(path.join(root, marker), "synthetic");
        assert.equal(await storage.propertyPhotoVolumeReady(), false);
        await filesystem.unlink(path.join(root, marker));
      }
      process.env.PGDATA = path.join(root, "database");
      assert.equal(await storage.propertyPhotoVolumeReady(), false);
      process.env.PGDATA = path.dirname(root);
      assert.equal(await storage.propertyPhotoVolumeReady(), false);
      delete process.env.PGDATA;
      process.env.RAILWAY_VOLUME_NAME = "Postgres-9ZqA";
      assert.equal(await storage.propertyPhotoVolumeReady(), false);
      reset(root);
      for (const name of ["postgresql", "private-files", "credentials"]) {
        const badRoot = path.join(root, name); await filesystem.mkdir(badRoot);
        reset(badRoot);
        assert.equal(await storage.propertyPhotoVolumeReady(), false);
      }
    });
    await t.test("JPEG PNG and WebP create random immutable files and canonical HTTPS URLs", async () => {
      const root = await freshRoot();
      const names = [];
      for (const [bytes, mime, extension] of [[jpeg, "image/jpeg", "jpg"], [png, "image/png", "png"], [webp, "image/webp", "webp"]]) {
        const upload = await storage.storeVolumePropertyPhoto(bytes, mime);
        const name = photoName(upload); names.push(name);
        assert.match(name, new RegExp(`^[a-f0-9]{48}\\.${extension}$`));
        assert.equal(upload.url, `${origin}/api/property-photos/${name}`);
        assert.equal(upload.publicId, `property-volume/${name}`);
        assert.equal(upload.resourceType, "image");
        assert.deepEqual(new Uint8Array(await filesystem.readFile(path.join(root, "property-photos", name))), bytes);
        const read = await storage.readVolumePropertyPhoto(name);
        assert.equal(read.contentType, mime);
        assert.deepEqual(read.bytes, bytes);
      }
      assert.deepEqual((await filesystem.readdir(path.join(root, "property-photos"))).sort(), names.sort());
      const duplicate = await storage.storeVolumePropertyPhoto(jpeg, "image/jpeg");
      assert.ok(!names.includes(photoName(duplicate)));
    });
    await t.test("invalid bytes MIME mismatches GIF documents and oversized files are rejected without writing", async () => {
      const root = await freshRoot();
      for (const [bytes, mime] of [[png, "image/jpeg"], [jpeg, "image/png"], [new Uint8Array(), "image/jpeg"], [Buffer.from("GIF89a"), "image/gif"], [Buffer.from("%PDF-1.7"), "application/pdf"]]) {
        await assert.rejects(storage.storeVolumePropertyPhoto(bytes, mime), /JPEG, PNG or WebP/);
      }
      const oversized = new Uint8Array(6 * 1024 * 1024 + 1); oversized.set(jpeg);
      await assert.rejects(storage.storeVolumePropertyPhoto(oversized, "image/jpeg"), /6 MiB/);
      assert.deepEqual(await filesystem.readdir(root), []);
    });
    await t.test("a failed partial write removes only its own file and publishes no partial image", async () => {
      const root = await freshRoot();
      const retained = await storage.storeVolumePropertyPhoto(jpeg, "image/jpeg");
      fixture.failWrite = true;
      await assert.rejects(storage.storeVolumePropertyPhoto(png, "image/png"), /storage unavailable/);
      assert.deepEqual(await filesystem.readdir(path.join(root, "property-photos")), [photoName(retained)]);
      assert.deepEqual((await storage.readVolumePropertyPhoto(photoName(retained))).bytes, jpeg);
    });
    await t.test("paths, extension confusion, directories and oversized existing files are not public photos", async () => {
      const root = await freshRoot();
      const upload = await storage.storeVolumePropertyPhoto(jpeg, "image/jpeg");
      const directory = path.join(root, "property-photos");
      for (const name of ["../photo.jpg", "/etc/passwd", "photo.jpg", ".upload-secret.tmp", `${"a".repeat(48)}.svg`, photoName(upload).toUpperCase(), `${photoName(upload)}?query=1`]) {
        assert.equal(await storage.readVolumePropertyPhoto(name), null);
      }
      const wrongExtension = `${"b".repeat(48)}.png`;
      await filesystem.writeFile(path.join(directory, wrongExtension), jpeg);
      assert.equal(await storage.readVolumePropertyPhoto(wrongExtension), null);
      const folderName = `${"c".repeat(48)}.jpg`;
      await filesystem.mkdir(path.join(directory, folderName));
      assert.equal(await storage.readVolumePropertyPhoto(folderName), null);
      const largeName = `${"d".repeat(48)}.jpg`;
      const handle = await filesystem.open(path.join(directory, largeName), "w");
      await handle.truncate(6 * 1024 * 1024 + 1); await handle.close();
      assert.equal(await storage.readVolumePropertyPhoto(largeName), null);
    });
    await t.test("symlink directories and photo files are never followed", async t => {
      const root = await freshRoot();
      const target = await filesystem.mkdtemp(path.join(temporaryRoot, "target-"));
      const directory = path.join(root, "property-photos");
      try { await filesystem.symlink(target, directory, "junction"); }
      catch (error) {
        if (["EPERM", "EACCES"].includes(error.code)) { t.skip("Synthetic symlink creation is unavailable on this host"); return; }
        throw error;
      }
      assert.equal(await storage.propertyPhotoVolumeReady(), false);
      await filesystem.unlink(directory);
      const uploaded = await storage.storeVolumePropertyPhoto(jpeg, "image/jpeg");
      const linkName = `${"e".repeat(48)}.jpg`;
      try { await filesystem.symlink(path.join(directory, photoName(uploaded)), path.join(directory, linkName), "file"); }
      catch (error) {
        if (["EPERM", "EACCES"].includes(error.code)) { t.diagnostic("File-symlink fixture unavailable; directory containment assertion passed"); return; }
        throw error;
      }
      assert.equal(await storage.readVolumePropertyPhoto(linkName), null);
    });
    await t.test("public GET and HEAD have image-only immutable headers without cookies; old URLs survive provider switch", async () => {
      await freshRoot();
      const uploaded = await storage.storeVolumePropertyPhoto(jpeg, "image/jpeg");
      process.env.PROPERTY_PHOTO_STORAGE = "cloudinary";
      const response = await route.GET(request(), context(photoName(uploaded)));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "image/jpeg");
      assert.equal(response.headers.get("content-length"), String(jpeg.length));
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
      assert.equal(response.headers.get("set-cookie"), null);
      assert.deepEqual(new Uint8Array(await response.arrayBuffer()), jpeg);
      const head = await route.HEAD(request(), context(photoName(uploaded)));
      assert.equal(head.status, 200);
      assert.equal(head.headers.get("content-length"), String(jpeg.length));
      assert.equal(await head.text(), "");
      const absent = await route.GET(request(), context(`${"f".repeat(48)}.jpg`));
      assert.equal(absent.status, 404);
      assert.equal(absent.headers.get("cache-control"), "no-store");
    });
    await t.test("storage failures produce sanitized non-cacheable errors instead of paths or configuration", async () => {
      await freshRoot();
      const upload = await storage.storeVolumePropertyPhoto(jpeg, "image/jpeg");
      delete process.env.RAILWAY_VOLUME_NAME;
      const response = await route.GET(request(), context(photoName(upload)));
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(await response.text(), "");
    });
  } finally {
    for (const key of environmentKeys) {
      if (originalEnvironment[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnvironment[key];
    }
    delete globalThis.__propertyVolumeFixture;
    // All targets are synthetic descendants of this test's own mkdtemp root.
    const resolved = path.resolve(temporaryRoot);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith("homezone-volume-test-"));
    await filesystem.rm(resolved, { recursive: true, force: true });
  }
});
