# Published Builder projects in the Buyer marketplace

Date: 2026-11-07. Source implementation; staging deployment and live verification are separate checkpoints.

## User flow

1. A signed-in Builder creates a project using the existing Builder form and image-upload workflow.
2. DRAFT projects remain private. Selecting PUBLISHED uses the existing ownership and write-access checks; no new approval workflow is introduced.
3. Buyer Home displays a separate Builder projects section. Browse all opens project search and pagination without mixing project IDs or pagination with Property listings.
4. Opening a project reads its current public details, photos, available plans and actual AVAILABLE unit rows.
5. Publication changes, project edits, image attachments and inventory changes invalidate public reads through the existing anonymous WebSocket channel. Foreground HTTP refresh also resynchronizes when a hint is missed.
6. Unpublished, archived, completed, orphaned projects and projects belonging to suspended or no-longer-Builder profiles are excluded. Previously opened details become unavailable on their next authoritative read.

The website/admin authentication, Property catalogue, roles and separate fictional preview are unchanged.

## Public API contracts

- `GET /api/mobile/projects?page=1&pageSize=12`: `{projects, page, hasMore, source: "database"}`. Optional `keyword` and `city` filters. Page range 1–1000, server page size 1–24; Flutter requests 12.
- `GET /api/mobile/projects/[id]?unitsPage=1`: `{project, source: "database"}`. The nested project includes `units`, `unitsPage` and `unitsHasMore`; 24 AVAILABLE units per page with a lookahead. Hidden/missing projects return 404.
- Both routes are credential-free public GETs with explicit allowlisted projections. Flutter uses its existing API client without sending or accepting authentication cookies for these reads, including after logout.

Project fields: ID, name, city/locality/address, description, amenities, construction/completion information, declared inventory counts, images, status and timestamps. Detail additionally exposes public image floor plans/master plan and available-unit summaries. Unit fields: ID, type, area/unit, bedrooms, bathrooms, price, public images and AVAILABLE status.

Builder IDs/contact details, team members, bookings, activities, campaigns, AI reports, unit numbers and private documents are excluded. Brochures and QR URLs are not exposed through these APIs. Public image URLs reject private-file paths, signed query strings, credentials, non-HTTPS URLs and non-image paths. Existing Flutter exact-host allowlists, default TLS validation, redirect rejection and image size/time limits remain in force.

## Boundaries and limitations

- Builder projects remain `BuilderProject` records. No duplicate Property records or schema migration are created.
- Declared project unit totals are Builder-supplied metadata; the AVAILABLE-unit list is read from actual unit records. Neither model defines a currency field, so no currency is invented.
- Property favorites, collections, enquiries, owner-contact and Property chat APIs do not accept project IDs. They are not offered as simulated project actions. Project-specific enquiries/contact require a separately designed backend capability.
- Generic `properties.changed` messages contain no account/project IDs or record data. PostgreSQL delivers write notifications after transaction commit; rollback discards them. The existing realtime service must be enabled and deployed for immediate hints. HTTP refresh remains authoritative.
- Profile suspension/role changes are enforced by public queries; without a project mutation hint, removal is observed on the next foreground refresh. Immediate delivery is not guaranteed while offline or backgrounded.
- Existing projects may be published without photos under current backend policy; missing/disallowed images have a visible fallback. No new publication gate is imposed.

## Verification and activation

Backend `npm run typecheck` passes. Four isolated mocked-boundary Node suites
pass 74 checks: public project catalogue (9), Builder integrity (31), Builder
uploads (23), existing Property realtime writes (11). Each suite runs in its own
Node process to isolate its module mocks. The new catalogue suite is included in
`test:role-workflows`.

The five-file Flutter run passes 81 tests covering the new public project
models/screens/repository and existing marketplace, live-refresh and WebSocket
regressions. A final actual Buyer-home publication hint → project card → detail
→ available-unit navigation test was added; the final focused UI/model run
passes 18/18. Across the runs, 82 distinct Flutter cases pass. Property-only
fixtures now answer project reads independently, preserving their original
request-count and Retry-After assertions. Seven-file focused Flutter analysis
exits 0 with no errors or warnings; 14 pre-existing informational findings in
the original repository/screen remain, and new files are clean. These are local
tests with mocked HTTP/database boundaries, not staging runtime evidence.

Files in this feature slice:

- Public backend: `src/lib/builder/mobile-catalog.ts`,
  `src/app/api/mobile/projects/route.ts`,
  `src/app/api/mobile/projects/[id]/route.ts`.
- Commit-bound refresh: `backend/api/builder/projects/route.ts`,
  `backend/api/builder/projects/[id]/route.ts`,
  `backend/api/builder/projects/[id]/units/route.ts`,
  `backend/api/builder/projects/[id]/bookings/route.ts`,
  `backend/api/builder/bookings/[id]/route.ts`,
  `src/app/api/mobile/upload/route.ts`,
  `src/app/api/mobile/workspace/[id]/route.ts`,
  `src/lib/properties/realtime.ts` (shared-channel documentation).
- Flutter: `mobile-app/lib/features/marketplace/public_project.dart`,
  `public_projects_screen.dart`, `marketplace_repository.dart`,
  `marketplace_screen.dart` (all in the same marketplace directory).
- Tests: `tests/mobile-project-catalog.test.mjs`,
  `tests/role-builder-integrity.test.mjs`, `tests/builder-project-upload.test.mjs`,
  `mobile-app/test/public_projects_ui_test.dart`,
  `mobile-app/test/public_project_repository_test.dart`,
  `mobile-app/test/listing_live_refresh_test.dart`, plus the `package.json`
test-chain entry.
- Documentation: this file, `HOMEZONE_COMPLETE_INTEGRATION_STATUS.md`,
  `HOMEZONE_REMAINING_BLOCKERS.md` in `mobile-app/docs`.

The three pre-existing modified crash-fix files
(`workspace_screen.dart`, `builder_project_form_test.dart`,
`BUILDER_PROJECT_IMAGE_UPLOADS.md`) were preserved without changes by this slice.

## Staging debug artifact

The existing offline build succeeds:

```cmd
cd /d C:\Users\kkyad\OneDrive\Desktop\homezone\homezone\mobile-app
node scripts/build-android.mjs --mode service --config config/staging.local.json
```

Before execution the configuration was checked for API enabled, environment
`staging`, and exact origin `https://homezone-staging.up.railway.app`.
The build record confirms service/staging/debug, ARMv7/ARM64/x86_64 targets and
fresh output. Artifact: `mobile-app/build/app/outputs/apk/debug/app-debug.apk`,
200,240,742 bytes, SHA256
`1fbf3198a84b6f4803c5f5174a02ab6ebc910130192f4e1f861976b54968604d`.
Evidence: `mobile-app/build/android-source-builds/2026-11-07T04-52-02-495Z-171792`.
This supersedes the November 6 APK at the same path. It was not installed or
launched in this slice. `runtimeVerified` and `liveServiceVerified` remain false.
The final backend typecheck also passes after the last public-text normalization
correction; `git diff --check` passes.

No backend deployment, account/project creation, upload, database operation,
migration, environment/infrastructure change, production access, commit or push
was performed. Deployment and controlled live mutation/device verification need
separate owner approval.

Before claiming runtime completion: approve and deploy the backend changes to the identified staging service, confirm the new GET routes are available, prepare/install an explicitly staging-configured APK with owner approval, and use an authorized Builder fixture. Verify actual Builder publication, Buyer card/detail display, images/units, updates and unpublication using Android presentation and correlated staging request/response evidence. Creating/editing/publishing a real project is a separately approved database write. No production operation is required.

The prior Android clipboard/System UI ANR and unavailable emulator are independent blockers to device verification. This feature does not alter renderer or Android configuration.
