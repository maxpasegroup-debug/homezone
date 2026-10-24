# HOMEZONE — Comprehensive Validation and Stabilization

## Verdict

BLOCKED for progression requiring a completed production build or live-service
verification. Local Flutter checks, backend checks, Prisma schema validation and
Android debug compilation passed after fixes. The real Next.js production build
failed on uncached Google fonts with network access explicitly blocked. This is
not a production-ready, release-ready or Play Console-ready result.

## Preservation and actual baseline

Initial branch: main. Commit: 9cba8d77afabedd5fbf32af638a3ee45615487e5.
Initial complete status contained 25 modified and 21 untracked files, nothing staged.
Final branch/commit are unchanged. Final status: 28 modified and 25 untracked files,
nothing staged. It contains the original paths plus
the stabilization changes listed below; no original modified/untracked path was
removed. The complete final status is retained under ignored
`build/qa-stabilization/git-final.txt`.

Initial modified paths (all relative to repository root):

```text
mobile-app/.gitignore
mobile-app/README.md
mobile-app/android/app/build.gradle.kts
mobile-app/android/app/src/debug/AndroidManifest.xml
mobile-app/android/app/src/main/AndroidManifest.xml
mobile-app/android/app/src/main/kotlin/com/example/homezone_mobile/MainActivity.kt
mobile-app/docs/API_FOUNDATION.md
mobile-app/ios/Runner/Info.plist
mobile-app/lib/app/homezone_app.dart
mobile-app/lib/core/api/api_configuration.dart
mobile-app/lib/core/api/password_auth_protocol.dart
mobile-app/lib/features/auth/auth_form_screen.dart
mobile-app/lib/features/auth/auth_screens.dart
mobile-app/lib/features/auth/sign_in_controller.dart
mobile-app/lib/features/buyer/buyer_shell.dart
mobile-app/lib/features/buyer/data/demo_properties.dart
mobile-app/lib/features/buyer/screens/buyer_home_screen.dart
mobile-app/lib/features/buyer/screens/buyer_profile_screen.dart
mobile-app/lib/features/buyer/screens/buyer_property_detail_screen.dart
mobile-app/lib/features/buyer/screens/buyer_saved_screen.dart
mobile-app/lib/features/buyer/screens/buyer_search_screen.dart
mobile-app/lib/features/buyer/widgets/buyer_components.dart
mobile-app/lib/main.dart
mobile-app/test/buyer_journey_test.dart
mobile-app/test/buyer_widget_test.dart
```

Initial untracked paths:

```text
mobile-app/docs/IMPLEMENTATION_HANDOFF.md
mobile-app/lib/features/buyer/data/buyer_collections.dart
mobile-app/lib/features/buyer/data/buyer_filters.dart
mobile-app/lib/features/buyer/screens/buyer_compare_screen.dart
mobile-app/lib/features/buyer/screens/buyer_enquiries_screen.dart
mobile-app/lib/features/buyer/screens/buyer_filter_sheet.dart
mobile-app/lib/features/buyer/screens/buyer_gallery_screen.dart
mobile-app/lib/features/buyer/screens/buyer_shortlists_screen.dart
mobile-app/lib/features/marketplace/account_access_screen.dart
mobile-app/lib/features/marketplace/listing_location.dart
mobile-app/lib/features/marketplace/marketplace_repository.dart
mobile-app/lib/features/marketplace/marketplace_screen.dart
mobile-app/test/buyer_collections_test.dart
mobile-app/test/buyer_filters_test.dart
mobile-app/test/buyer_home_discovery_test.dart
mobile-app/test/buyer_profile_enquiries_test.dart
mobile-app/test/property_gallery_test.dart
src/app/api/mobile/account/route.ts
src/app/api/mobile/properties/[id]/route.ts
src/app/api/mobile/properties/route.ts
src/lib/properties/mobile-catalog.ts
```

No reset, clean, stash, revert, staging, commit or push was performed. Existing
qa-5ax, qa-5ay, qa-5az, qa-5ba, qa-5bg, qa-5bk and qa-5bn directories were retained.
New logs/screenshots and diagnostic scripts are under ignored qa-stabilization.

## Architecture and tooling actually inspected

One Next.js application serves the backend; backend/ is not another package.
src/app/api wrappers normally expose backend/api implementations; the new mobile
routes live directly in src/app/api/mobile. Prisma uses DATABASE_URL. Railway
still runs Prisma migrate deploy before application startup; it was not executed.

Installed versions: Flutter 3.44.0, Dart 3.12.0, Node 24.11.1, npm 11.6.2,
Next 15.5.19, Auth.js next-auth 5.0.0-beta.31, TypeScript 5.9.3, Prisma 6.19.3,
JDK 17.0.12, Gradle 9.1.0, Android Gradle plugin 9.0.1. The settings file declares
Kotlin 2.3.20; Gradle also emits warnings about embedded/requested Kotlin tooling
and deprecated Android DSL options. No dependency versions or lockfiles changed.

The cached schema-engine revision c2990dca591cba766e3b7ef5d9e8a84796e47ab7
matches the installed Prisma engine requirement. Generated-client schema and
repository schema are identical after whitespace normalization. Type-checking
also validates the new Prisma query fields against the generated client.

## Defects fixed and files changed in this pass

- android/app/src/debug/AndroidManifest.xml: add the explicit tools:replace directive
  needed for debug-only development HTTP. The initial APK build failed its manifest
  merge. Release/profile cleartext remains disabled in the main manifest.
- lib/features/marketplace/listing_media.dart (new) and marketplace_screen.dart:
  replace Image.network's unrestricted redirect handling with a credential-free
  loader that validates HTTPS/host/port, refuses redirects, bounds bytes to 8 MiB,
  sets a deadline and closes its client. Errors render a fallback.
- marketplace_repository.dart: recheck authentication inside an admitted queued
  request, before dispatch. Validate/whitelist listing fields, reject invalid
  numbers/coordinates/media arrays and drop unrelated response fields. Mark 5xx
  mutation results as uncertain rather than suggesting a guaranteed failure.
- marketplace_screen.dart: guard save bootstrap admission and disposal; constrain
  sort dropdown width. Tests reproduced a 315-pixel horizontal overflow at
  320x640 and 200% text in both themes; both now pass.
- src/lib/properties/mobile-catalog.ts: reject reversed price ranges.
- src/app/api/mobile/properties/route.ts: reject duplicate query parameters rather
  than silently taking the last value.
- src/app/api/mobile/account/route.ts: bound nested shortlist items to 50, ordered
  by creation time, and expose this snapshot limit explicitly.
- middleware.ts: reject browser mutation requests carrying a foreign/malformed
  Origin or cross-site Fetch Metadata. Native requests without browser headers
  retain explicit-cookie authentication. Auth.js routes retain their own CSRF path.
- test/marketplace_test.dart (new): 18 mocked regressions covering the new repository,
  acknowledgment/unauthorized/stale/expiry paths, resume and logout, media policy
  and redirects, save/tab/profile behavior, disposal, filter drafts and responsive UI.
- tests/mobile-api.test.mjs (new): actual route/schema code with mocked auth, DB and
  logging boundaries; query/projection/ownership/role rejection/failure coverage.
- tests/auth-middleware.test.mjs: HTTP/HTTPS browser-origin mutation regressions.
- package.json: include mobile route regressions in npm test.
- lib/app/homezone_app.dart, lib/core/api/password_auth_protocol.dart,
  lib/features/auth/auth_form_screen.dart, auth_screens.dart, sign_in_controller.dart,
  lib/main.dart, marketplace/account_access_screen.dart and listing_location.dart:
  formatting and explicit analyzer-recommended braces. No assertions were removed.
- IMPLEMENTATION_HANDOFF.md and this report: distinguish historical implementation
  claims from actual validation.

## Validation command ledger

Commands below ran from mobile-app unless specified. CI/analytics suppression was
used for Flutter; Android commands used JDK 17 and offline Gradle. No installs or
dependency upgrades were performed. Read-only Get-Content/rg/Git inspections and
tool polls are recorded in the conversation tool transcript; this ledger records
the validation and diagnostic commands and their outcomes, including failures.

| Command | Actual result |
| --- | --- |
| flutter --no-version-check --version | 0; versions above |
| dart format --output=none --set-exit-if-changed lib test, initial | 1; 10 files needed formatting; non-mutating |
| flutter --no-version-check analyze --no-pub, initial | 1; 4 brace findings |
| flutter --no-version-check test --no-pub, baseline | 0; 261 passed |
| npm run typecheck; npm run lint (root), initial and final | Both completed without errors; shell exit 0; typecheck also rerun successfully by npm test |
| npm test (root), baseline | 0; 67 Node test-runner tests plus 6 smoke assertions |
| dart format on the 11 identified implementation/stabilization files | 0; only those files formatted |
| flutter analyze after formatting | 1; 42 brace findings exposed by expanded formatting |
| dart fix --apply --code=curly_braces_in_flow_control_structures lib | 0; 42 brace fixes in 7 implementation files |
| dart fix --apply --code=curly_braces_in_flow_control_structures lib/features/marketplace | 0; one remaining new brace fix |
| dart fix --apply --code=curly_braces_in_flow_control_structures test/marketplace_test.dart | 0; two new test brace fixes |
| node --test --test-isolation=none tests/mobile-api.test.mjs (root) | 0; 10 reported tests including parent group |
| flutter test test/marketplace_test.dart, early runs with --no-pub | 12-test first version passed; two later async-fixture runs interrupted, exit 1; subsequent isolated run failed guarded-expect conflict, exit 1 |
| flutter test --no-pub --timeout 30s test/marketplace_test.dart | 1; 15 passed/1 failed due to tap before scroll settled; fixture corrected |
| isolated service save/tab regression rerun | 0; 1 passed after awaiting scroll and fake-clock setup |
| focused 11-file set, first enlarged-text run | 1; 128 passed/2 failed, confirmed sort overflow |
| flutter --no-version-check test --no-pub test/marketplace_test.dart --plain-name 'service discovery supports narrow large text' | 0; 2 passed after layout fix |
| dart format --output=none --set-exit-if-changed lib test, final | 0; 69 files, 0 changes |
| flutter --no-version-check analyze --no-pub, final | 0; no issues |
| focused 11-file set, final | 0; 130 passed |
| flutter --no-version-check test --no-pub, final | 0; 279 passed |
| npm test (root), final | 0; 79 reported Node tests plus 6 smoke assertions |
| npm run lint (root), final | 0 |
| prisma validate --schema prisma/schema.prisma, initial | 1; checksum-fetch attempt failed through blocked loopback proxy; no DB operation |
| cached schema-engine-windows.exe --version | 0; matching revision above |
| prisma validate --schema prisma/schema.prisma, with cached engine and inert local DATABASE_URL | 0; schema valid; no DB connection |
| node mobile-app/build/qa-stabilization/offline-build.cjs (root), initial | 1; child spawn blocked by sandbox |
| same production-build wrapper, rerun with local process permission | 1; actual npm run build failed to fetch Geist/Geist Mono because networking was disabled |
| gradlew.bat --offline --console=plain -Ptarget=lib/main.dart -Ptarget-platform=android-x64 assembleDebug, initial (android/) | 1; confirmed manifest merge conflict |
| same Gradle build with --max-workers=1 after fix | 0; build successful |
| same Gradle build with --max-workers=1, final | 0; build successful, 52 seconds |
| emulator.exe -list-avds | 0; Pixel_6 available |
| adb devices -l | 0; initially empty, then emulator-5554 available after launch |
| Start-Process emulator.exe -avd Pixel_6 -no-snapshot-save -no-boot-anim | 0; existing local emulator started |
| adb install -r build/app/outputs/apk/debug/app-debug.apk | 0; Success |
| final-APK reinstall during emulator boot | 1; emulator temporarily offline; not counted as a successful installation |
| final-APK reinstall and launch after boot, bounded retry | 0; install Success and MainActivity launched |
| adb shell am start -n com.example.homezone_mobile/.MainActivity | 0; app launched |
| adb shell input keyevent 224; adb shell wm dismiss-keyguard | 0; woke/unlocked emulator for actual inspection |
| adb shell input tap/keyevent; screencap and pull commands | 0; screenshots retained under qa-stabilization; only inspected screens are claimed below |
| adb -s emulator-5554 emu kill | 0; closed only emulator started in this pass for memory management |
| Get-CimInstance diagnostics, initial | 1; access denied |
| Get-CimInstance diagnostics with permission | 0; memory pressure confirmed; no command lines or env values printed |
| scan-secrets.cjs, initial | 1; sandbox denied child git spawn |
| scan-secrets.cjs, permitted rerun | 0; 581 tracked files, no candidates for its limited patterns |
| node --version; npm --version; JDK java -version | 0; versions above |
| Get-FileHash and whitespace-normalized schema comparison | 0; different byte hashes, same schema ignoring whitespace |
| git diff --check | 0; line-ending warnings only |
| Git branch/commit/status/staged-name inspections | 0; branch/commit retained, no staging |

The first rg invocation used Windows literal glob arguments and printed glob errors;
it was repeated using rg -g filters. No missing source was inferred from that failure.
Some shell cells contained multiple commands; the tool returns the final shell
status. Separate command output and later reruns establish the individual results
above. No failed analyzer/test run is presented as a pass.

Exact final focused command:

```text
flutter --no-version-check test --no-pub test/marketplace_test.dart test/api_client_test.dart test/auth_transport_test.dart test/password_auth_protocol_test.dart test/protocol_ownership_test.dart test/ownership_clearing_test.dart test/session_ownership_test.dart test/sign_in_integration_test.dart test/buyer_filters_test.dart test/buyer_collections_test.dart test/buyer_profile_enquiries_test.dart
```

Production build containment: offline-build.cjs runs the actual npm build script
with inert configuration and offline-network.cjs preloaded. The preload blocks
socket/fetch network access; no fonts are fabricated and no build assertions are
disabled. Log: build/qa-stabilization/backend-production-build.log. The result is
a failed production build, not a mocked success.

## Android observations versus mocked evidence

The local x86_64 Pixel_6 emulator installed and launched the debug APK. Inspected
screenshots verify onboarding, sign-in, explicit offline entry, Home, Garden
Courtyard Villa details, a saved favorite in Saved, Search/filter sheet, Profile
and the empty Enquiries screen with its no-submission disclosure. All observations
were offline, standard light-theme viewport. An initial black screenshot was a
sleeping display; wake/unlock showed the app. No startup-performance claim is made.

Service account, saves, shortlists, enquiry acknowledgment, expiry and logout
behavior were exercised through injected transport/handler tests, not a real
Android backend connection. No real emails, password resets, enquiries or map
handoffs were sent. Native dark/enlarged-text service mode, physical devices,
release/profile operation, and real HTTPS/proxy behavior remain unverified.

## Security and contract findings still requiring action

- New catalog and detail handlers use explicit public projections, PUBLISHED
  visibility and no demo fallback. Invalid/duplicate filters and reversed budgets
  fail. Account queries are profile-scoped; strict edits cannot set roles or IDs.
- Authentication still requires CSRF and independently parsed client-bound session
  responses. Revocation/reset/expiry tests run against mocked registry storage,
  not a database. Logout transport failure clears local state and reports uncertainty.
- HTTPS origins and image allowlists are enforced locally; real ingress/cookie
  behavior and host configuration still need authorized staging verification.
- Password limiter remains process-local, with known account-targeted denial,
  aggregate exhaustion and multi-instance/restart limitations. No distributed
  protection or trusted ingress was invented.
- Existing backend logging can retain original exception text/stacks outside the
  new fixed-category mobile handlers. A broader production redaction review is
  still required. Limited pattern scanning is not a claim that all secrets are absent.
- Account deletion/retention, public privacy/deletion/support URLs and legal consent
  remain unresolved. Mobile service registration is disabled. Secure persistent
  session restoration is not implemented; app restart requires sign-in.
- Snapshot limits are real: 200 saves, 100 shortlists/enquiries, 50 items per
  shortlist. Offset catalog pagination can shift during inventory changes. Full
  account pagination and enquiry idempotency remain limitations, not hidden guarantees.
- Release build was not attempted: approved package identity/signing configuration
  are absent. No real keys were generated. Debug namespace remains the placeholder.
- Profile builds were not repeated. The checked Gradle cache lacks
  io.flutter:flutter_embedding_profile and io.flutter:x86_64_profile at
  1.0.0-4c525dac5ebe5971c5708ef73558ed8edcf4a362. No artifacts were downloaded.
- Next production build requires approved provisioning of exact font assets or an
  approved typography change. No speculative website redesign was made to bypass it.

Next action: provision the approved offline build prerequisites and resolve the
release/privacy/account-lifecycle decisions, then rerun blocked builds. Obtain
explicit isolated-staging authorization before any service, database, proxy or
delivery verification. No deployment, database migration, remote environment
change or Play submission occurred.
