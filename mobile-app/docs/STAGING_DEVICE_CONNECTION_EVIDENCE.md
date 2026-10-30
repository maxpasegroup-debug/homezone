# Staging device catalogue evidence — 2026-10-29

Scope: public catalogue only. Authentication, OTP, account mutations, production,
Railway configuration and database administration were excluded.

## Confirmed client blocker and correction

Discovery displayed `This session changed. Sign in again.` and the attached
Flutter isolate's HTTP profile contained no catalogue request. Public reads went
through the cookie coordinator, whose locally-invalidated boundary rejects work
after logout or failed credential restoration. This prevented anonymous discovery.
The precise earlier restoration/storage event that invalidated this session was
not captured and remains unknown.

MarketplaceRepository now sends only unprotected GET catalogue/detail paths
through ApiClient without cookie options or cookie-response commits. Protected
APIs and OTP contracts still use the existing coordinator. Origin restrictions,
certificate checks, timeouts, JSON validation and response-generation checks stay
in force. No auth state is minted or reset to permit public browsing.

## Actual Flutter request/response evidence

Source was hot-reloaded into the staging-configured process on emulator-5554.
The existing public discovery route was opened using an Android tap. Because
native presentation/capture remained unreliable, its existing `load()` method was
then invoked through the attached Dart debugger. This executes the real screen,
repository, ApiClient and dart:io transport; it is not a host-side HTTP request.

The running Flutter isolate's HTTP profile recorded:

- Origin: https://homezone-staging.up.railway.app
- GET /api/mobile/properties?page=1&pageSize=12
- Start: 2026-10-29T11:47:32.246Z
- Elapsed: approximately 805 ms
- HTTP status: 200
- Server header: railway-hikari
- Railway request ID: s5oMDMi9QV6PipMw5nX1uw
- Sanitized JSON summary: source=database, properties=[], page=1, hasMore=false

Flutter inspector render capture showed the corresponding empty-published-listing
message without the earlier session error. HTTP profiling was disabled afterwards.
No cookies, credentials, OTPs, raw headers, user records or full network traces were
saved in this report. Railway service logs were not accessed: server-log matching
of this timestamp/request ID remains an infrastructure-owner action.

## Black-screen investigation remains separate

The attached isolate was runnable, not paused, and had an OnboardingScreen widget
tree. Flutter's own screenshot rendered onboarding and the public-discovery link.
Android screencap remained black. A software-rendering comparison initially failed
because Impeller was enabled; retrying with both --enable-software-rendering and
--no-enable-impeller allowed Flutter inspection, but Android capture stayed black.
No permanent renderer/manifest change was made. No Dart startup defect was proven
to cause that black native capture. Native surface/compositor/capture diagnosis
remains open; a Flutter render capture is not proof of a usable emulator display.

Commands used for diagnostic runs (from mobile-app):

```cmd
flutter run --no-pub -d emulator-5554 --dart-define-from-file=config/staging.local.json --enable-software-rendering
flutter run --no-pub -d emulator-5554 --dart-define-from-file=config/staging.local.json --enable-software-rendering --no-enable-impeller
```

The first command's renderer failure is a diagnostic-command incompatibility,
not the explanation for the original issue. The second compiled and installed;
the catalogue correction was subsequently hot-reloaded successfully. Runtime
rendering flags are not a permanent fix or a production release recommendation.

The existing packaging command was also invoked after correction:

```cmd
node scripts/build-android.mjs --mode service --config config/staging.local.json
```

Packaging completed with exit code 0. The fresh universal debug APK is
`mobile-app/build/app/outputs/apk/debug/app-debug.apk`, 184939163 bytes, SHA-256
`a258033aae723cb8611b49b5014f378007bf13495bd2ccccdf632deff6cfd46f`.
Its build record selects service/staging and the approved staging origin.
This final universal APK was not subsequently installed; device evidence above is
from the emulator-targeted debug launch with the correction hot-reloaded.
Packaging alone does not establish installation/runtime behavior of that APK.

## Status

- SOURCE FIXED: anonymous catalogue/detail no longer depend on cookie admission.
- DEVICE VERIFIED: real Flutter isolate sent the catalogue request and consumed
  its empty response; the internal render capture displayed the expected state.
- BACKEND CONNECTION VERIFIED: only the public catalogue request/response above.
- BLOCKED/UNVERIFIED: normal Android display usability, independent Railway log
  correlation, account login, OTP, restoration, logout and role persistence.
- Property-detail runtime verification needs an authorized published staging record;
  none was returned, and no record was created or published.
- No automated tests or security certification were performed in this pass.
