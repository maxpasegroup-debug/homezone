# Local build configuration

No real origin or secrets are supplied in this repository. Runtime service mode
requires an explicitly approved origin and backend. Creating a config file is
not authorization to connect to that environment.

From mobile-app (replace the placeholders with owner-approved public values):

    node scripts/prepare-service-config.mjs --environment staging --origin <APPROVED_HTTPS_ORIGIN> --image-hosts <EXACT_CDN_HOSTNAMES_COMMA_SEPARATED> --media-hosts <APPROVED_PUBLIC_VIDEO_AND_TOUR_HOSTS>

The script writes ignored config/staging.local.json without overwriting existing
files. It accepts only nonsecret build settings, performs no DNS/network request,
and rejects credentials, URL paths, query parameters and insecure public HTTP.
An empty image-host list causes remote images to use fallbacks.
The optional media-host list controls explicit public video/tour browser handoff;
it defaults to empty (disabled), independently of image hosts. Use exact lowercase
hosts, no wildcards, paths or credentials, at most 32 media hosts. The complete
nonsecret JSON must fit 4 KiB. Existing four-setting configuration files remain
accepted; the validator normalizes a missing HOMEZONE_MEDIA_HOSTS to empty.
Browser handoff opens only after confirmation and transfers no app credentials.
Native browser launch is not evidence that a provider loaded or played media.
Provider privacy, URL ownership and genuinely public content need owner approval.

For a cached Android debug build containing current source (no installation or
runtime checks), use the explicit mode wrapper from mobile-app:

    node scripts/build-android.mjs --mode preview
    node scripts/build-android.mjs --mode service --config config/staging.local.json

On this workstation set JAVA_HOME to the existing JDK 17 installation first.
The wrapper runs Gradle assembleDebug with --offline for armv7, arm64 and x86_64.
It validates four required public settings plus optional HOMEZONE_MEDIA_HOSTS,
rejects unknown keys, and
rejects loopback/emulator aliases and HTTP for Android service artifacts. The
existing Android manifest disables cleartext; this wrapper does not weaken it.
Explicit development-loopback configurations produced by the preparation script
are for separately supported local workflows, not Android phone service builds.
No DNS or live connectivity is checked during preparation or packaging.

Before packaging, the wrapper preserves the previous APK under a unique
build/android-source-builds/<timestamp>-<pid>/ directory. A successful build
records the variant, API environment/origin, size and SHA-256 there. A failed
build must not be reported as success merely because an older APK remains.
The APK path is build/app/outputs/apk/debug/app-debug.apk. A service-configured
APK is not evidence that its backend is reachable or approved for testing.

Do not run or install the service artifact until environment access is authorized.
Production release builds additionally need the existing approved package/signing
configuration. Do not put signing keys, API provider secrets, OTP keys, database
URLs, or document-encryption keys in Dart defines. A phone must use a reachable,
approved HTTPS origin; its localhost is the phone itself.

The default build remains offline preview. Changing a local JSON file does
not change an already-built APK. Missing/invalid service configuration displays an
error rather than silently switching service data to fictional listings.

## Owner input still required

No approved service API origin was supplied or used in the current continuation.
The repository's existing backend origin constants are not authorization to use
that service. Owner must supply the exact reachable HTTPS origin and confirm it
matches the backend's trusted canonical Auth.js configuration and isolated target.
The build scripts prepare public configuration only; they do not provision or
verify that backend. The environment and exact public-image hosts are also
owner inputs. Server database/auth/OTP/email/limiter/provider settings and private
encryption/scanner credentials belong only in approved server secret storage.
See ACCOUNT_COLLECTIONS_AND_PRIVATE_SCANNING.md for the scanner URL/key contract
and large-file storage decisions; no scanner/storage value is guessed here.
