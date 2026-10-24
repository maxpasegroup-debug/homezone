# Registration security fixes before staging

Subsequent local origin/recipient hardening and fresh validation are recorded in
[LOCAL_BLOCKERS_VALIDATION.md](LOCAL_BLOCKERS_VALIDATION.md). Counts in this
original report are historical. Neither report authorizes remote activity.

Staging and production: **NOT VERIFIED**. No deployment, migration, database
connection, real email or account action is authorized by these local results.

## Challenge and concurrency contract

Each challenge permits five atomic guesses and expires after ten minutes. An
exhausted challenge never becomes usable again. An admitted resend replaces its
random ID and HMAC verifier atomically, resets attempts only for the NEW challenge,
and invalidates the old ID. Clients must replace their stored ID and clear code
input. There is no schema change or new migration in this fix.

The existing PostgreSQL counters enforce 100 deliveries/hour aggregate,
three/email/hour and a 60-second cooldown. Thus replacement challenges do not
create an unlimited guessing budget (at most three delivered challenges/email/hour).
Quota admission precedes hashing/publication/email dispatch. Publication locks and
checks the exact cooldown grant; a delayed older admission cannot overwrite a
newer grant. Resend conditionally matches the old ID/verifier, unconsumed state
and expiry. Verification and replacement serialize on the pending record: either
activation wins and replacement fails, or replacement wins and old verification
fails. Duplicate-account uniqueness and activation transactions remain intact.

Provider failure conditionally removes only the issued challenge and never
restores an old verifier or refunds quotas. Guards before dispatch and after
provider completion reject superseded/consumed/expired challenges. Acceptance
means provider acceptance, not mailbox receipt. Delivery is an irreversible
external action: later consumption, replacement, expiry or delayed mail can make
an earlier email obsolete; local cancellation cannot unsend it. Lost responses
may require restart or existing sign-in/recovery. Never automatically replay
activation after an uncertain response.

## Admission and retry contract

A fixed-cardinality PostgreSQL registration request budget of 5000/hour is
enforced before body parsing and pending-challenge lookup, including malformed
and unknown resend IDs. Origin/configuration rejection precedes admission.
Valid verification requests additionally consume the existing 1000/hour budget.
Delivery quotas retain a fixed aggregate/email/cooldown locking order. Invalid IDs
cannot be mapped safely to a recipient budget, so request admission bounds their
lookup traffic; they do not consume a guessed recipient's delivery allowance.

All evaluated delivery constraints are inspected even if one is exhausted.
Their increments roll back on denial. Retry-After is the ceiling of the remaining
latest blocking deadline, at least one second, with the same value in
retryAfterSeconds. If this request consumed the last general request slot, that
deadline is included too. A request rejected at the initial request gate reports
that gate's deadline without looking up an email. This describes the observed
admission decision, not a guarantee that future traffic or later admission tiers
cannot impose another wait. Expired budgets reset only under the row lock;
malformed/unavailable records fail closed with a generic 503, never a guessed 60s.

Successful start/resend returns expiresAt/resendAt (ISO timestamps) and remaining
expiresIn/resendAfter seconds measured after provider completion. The next resend
deadline includes any saturated admitted budget, including the third email send.
Browser and Flutter use earlier expiry/later retry bounds, preserve server waits
across form restart, update replacement IDs, and clear stale code input. Invalid
retry metadata disables automatic retry rather than inventing a shorter wait.
Expired challenges require fresh registration; exhausted guesses allow admitted
resend while the challenge is unexpired. Generic failures do not reveal account
existence or original provider/database error text. Client clocks/countdowns are
feedback only: server expiry, attempt and quota enforcement are authoritative.

## Local regression evidence and limitations

The mocked transactional tests cover both activation/replacement orderings,
simultaneous resends, obsolete publication grants, late provider outcomes,
exhaustion, replay, exact expiry/reset boundaries, overlapping limits, malformed
quota state and pre-lookup admission. Browser feedback helpers are unit tested;
this is not browser DOM/end-to-end evidence. Flutter widget tests use injected
transport and clocks for replacement IDs, full-hour waits, expiry, malformed timing
and restart behavior. No real PostgreSQL lock contention or multi-instance races
were exercised. Command results are recorded in ignored build/qa-registration-fixes.

The fixed request budget itself needs database work and allows aggregate denial.
Infrastructure owners must enforce trusted-ingress request/body/time/concurrency
limits, restrict direct-origin access, define synchronized clocks, transaction
timeouts, capacity, alerting and retention. Application quotas do not replace
edge protection. Existing password sign-in limits remain process-local; first
authorized tests must remain single-instance pending shared enforcement approval.

Before staging: approve isolated application/database credentials and target,
review ALL pending migrations and case-insensitive email duplicates, verify
backup/recovery, configure canonical HTTPS origins and restricted email delivery,
provision shared OTP secret securely, name monitoring/cleanup/recovery owners and
authorize exact test scope/attempt ceilings. No migration was applied here.
Account deletion, personal-data/backup retention and public privacy policy remain
unresolved release gates. Persistent session restoration remains unavailable.
Existing CSRF, independent session verification and ownership safeguards are
unchanged; local clearing is not server revocation.

## Validation results for this fix

All final commands below exited 0 using cached tools and mocked dependencies:

| Command | Result |
|---|---|
| node --test --test-isolation=none tests/registration.test.mjs | 37 reported tests, including parent grouping; all passed. |
| npm test | TypeScript tsc --noEmit, six smoke checks and 116 reported Node tests passed (21 auth, 21 leads, 19 sessions, 8 password limiter, 10 mobile API, 37 registration). |
| npm run lint | Passed. |
| dart format --output=none --set-exit-if-changed lib/features/marketplace/registration_screen.dart test/registration_test.dart | Two files unchanged. |
| flutter --no-version-check analyze --no-pub | No issues. |
| flutter --no-version-check test --no-pub test/registration_test.dart | 14 passed. |
| flutter --no-version-check test --no-pub --reporter expanded test/registration_test.dart test/password_auth_protocol_test.dart test/protocol_ownership_test.dart test/ownership_clearing_test.dart test/sign_in_integration_test.dart test/marketplace_test.dart | 76 passed. |
| .\node_modules\.bin\prisma.cmd validate --schema prisma/schema.prisma | Valid, matching cached Windows schema engine and inert loopback configuration; no database connection. |
| git -c core.safecrlf=false diff --check | Passed. |

Initial analysis exited 1 for three brace-style diagnostics; all were corrected.
The first 14-case Flutter registration run exited 1 (13 passed, one failed):
restarting registration cancelled the retry countdown refresh. The fix preserves
the authoritative wait and restarts its timer; the rerun and broader suite passed.
Earlier standalone registration run passed 31 cases before the final six were
added. Formatting was applied only to the two changed Dart files before the final
non-mutating check. No assertion was weakened or failing test skipped.

The full Flutter suite, native Android/browser UI runs and production builds were
not rerun in this focused phase. Historical full-suite results are not fresh
validation. PostgreSQL contention, migration execution, real provider delivery and
HTTPS ingress/cookie integration remain unverified.

Git remained main at 9cba8d77afabedd5fbf32af638a3ee45615487e5. Initial status:
36 modified and 34 untracked; final: 36 modified and 36 untracked, nothing staged.
All 70 initial changed/untracked files remain; SHA-256 comparison found zero
changes outside the seven intentionally edited existing files. Two new files are
registration-feedback.ts and this report. Existing QA evidence was retained;
new local logs use the separate ignored build/qa-registration-fixes directory.
