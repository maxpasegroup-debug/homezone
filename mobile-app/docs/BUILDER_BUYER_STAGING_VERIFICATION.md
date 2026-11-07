# Builder-to-Buyer staging verification

Date: 2026-11-07 (Asia/Calcutta). Local source baseline:
`main / 6644759f0b9580c32433d0fb9cca1b51a04adcb8`.

The founder authorized the two supplied accounts and controlled, clearly labelled
staging project verification, one creation per reviewed run. Credentials were provided only to child-process environment variables,
cleared after execution, and were not stored in source, reports or evidence.

## Latest full-flow verification - Builder form, automatic Buyer update and details VERIFIED

On the founder's subsequent full-verification request, the actual Builder and
Buyer Flutter widgets ran concurrently against staging. This extends the earlier
repository-only creation check: the actual Builder dashboard Create action and
WorkspaceForm Save button performed the new publication.

New project: `STAGING TEST Builder Buyer 20261107 Check03`, ID
`cmw61t4ur0005pj0xw6af2c7v`. It is explicitly a staging test, not a real offer.
The earlier Check02 project was preserved. Exactly one additional project POST
was sent; no images, unit records, prices or account changes were created.

| Check | Result | Evidence |
| --- | --- | --- |
| Builder and Buyer login/profile | VERIFIED | Actual Auth.js protocol independently confirmed BUILDER and USER; credentials were not logged. |
| Builder Create Project navigation | VERIFIED - HEADLESS FLUTTER | Tapped the actual dashboard Create action and opened WorkspaceForm with the existing POST contract. |
| Required form values and Published status | VERIFIED - HEADLESS FLUTTER | Entered Name, City and Description, selected PUBLISHED and tapped actual Save. |
| Backend publication | VERIFIED | One POST to `/api/builder/projects`, 200; returned the expected name, ID and PUBLISHED status. Form closed on confirmed success. |
| Buyer open before publication | VERIFIED - HEADLESS FLUTTER | Home loaded before the new project existed. Same Buyer State remained mounted throughout publication. |
| Actual WebSocket notification | VERIFIED | Anonymous staging socket first sent ready, then a real `properties.changed` after publication. Ready alone was not counted. |
| Automatic Buyer dashboard update | VERIFIED - HEADLESS FLUTTER | A new project GET followed the change frame; the new card appeared without manual refresh, navigation or remount. |
| Buyer card to matching details | VERIFIED - HEADLESS FLUTTER | Tapped the new card; correct-ID detail GET returned 200 and actual detail widgets rendered the project. |
| Final detail and empty inventory display | VERIFIED - HEADLESS FLUTTER | A separate read-only continuation passed, using the same already-created ID and actual Home/card/detail widgets. No second creation was attempted. |
| Android presentation | PARTIAL / WORKFLOW BLOCKED | Native screenshot showed HomeZone onboarding, with a System UI ANR dialog preventing a usable device test. |
| Photos, plans, nonempty units, edits and unpublication | NOT VERIFIED | Outside the one-project minimal publication test; image-unavailable and zero-inventory states were truthful. |

Publication request started at 06:38:35.018816 UTC / 12:08:35 IST and returned
200. The actual WebSocket change arrived at 06:38:35.741978 UTC; Buyer initiated
its subsequent project read at 06:38:36.134629 UTC (200). The new card was
asserted visible at 06:38:36.865082 UTC, under two seconds after the publication
request started. These are observed timings, not a latency guarantee.

The final read-only Buyer continuation passed (one case, exit 0) at 06:42 UTC /
12:12 IST. It independently read back the authoritative ID, rendered the card,
opened details, confirmed truthful empty inventory and found no framework
exception. It used HomeZone's light theme and existing local SDK fonts. Its
HEADLESS detail image is not an Android screenshot.

### Verification-run limitations retained honestly

The combined V3 case did not exit successfully: after its publication,
WebSocket, automatic-card and detail-render checkpoints passed, the final
scroll/reveal helper failed during an asynchronous detail transition. Its
failed result remains recorded. The subsequent continuation permitted only
business GETs and completed detail inspection; it did not repeat publication
or claim to reverify WebSocket delivery.

Earlier V1/V2 full-form runners stopped before any project POST. Their route
and visibility synchronization assumptions were corrected in ignored harnesses,
not application code. V1 was stopped during stalled cleanup after Buyer signout;
its Builder-session logout could not be confirmed. V2, V3 and the successful
continuation acknowledged their verification-session signouts. No session token
was saved to disk or exposed. No account-wide session revocation was performed.

### Android attempt

The existing Pixel_6 emulator was started with a temporary 1536 MiB RAM argument,
no snapshot load/save, no data wipe and no renderer override. Host free physical
memory before boot was approximately 870 MiB. Android boot completed and the
already-installed HomeZone package launched, but launch wait timed out after
44,885 ms. A native screenshot subsequently showed actual HomeZone onboarding
behind `System UI isn't responding`. Choosing Wait did not establish recovery;
the following capture failed. No credentials were entered on the unresponsive
device. The emulator started by this check was stopped gracefully. Resource
pressure is observed; the ANR's root cause is not proven.

Therefore the former completely black display was not reproduced in the latest
capture, but a usable Android Builder-to-Buyer journey is still NOT VERIFIED.
No new APK build or installation, theme, renderer, staging configuration or
backend change was made by this verification.

### Evidence and changed files

Sanitized ignored evidence under `mobile-app/build/chat-verification/`:

- `builder-buyer-full-ui-live-evidence.json` (V1, zero project POSTs)
- `builder-buyer-full-ui-live-v2-evidence.json` (V2, zero project POSTs)
- `builder-buyer-full-ui-live-v3-evidence.json` (one actual form publication; WebSocket/automatic-card/detail checkpoints)
- `builder-buyer-existing-project-continuation-evidence.json` (final detail case PASS, no business writes)
- `builder-buyer-existing-project-HEADLESS-Detail.png` (legible headless detail capture)
- `builder-buyer-full-android-evidence.json` (sanitized device attempt)
- `builder-buyer-full-startup-followup-20261107.png` (actual Android onboarding/System UI ANR)

Four matching ignored Dart harnesses were created and retained; they contain no
credentials, pin requests to staging, enforce duplicate-marker/evidence guards,
and prevent repeated uncertain publication. The continuation disallows all
business mutations. Existing evidence was preserved.

Only this document, HOMEZONE_COMPLETE_INTEGRATION_STATUS.md and
HOMEZONE_REMAINING_BLOCKERS.md were changed in the tracked documentation set.
Application source was unchanged. No production access, direct database query,
account creation/reset/role change, Railway change, SSH key, schema/migration,
deployment, commit or push occurred. The one authorized project creation and
normal authentication operations used the existing backend write mechanisms.

**Acceptance:** functional staging Builder form -> publication -> actual
WebSocket -> automatically updated Buyer dashboard -> matching project details
is verified through real headless Flutter widgets. Full Android acceptance
requires a responsive emulator or physical Android device. Media and nonempty
inventory require their own controlled verification.

## Earlier verification - PASS for publication and Buyer widgets

The founder supplied corrected Builder credentials and authorized the same
controlled project test. On 2026-11-07 at 06:01 UTC / 11:31 IST, the real Flutter
client successfully authenticated both separate accounts and independently
confirmed BUILDER and USER sessions and profiles. No password reset, role change,
replacement account or SSH access was needed.

Exactly one project POST was sent. The project was created as PUBLISHED:

- Name: `STAGING TEST Builder Buyer 20261107 Check02`
- ID: `cmw60gv3f0001pj0xnj0g45u0`
- City: Kochi. Description explicitly labels it a staging test, not a real offer.
- No images, unit records or prices were invented; reported inventory is zero.

| Latest check | Result | Evidence |
| --- | --- | --- |
| Builder credentials, session and profile | PASS | Existing CSRF/password callback/session/profile flow; server role BUILDER. |
| Buyer credentials, session and profile | PASS | Separate session and profile; server role USER. |
| Single project creation and publication | PASS | One `POST /api/builder/projects`, HTTP 200, returned ID and PUBLISHED status. |
| Builder-owned project readback | PASS | GET owned projects returned the same ID, name and PUBLISHED status. |
| Buyer public catalogue and details | PASS | Real repository GETs returned HTTP 200 and the same project ID/name. |
| Buyer Home card | PASS - HEADLESS FLUTTER | Actual MarketplaceScreen rendered the real staging project in its Builder projects section. |
| Buyer card-to-detail navigation | PASS - HEADLESS FLUTTER | Tapping the actual card fetched the correct detail endpoint (200) and rendered the project and truthful empty-inventory state. |
| Temporary verification-session logout | PASS | Builder and Buyer signout acknowledged; subsequent widget sessions also signed out. |
| Android device presentation | NOT VERIFIED | ADB reports no connected emulator/device in this follow-up. Earlier OS ANR remains unresolved. |
| Live WebSocket delivery, media and nonempty units | NOT VERIFIED | These were not exercised by the single-project test. |

The repository workflow passed its live verification case. At 06:04 UTC /
11:34 IST, the final real-widget verification case also passed with no framework
exceptions. This used production app widgets, repositories, protocol and HTTP
transport against staging; responses were not mocked. It is not Android-display,
native-storage-restoration or complete Builder-form interaction evidence.

An initial widget assertion ran before the asynchronous detail response finished:
the evidence subsequently recorded HTTP 200. The verification harness was
corrected to await that response and verify content inside the detail route.
The failed evidence was retained; only Buyer reads/authentication were repeated.
Project creation was never repeated. No application source correction was
required for this successful retry.

New ignored sanitized evidence under `mobile-app/build/chat-verification/`:

- `builder-buyer-live-corrected-credentials-evidence.json`
- `builder-buyer-corrected-live-widget-evidence.json` (initial assertion race)
- `builder-buyer-corrected-live-widget-v2-evidence.json` (PASS)

Their three matching ignored Dart harnesses contain no credentials and restrict
requests to staging. The successful publication harness refuses evidence replay
and permits only one project POST. The separate widget harness permits no
business mutations. Credentials were supplied transiently and cleared afterward.

The labelled test project remains in staging. No production access, account
creation, credential/role change, direct database query, schema/migration,
Railway setting, deployment, build, install, launch, commit or push was performed
in this follow-up. The authorized project and normal authentication requests
used existing backend database-write/session/quota mechanisms.

The private SSH proposal below is no longer a prerequisite for this account:
corrected credentials resolved the observed authentication denial. No key was
created or registered. Remaining acceptance is actual Android presentation,
Builder form/picker interactions, media, inventory and live-refresh delivery.

## Earlier results - superseded by the successful corrected-credential run

| Check | Result | Evidence |
| --- | --- | --- |
| Staging public project catalogue | PASS | `GET /api/mobile/projects?page=1&pageSize=12` returned 200, `source: database`, zero projects, `hasMore: false`, no redirect. |
| Password provider origin | PASS | Providers returned 200 with password provider; callback origins matched staging. |
| Current deployed Git SHA | UNKNOWN | Live routes establish deployed capability, not exact artifact identity. Older deployment documents are historical. |
| Builder authentication | FAIL | Real Flutter protocol obtained CSRF (200), then callback (200) returned `CredentialsSignin`, code `credentials`, no session cookie. Existing callback parser accepted and classified this as credentials rejection. No session/profile request followed. |
| Buyer authentication | PASS — REAL FLUTTER CLIENT | Callback produced a session cookie, independently fetched session (200), fetched profile (200), and both confirmed USER. |
| Buyer logout | PASS — REAL FLUTTER CLIENT | Existing CSRF/signout protocol returned 200 and acknowledged logout. |
| Test project creation/publication | NOT RUN | Builder authentication failed before the single publication write; `projectPostAttempts: 0`. |
| Buyer visibility of newly created project | BLOCKED | No test project was created. No positive publication-to-Buyer claim is made. |
| Android presentation | BLOCKED | Updated APK installed successfully, but Android showed `Process system isn't responding` before sign-in; launch wait timed out. Selecting Wait did not change the captured display. |

The first controlled workflow aborted at Builder authentication. A separate
diagnostic then made one login attempt per supplied account independently.
Across the two runs there were two Builder attempts and one Buyer attempt; no
password variants, repeated automatic retries, role changes or account resets
were attempted.

The verified Buyer login ran at 05:26 UTC / 10:56 IST. It used the actual
`ApiClient`, `IoApiTransport`, `PasswordAuthProtocol`,
`CookieRequestCoordinator`, `SignInController` and `MarketplaceRepository`
against the exact staging origin with ordinary certificate validation. No
mocked HTTP responses or replacement authentication system were used. This was
a headless Flutter execution, not proof of Android dashboard presentation or
native secure-storage restoration.

## Builder denial: confirmed boundary and remaining uncertainty

The failure is in the deployed password credential admission/authorization
path, not a callback JSON/origin parser rejection. `backend/auth.ts` can return
the same generic denial for failed login admission, missing User/password
credential, a suspended profile, or a password mismatch. Admission may deny for
an account-specific quota or storage/configuration failure. The response alone
cannot distinguish these safely. Successful Buyer authentication establishes
that the shared password/session/profile flow is usable for that account; it
does not prove that the supplied Builder account exists or can authenticate in
staging.

Do not bypass authorization, assign a Builder role to the Buyer, reset a PIN or
password, create a replacement account, or try production to work around this.
The next prerequisite is private confirmation of a working Builder account in
staging. If its credentials are confirmed, inspect the account's status and
admission failures through an appropriately authorized private admin/log review.

## Device and artifact evidence

Installed staging debug APK SHA256:
`1fbf3198a84b6f4803c5f5174a02ab6ebc910130192f4e1f861976b54968604d`.
The existing Pixel_6 emulator cold-booted without a data wipe or renderer change.
APK update used `adb install -r` and returned Success. Android system presentation
then hung. Guest available memory was about 769 MB; Windows available memory
was about 596 MB. Resource pressure is evidence, not a confirmed ANR root cause.
The unresponsive emulator started by this verification was stopped gracefully
to release resources. App/AVD data were not cleared.

Ignored, sanitized evidence under `mobile-app/build/chat-verification/`:

- `builder-buyer-staging-readiness-20261107.json`
- `builder-buyer-live-evidence.json`
- `builder-buyer-auth-diagnostic-evidence.json`
- `builder-buyer-before-login-20261107.png`
- `builder-buyer-after-system-wait-20261107.png`

No application source, roles, passwords, infrastructure, migrations or deployment
were changed. No project, image or inventory records were created. Authorized
authentication requests used the existing login/session/quota mechanisms; the
verified temporary Buyer session was signed out. No production access, direct
database queries, commit or push was performed.

## Configuration follow-up - 2026-11-07

Authenticated read-only Railway inspection confirmed the current staging
target: project `1f8c9007-2993-426c-bbd0-b8dd0a0b17da`, environment
`2181eadf-21a0-4ca3-8269-b6b6f28af9f4`, HomeZone backend
`ea6ca516-4063-4ed1-be95-bebcc0d1af00`, and Postgres-9ZqA service
`8a0f4b40-a4d6-4924-8b07-79e82065fe24`.

Active deployment `c6a0d334-a599-4fec-b4ef-d121cdeb9ea7` reports SUCCESS,
created 2026-11-07 05:14:37 UTC / 10:44:37 IST. Its configured start command is
`npm run start:realtime`; predeploy remains `npm run db:migrate`. The staging
domain maps to this instance, with no production domain in that instance's
mapping. Exact deployed Git SHA was not established.

Private compliance checks, without printing secret values:

- AUTH_URL, NEXTAUTH_URL, AUTH_STAGING_ORIGIN and NEXT_PUBLIC_SITE_URL all match
  the canonical staging origin.
- AUTH_SECRET is present; PASSWORD_SIGNIN_HMAC_KEY passes the existing source
  length requirements; password-login protection settings are valid.
- HOMEZONE_REALTIME_ENABLED is true.
- Backend DATABASE_URL privately matches the intended staging database service
  and credential reference. Production database isolation was not inspected.

These checks do not identify a missing shared authentication configuration.
The account-specific cause of Builder denial is still unconfirmed.

The PostgreSQL service has no existing public database endpoint. No public
network access was enabled. A targeted account-existence/credential-presence/
role/status/quota SELECT was prepared inside an explicitly READ ONLY
transaction; it retrieves no hashes. The existing private Railway SSH connection
failed authentication before account inspection completed. No account record or
quota was changed and no credential hashes were retrieved.

No existing usable default/custom SSH identity was found by filename checks.
A temporary diagnostic SSH key was proposed for founder approval, to be removed
after the check. No key has been generated or registered. Railway CLI removal
may require owner two-factor confirmation; that cleanup requirement remains
unknown and must be resolved before registration. This changes SSH access, so
it is a separate security approval from the earlier account/project test.

Sanitized private diagnostic evidence: ignored
`build/chat-verification/builder-account-readonly-diagnosis-v5.json`.

## Resume safely after configuration review

1. Confirm Builder credentials work in staging privately; do not put new secrets
   in documentation or chat.
2. Restore a responsive Android test device with sufficient host resources.
3. Repeat only the separately reviewed controlled workflow, retaining the old
   evidence. The publication harness refuses accidental reuse of evidence or a
   duplicate test marker and never automatically repeats an uncertain write.
4. Create one labelled project, confirm PUBLISHED and Builder-owned readback,
   then sign into Buyer and verify the same ID in catalogue and details.
5. Record actual Android card/detail presentation and update delivery before
   marking the full workflow runtime verified.
