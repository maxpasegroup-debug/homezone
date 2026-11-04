# Staging property photos on a Railway volume

Date: 2026-11-04. Source baseline:
`8eec2030534300a850c3009f823d3ed5e42931fd`.

The founder selected Railway-volume storage for staging, with Cloudinary retained
for production. This implementation adds an adapter to the existing upload flow;
it does not replace authentication, listing creation or publication APIs.
**SOURCE IMPLEMENTED / LOCAL TESTED; NOT DEPLOYED OR DEVICE VERIFIED.**

## Storage contract

- `PROPERTY_PHOTO_STORAGE=railway-volume` selects volume writes explicitly.
  Unset, empty or `cloudinary` retains the existing Cloudinary implementation.
  Unknown values fail closed; a missing mount never falls back to container disk.
- Volume mode requires the exact canonical staging origin
  `https://homezone-staging.up.railway.app`, consistent existing Auth.js origin
  settings and Railway-injected `RAILWAY_VOLUME_NAME` and
  `RAILWAY_VOLUME_MOUNT_PATH`. Do not manufacture these injected variables.
- Runtime checks require a real, accessible Linux filesystem mount. Ephemeral,
  read-only, symlinked, PostgreSQL and private-document storage locations are
  rejected. Readiness probes do not create directories or files. Mounts are not
  required during application build or pre-deploy.
- The first admitted upload creates `property-photos/` inside the mounted root.
  Only JPEG, PNG and WebP signatures matching the declared MIME are admitted,
  with a six-MiB bound. Random filenames, exclusive temporary writes, file sync,
  atomic no-overwrite publication and directory sync precede acknowledgment.
- The existing `/api/mobile/upload` still checks authentication, suspension,
  role, ownership, body size and rate limits, then attaches the stored URL under
  its existing transaction. The common `/api/media/upload` uses this adapter
  only for property photographs. Reels retain their separate Cloudinary path;
  private documents retain their separate authenticated storage.
- Upload responses keep `url`, `publicId`, `resourceType: image`. URLs use the
  canonical staging HTTPS origin and `/api/property-photos/<random-image-name>`.
  The new GET/HEAD serves bounded immutable image bytes, with `nosniff` and a
  restrictive CSP. It exposes no filesystem path, file listing, delete operation,
  cookies or credentials. These are public property photos, as with existing
  public CDN assets; knowing a URL allows reading the image even for a draft.
- The existing two-distinct-photo publication rule, maximum six selections,
  independent stored-gallery readback and final PUBLISHED acknowledgment remain.
  No fake image, automatic create retry, schema or migration is added.

## Exact staging activation target

| Item | Approved staging identity from read-only inspection |
| --- | --- |
| Project | `1f8c9007-2993-426c-bbd0-b8dd0a0b17da` |
| Environment | `2181eadf-21a0-4ca3-8269-b6b6f28af9f4` |
| Backend service | `ea6ca516-4063-4ed1-be95-bebcc0d1af00` |
| Public domain | `homezone-staging.up.railway.app` |
| Previously active deployment | `8979038d-85e1-4e69-81d6-c224ed21b0f4` |
| Previously active commit | `8eec2030534300a850c3009f823d3ed5e42931fd` |

No photo volume was attached to this backend at inspection. The existing volume
belongs to PostgreSQL. Do not detach, reuse or alter it. Production is excluded.

After separate release approval:

1. Reconfirm the exact target, one backend replica, capacity/cost allowance,
   current deployment, database pending migration set and recovery evidence.
   This patch adds no migration, but `railway.json` pre-deploy runs
   `npm run db:migrate`, which can apply every pending migration. Approval of
   source implementation alone does not authorize that database operation.
2. In that backend service, add a **new dedicated photo volume** mounted at
   `/app/property-media`. Use a small approved staging allocation and monitor
   its capacity. Set up independent volume backups. Account for the service
   interruption that attaching a volume/deploying may cause.
3. Set only the new provider selector `PROPERTY_PHOTO_STORAGE=railway-volume`.
   Verify Railway injects its mount name and path. Preserve auth, database,
   canonical origins and every unrelated variable. No Cloudinary secret is
   required for staging property-photo writes in this mode.
4. Deploy this reviewed backend patch through the approved staging release
   procedure. The old active deployment cannot serve the new volume route.
   No push, deployment, restart or infrastructure action has been performed by
   this source slice.
5. Use a staging APK built with the existing configuration plus the exact image
   host `homezone-staging.up.railway.app`. Existing approved CDN hosts stay.
   A JSON edit does not change an installed APK. The website Next.js image
   configuration permits only this staging origin's photo route, conditionally
   on canonical staging settings. No wildcard host or insecure TLS is added.
6. Authenticated capabilities must return `propertyPhotoUploadConfigured:true`.
   That proves runtime mount readiness, not completed upload/publication.
7. Retry the retained form only when its previous failure was the confirmed
   before-create storage check. If a draft or uncertain create exists, read that
   record instead of submitting a duplicate.
8. For the authorized single test listing, upload two distinct photos; read both
   URLs independently; compare image bytes/MIME; confirm stored gallery and the
   same property ID/status PUBLISHED. Verify Owner details and Buyer Android
   images. A successful publication must finish from the form's one Publish
   action without reopening the listing for a second publication step.
9. Separately observe Buyer discovery already foreground during a controlled
   publication change. Confirm automatic readback and visible matching record
   without manual refresh. Polling success is not WebSocket acceptance.
10. After an approved restart/release, read the same photo URLs and compare
    bytes. Record actual Railway persistence, Linux mount/fsync, backup and
    capacity evidence. Local Windows fixtures do not prove these properties.

## Cloudinary transition and rollback

Production remains on the default Cloudinary adapter with its three existing
credentials. The volume adapter refuses a production canonical origin.
Selecting Cloudinary later affects **new uploads only**. It does not copy
existing photos or rewrite stored URLs. Keep the staging photo volume and read
route available for old URLs, or perform a separately approved, verified asset
copy and URL migration. A database backup alone does not contain image files.

Rollback must retain a compatible public photo route and the mounted files;
rolling back to an older artifact without that route breaks volume images.
Do not delete photos, the volume, listings or credentials as an automatic
rollback. Pause new publication if storage fails; preserve drafts and reconcile
uncertain operations through readback. There is no automated asset garbage
collection or aggregate capacity reservation in this staging adapter. Monitor
disk space; full-disk failures remain sanitized and never fabricate success.

Railway documents runtime-only mounts and volume deployment/replica constraints
in [Volumes](https://docs.railway.com/volumes) and
[Volume reference](https://docs.railway.com/volumes/reference). Photo-volume
backup/recovery needs its own procedure; see
[Volume backups](https://docs.railway.com/volumes/backups).

## Source and local checks

New: `src/lib/media/property-photo-storage.ts`,
`src/app/api/property-photos/[filename]/route.ts`,
`tests/property-photo-volume.test.mjs` and this document.

Updated: `backend/api/media/upload/route.ts`,
`src/app/api/mobile/capabilities/route.ts`, `next.config.ts`, `.env.example`,
`tests/property-photo-storage.test.mjs`, `package.json`,
`mobile-app/config/README.md`, the ignored staging JSON and the two current
integration status/blocker documents. No Flutter widget or authentication
architecture change is required.

Local photo checks: **66 passed**, comprising publication, admin publication,
shared storage/provider errors and synthetic volume/GET/HEAD checks. TypeScript
checking passed. Fixtures use synthetic temporary files and mocked mount
evidence; no actual Railway mount, live upload, database or account is used.

The updated staging debug APK compiled using the existing offline workflow:

```cmd
cd /d C:\Users\kkyad\OneDrive\Desktop\homezone\homezone\mobile-app
set "JAVA_HOME=C:\Program Files\Java\jdk-17"
node scripts/build-android.mjs --mode service --config config/staging.local.json
```

Artifact: `build/app/outputs/apk/debug/app-debug.apk`, 184,939,163 bytes.
SHA-256: `911f6941883db901324c6977defee73e917bfaf7b5a12dfeb35a288d8e1893d8`.
Record: `build/android-source-builds/2026-11-04T12-00-50-579Z-32676/build-record.json`.
Hash was independently checked. The previous APK is preserved beside that
record. API origin remains staging; only its exact image host was added to the
approved existing hosts. This APK was not installed or launched by this slice.
No live upload/publication, Railway variable/volume/service change, deployment,
database command/migration, production access, commit or push was performed.
