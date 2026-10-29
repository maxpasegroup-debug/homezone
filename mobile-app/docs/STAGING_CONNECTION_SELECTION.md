# Explicit staging selection

The app does not read config/staging.local.json at runtime. Its five nonsecret
settings must be supplied as compile-time Dart defines. A normal unconfigured
Flutter launch leaves HOMEZONE_ENABLE_API false and opens offline preview.
Editing the JSON does not change an APK or a running application.

Open the repository root (the directory containing package.json and mobile-app)
in VS Code. After runtime authorization, select **HOMEZONE mobile — staging**.
The repository launch profile uses mobile-app as its working directory and passes
`--dart-define-from-file=config/staging.local.json` to Flutter. The separate
offline-preview profile explicitly disables API mode. No host is duplicated in
the profiles; a missing configuration file must not trigger a production fallback.
Do not start either profile as part of a source-only review.

For a later authorized APK build, use the existing wrapper from mobile-app:

```cmd
node scripts/build-android.mjs --mode service --config config/staging.local.json
```

The wrapper validates origin-only HTTPS configuration, passes encoded Dart defines
to Gradle, archives the previous APK, and records the new artifact hash and origin.
Compare the APK hash with its matching build record before installation. Other
Flutter/IDE builds can overwrite app-debug.apk without updating that record.

The selected configuration currently names the staging origin
https://homezone-staging.up.railway.app. Catalogue requests append
/api/mobile/properties with page and pageSize parameters; detail requests append
/api/mobile/properties/[id]. Do not append /api to the configured base origin.

IoApiTransport requires the configured origin, uses standard certificate validation
and does not follow redirects automatically. Android has INTERNET permission and
disallows cleartext traffic. No emulator localhost substitution or certificate
bypass is needed for this public HTTPS service.

Catalogue HTTP/network/response failures are distinct from a successful empty
properties array: failures use error/retry UI, while an empty successful response
shows the published-listing empty state. API mode does not populate demo listings.
Image and media allowlists remain unchanged and empty.

Artifact inspection during this source task found the current APK hash
5ef2ed4d601120ba514999f04b5c7c12bde6f755265451c0f460d20bd56ce4b7,
which differs from the previous staging build record. Its kernel bundle did not
contain the staging origin literal. Neither the JSON nor the old build record
establishes this artifact's effective configuration. No build or device verification
was performed, and the installed artifact and observed failure remain unknown.

Runtime approval must cover the exact selected artifact/profile and dedicated test
device. Account/OTP actions additionally require approved staging credentials and
recipient authorization; never put them in launch arguments, logs or this document.
