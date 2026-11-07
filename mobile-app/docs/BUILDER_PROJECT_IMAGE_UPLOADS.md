# Builder project images

Status: **SOURCE IMPLEMENTED / COMPILED — RUNTIME UNVERIFIED**. Backend typecheck,
isolated backend checks, focused Flutter tests, source analysis and the universal
staging debug APK build pass. No APK installation/launch, staging deployment,
live upload or database write was performed for this slice.

## Native form

Builder Create project and Edit project retain the existing form and add four
device image sections with local selected-image previews:

| Section | Stored field | New selections per save | Stored limit |
| --- | --- | --- | --- |
| Project photos | `mediaUrls` | 6 | 40 |
| Floor plans | `floorPlanUrls` | 6 | 30 |
| Master plan | `masterPlanUrl` | 1 | One reference |
| Brochure image | `brochureUrl` | 1 | One reference |

New uploads accept JPEG, PNG or WebP only, up to **6 MiB per image** and **24 MiB
across the selected batch**. Duplicate selections across sections are rejected;
selection errors appear beside the affected section and are brought into view.
Images stay in memory until Save; selecting an image does not itself upload it.
The native form no longer asks users to paste image URLs. Existing references are
retained: collection uploads append, while a confirmed new master-plan or
brochure image replaces its respective single reference. Existing PDF/document
links are retained and identified as saved documents, without loading document
previews. **PDF upload is not implemented by these image pickers.**

These assets use the existing public property-media storage. They are not private
documents: anyone who obtains the public asset URL may be able to retrieve it.
Do not upload identity documents, confidential plans or other restricted material
through these sections. Existing image host/TLS restrictions remain in place.

## API contract and permissions

| Request | Contract |
| --- | --- |
| `GET /api/mobile/capabilities` | Authenticated readiness projection. Requires `builderProjectImageUploadConfigured: true` and `builderProjectImageUploadFields` containing all four stored field names before the native save starts. A flag is not proof of live provider health. |
| `POST /api/builder/projects` | Existing create API and metadata. When images are selected, the native flow requests and confirms `status: DRAFT` first. |
| `PATCH /api/builder/projects/:id` | Existing metadata/status API. The image flow excludes media references from metadata payloads and defers requested status until attachment/readback succeeds. |
| `POST /api/mobile/upload` | Builder JSON, for example `{ "projectId": "project-0001", "field": "mediaUrls", "base64": "…" }`. `field` must be one exact stored field name from the four sections above. Returns `{ "url": "https://…", "project": { … } }` only after attaching the upload to the owned project. |
| `GET /api/builder/projects/:id` | Owned Builder readback: `{ "project": { "id", "status", "mediaUrls", "floorPlanUrls", "masterPlanUrl", "brochureUrl", "updatedAt" } }`; response is private/no-store. It does not return team, booking or internal document data. |

Builder uploads use the existing authenticated session, require an unsuspended
`BUILDER` profile and owned `BuilderProject`, and retain existing Builder
plan/write-access checks. Storage completion is followed by a transaction that
rechecks access/ownership and appends/replaces the selected reference. Collection
limits are checked again inside the transaction. A provider upload followed by
an unconfirmed database attachment produces an error, not success; no provider
asset is automatically deleted. The Builder adapter uses the separate
`mobile:builder-project-photo` key with 20 attempts/minute, matching the shared
provider's existing 20/minute ceiling. Owner/Broker retain their separate
`mobile:photo` 10/minute allowance and existing listing upload contract.

## Save sequence and uncertain outcomes

1. Validate selected fields, counts, byte limits and the current Builder session.
2. Confirm the Builder capability contract. An older backend with no Builder flag
   or field list stops here, before any draft is created.
3. Create one confirmed private draft, or update the existing project ID's
   metadata. Editing never creates a replacement project.
4. Upload each selected image sequentially and validate the returned HTTPS URL,
   project ID and saved reference. No credentials or response bodies are logged.
5. Read the owned project and confirm every new image reference is stored.
6. If necessary, apply only the requested status, then read back again and confirm
   status and image references. No status selection defaults a new project to
   DRAFT; an edit preserves the stored status. Existing Builder publication rules
   apply. This does not create a buyer-facing Property catalogue record.
7. Close the form with genuine confirmation only after all required checks pass.

Concurrent submissions are guarded. Once a non-idempotent mutation starts,
uncertain creation, upload, attachment or status outcomes cannot automatically
replay Save. The form retains a known project ID, disables another submission and
offers **Back to Projects**, asking the user to refresh before making changes.
The error says the save/uploads could not be fully confirmed and some changes
may already be stored; it does not claim the project was saved successfully.
Before mutation, unavailable capability preserves entered values and selected
images so the user can try again after service readiness is restored. Session,
actor and generation checks after awaits stop further writes after account
changes; local selected images clear on invalidation/disposal.

## Exact slice inventory

Paths below are repository-relative. Existing unrelated work is preserved.

| Files | Purpose |
| --- | --- |
| `mobile-app/lib/features/workspace/builder_project_images.dart` | Four native image selection sections, existing-reference previews, limits and visible field-local errors. |
| `mobile-app/lib/features/workspace/builder_project_image_save.dart` | One guarded create/edit attempt, sequential upload/readback, requested status confirmation and uncertainty handling. |
| `mobile-app/lib/features/workspace/listing_photo_picker.dart` | Reusable section labels and configurable image count while preserving Owner/Broker defaults. |
| `mobile-app/lib/features/workspace/workspace_screen.dart` | Actual Builder Create/Edit form integration; removes native URL-entry fields and retains prior references. |
| `src/app/api/mobile/upload/route.ts` | Builder-owned image upload/attachment branch and separate attempt allowance. |
| `src/app/api/mobile/capabilities/route.ts` | Builder-specific readiness flag and supported field projection. |
| `backend/api/builder/projects/[id]/route.ts` | Limited owned Builder project readback. |
| `src/app/api/builder/projects/[id]/route.ts` | Exports the readback alongside existing PATCH. |
| `src/lib/builder/project-media.ts` | Shared exact field names and limited project projection. |
| `mobile-app/test/builder_project_images_test.dart` | Picker, limits, preview and field-error regressions. |
| `mobile-app/test/builder_project_image_save_test.dart` | Save ordering, readback, capability, uncertain-write, identity and unsafe-response cases. |
| `mobile-app/test/builder_project_form_test.dart` | Actual Builder dashboard-to-form save, unavailable service and uncertain-upload UI cases. |
| `tests/builder-project-upload.test.mjs` | Isolated backend upload/readback/authorization and attachment fixtures. |
| `package.json` | Adds the new backend fixture to the existing `test:role-workflows` chain. |
| `mobile-app/docs/BUILDER_PROJECT_IMAGE_UPLOADS.md` | This contract and verification record. |
| `mobile-app/docs/HOMEZONE_COMPLETE_INTEGRATION_STATUS.md` | Current implementation/check status. |
| `mobile-app/docs/HOMEZONE_REMAINING_BLOCKERS.md` | Activation and live-verification requirements. |

`mobile-app/lib/features/marketplace/marketplace_screen.dart` also has a
pre-existing app-bar change in the working tree. It is preserved and included in
this APK, but is not attributed to Builder image integration.

## Activation requirements

Existing Prisma `BuilderProject` fields and existing storage are reused. No new
schema, migration or environment variable is introduced. Effective storage
readiness still depends on the already configured provider and its existing
limits, credentials/mount, canonical origin and authorization.

**A separately approved staging backend deployment and installation of this new
staging APK are required before live use.** The APK is built but not installed or
launched in this slice. A new APK against the old backend fails closed at
capability preflight. Do not infer deployment from local source or build output.
Inspect the full pending migration set before any approved Railway deployment,
because its existing predeploy command can run migrations; this slice adds none.

## Local checks and remaining verification

- `npm run typecheck`: **PASS**, exit 0.
- Four isolated backend fixture suites: **87 checks PASS**: Builder project
  upload 22, role/Builder integrity 30, Owner publication 24 and mobile API 11.
  These are mocked checks, without a database, provider or live network.
- Final six-file focused Flutter run: **138/138 tests PASS**, exit 0. Includes
  Builder save, picker and actual-form integration, plus Owner photo, state and
  dashboard regressions. This supersedes the initial 134-test run.
- Seven-file Flutter analysis: exit 0, **zero errors/warnings**. It reported 32
  informational style findings: 31 pre-existing in `workspace_screen.dart` and
  one new helper brace style, which was corrected. Focused
  `dart analyze lib/features/workspace/builder_project_image_save.dart` then
  passed with **No issues found**. The existing informational findings remain;
  this is not a claim that the entire application is lint-clean.
- Universal staging debug APK: **PASS**, exit 0. From `mobile-app/`:

  ```powershell
  node scripts/build-android.mjs --mode service --config config/staging.local.json
  ```

  Artifact: `mobile-app/build/app/outputs/apk/debug/app-debug.apk`,
  **200,206,023 bytes** (190.93 MiB), SHA256
  `82ef9a0197a6c7da97abdcd992f383c7474217640c4b006b79fef5bb874c3cd3`.
  Build evidence:
  `mobile-app/build/android-source-builds/2026-11-06T10-31-22-248Z-30280`.
  The record confirms fresh output and the explicit staging origin
  `https://homezone-staging.up.railway.app`. ZIP inspection confirms native
  `libflutter.so` for ARMv7, ARM64 and x86_64 plus the new floor-plan, master-plan
  and brochure picker labels in the Flutter kernel. This is artifact evidence,
  not Android presentation or live backend verification.
- No actual Builder device-to-staging upload/publication result is established.

Later controlled verification requires an authorized Builder fixture/project,
approved public-safe images and approval for project/upload/status writes. Check
all four image sections, create and edit readback, preservation of legacy
references, failure/refresh handling, ownership denial, session changes and actual
Android presentation. Passing local mocks/typecheck does not establish provider
health, deployed route availability or live database attachment.

## Retained form hot-reload correction - COMPILED / ANDROID PRESENTATION VERIFIED - 2026-11-06

Baseline: `main/879973c1d0ba0bb73171818fe64b030b3118df45`, containing the Builder
feature above. An actual Android red error screen reported
`LateInitializationError: Field '_builderImageSave' has not been initialized`.
The process remained alive and the VM paused at the helper getter. The helper
had been assigned only in `initState`, which does not run again when existing
form State is retained by hot reload. This is a form initialization failure,
not evidence of a backend or database connection failure.

`mobile-app/lib/features/workspace/workspace_screen.dart` now initializes the
`late final` helper lazily on first access, retaining that same instance and its
single-save/uncertain-write guard for the form. The helper is not recreated for
each build. Regression additions in
`mobile-app/test/builder_project_form_test.dart` exercise retained State through
reassemble, entered values/images and the existing save/uncertainty safeguards.
The focused two-file run passes **9/9 tests**, exit 0; evidence is
`build/chat-verification/builder-lifecycle-passed-flutter-20261106.log`.
Widget reassemble cannot exactly reproduce adding a new field to an older
already-running VM class, so this is not a claim of that exact live scenario.

Hot reload completed with code 0 but **did not recover the already-broken old
debug State**; returning to the form still showed the original error. The old
instance's initialization was not rerun. One full Dart restart was required for
that running debug session, using the explicit staging configuration. It
completed with code 0, the VM resumed and the same Android process (PID 10027)
remained alive. The stored Builder login restored; this initial recovery used
no app-data clearing or APK installation. The fix does not claim automatic
migration of old retained VM instances. The corrected APK was subsequently
installed as recorded below, so the device no longer depends on a debugger
restart to retain the corrected source.

Actual Android screenshots were reviewed after the corrected restart:

- `build/chat-verification/app-after-corrected-restart-20261106.png`: Builder
  Home renders, using the existing account and backend's zero-project result.
- `builder-form-visible-20261106.png`: Create project renders the existing
  Name, City, Description, address and status fields without the red screen.
- `builder-image-sections-after-fix-20261106.png`: Project photos picker and
  upload guidance render.
- `builder-plan-pickers-after-fix-20261106.png`: Floor plan, master plan,
  brochure image controls and Save render without a crash.

Only opening/scrolling the form was exercised. **No image was picked, Save was
not pressed, and no upload or project creation was performed.** This verifies
Android form presentation, not live Builder upload/publication integration.

Two-file source analysis exits 0 with **zero errors/warnings** and 31 pre-existing
Workspace informational style findings; evidence:
`build/chat-verification/builder-lifecycle-analyze-20261106.log`.
The corrected universal staging debug APK build also passes. Current artifact:
`mobile-app/build/app/outputs/apk/debug/app-debug.apk`, **200,206,113 bytes**,
SHA256 `3994d1139d79effec64125ceb6eadec3bf72e8839de23b4628bb1718c559fae5`.
Build evidence:
`mobile-app/build/android-source-builds/2026-11-06T11-13-47-273Z-28732`.
Actual ZIP inspection confirms ARMv7, ARM64 and x86_64 `libflutter.so` entries.
This artifact supersedes the earlier `82ef9a...` APK at the same path; its earlier
build record and the 138 Flutter / 87 backend checks remain feature-baseline
evidence.

The corrected APK was subsequently installed on `emulator-5554` with `adb install
-r`, which succeeded and preserved app data. Reading the installed APK on the
device confirmed its SHA256 exactly matches the corrected artifact above.
The initial `am start -W` wait reported a timeout, so it was not treated as
successful presentation evidence. A later actual Android screenshot,
`build/chat-verification/corrected-installed-apk-startup-20261106.png`, confirms
Builder Home in the foreground with the restored existing login and a new app
process (PID 12562). This establishes installed-artifact startup; Create project
presentation on the installed APK is still pending at this checkpoint. The
earlier four form screenshots were from the explicit staging Dart restart.

A subsequent cold-installed app interaction exposed a **separate Android ANR**
at 16:56:02. Android last-ANR/DropBox traces show the native UI thread blocked in
`IClipboard.hasPrimaryClip` / `ClipboardManager.hasPrimaryClip`, called by
Flutter `PlatformPlugin.clipboardHasStrings`; the VM was resumed while the Home
display/frames stopped advancing. This is evidence of that clipboard Binder
wait, not a confirmed graphics cause or a recurrence of the Dart late-field
failure. The deeper reason for the clipboard service wait is not established.
Only the Android guest is being rebooted, without wiping data or changing Windows
or renderer settings; cold-relaunch/form interaction remains pending retest.
The original initialization correction and its nine passing tests are unchanged.

No account/project submission, backend/configuration change or deployment was
performed. Live upload/readback/status verification still needs the previously
documented backend activation and controlled-write approval.
