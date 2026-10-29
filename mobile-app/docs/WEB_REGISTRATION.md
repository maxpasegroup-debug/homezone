# Direct web registration and mobile OTP registration

Source implementation only. No runtime or infrastructure verification was performed.

## Web contract

`POST /api/auth/password/web-signup` accepts only JSON `name`, `email`, and
`password`, bounded to 4096 request bytes. Name is trimmed (2–120 characters),
email trimmed/lowercased (valid email, maximum 254 characters), and password
uses existing 8–128 character uppercase/lowercase/number rules.

The browser must send the exact selected canonical Origin. Missing or mismatched
Origin and cross-site requests are rejected. This is browser CSRF protection,
not a guarantee that only browser clients can call the public endpoint.

Response contracts (all no-store):

- 200 `{ "message": "Continue with secure sign-in." }` for a new account or
  an existing email. This does not prove account creation or authentication.
- 400 generic invalid-body or field-validation error.
- 403 `{ "error": "Request not permitted." }` for origin rejection.
- 429 generic error, `retryAfterSeconds`, and consistent `Retry-After` header.
- 503 `{ "error": "Registration is temporarily unavailable." }` on dependency
  or configuration failure. Logs contain only a fixed failure-stage label.

Creation is atomic across User, PasswordCredential and Profile, with salted
scrypt hashing before the creation transaction. Existing accounts are never
updated. Case-insensitive lookup and the existing `User_email_normalized_key`
functional unique index protect duplicate email creation; the deployed index
and migration state must be independently verified before runtime approval.
Only recognized User email uniqueness conflicts receive the generic acknowledgment;
unrecognized uniqueness failures deny safely rather than hide storage errors.

New web users retain `emailVerified: null`, default USER role and normal pending
profile verification. No organization, team, tenant, invitation, or account linking
is accepted from input. Ordinary password authentication currently permits
unverified emails, as approved; it does not prove ownership of the mailbox.
No verified-email privilege or automatic account linking is added. Reserving
another person's email remains an inherent risk of unverified registration.

After acknowledgment, the form invokes existing Auth.js password sign-in using
the captured submitted credentials, then independently checks `/api/auth/session`
before navigation. Auth.js retains CSRF, cookie and server session-registry handling.
An unsuccessful or uncertain sign-in sends the user to existing sign-in/recovery
with explicit feedback; registration is never automatically retried.

## Shared quota infrastructure, isolated web counters

The shared `RegistrationBudget` table and extracted atomic quota helper are used
with a separate `web-registration:v1:` namespace:

- 5000 admitted requests/hour globally, before body parsing.
- 100 valid registration attempts/hour globally.
- 3 attempts/hour per normalized email.
- One attempt per normalized email per 60 seconds.

Attempt limits run before hashing, including duplicate accounts. Applicable limit
increments are rolled back together if any attempt limit rejects. Request admission
is separate and remains consumed. Retry timing includes an exhausted request window
when it overlaps a later attempt rejection. Cleanup is limited to 100 expired web
rows per admitted attempt; no mobile OTP or password-sign-in counters are cleared.
The reused helper uses application time after row locking, so synchronized worker
clocks and owner-approved trusted ingress abuse protection remain prerequisites.

Per-email counter identifiers use purpose-separated HMAC with the already required
`PASSWORD_SIGNIN_HMAC_KEY` (32–256 characters); no new secret or environment variable
is introduced. The key and policy must agree across workers. Rotation changes
per-email buckets and needs coordination. Missing key or unavailable database fails
closed. No Resend credential, sender, recipient allowlist or OTP pepper is required
by this handler. Auth.js sign-in still requires its existing configuration.

## Mobile contract preserved

`POST /api/auth/password/signup`, `/signup/resend`, and `/signup/verify` continue
using email OTP and their existing quotas. Shared bounded JSON/quota helpers were
extracted without changing their logic. No Flutter source or API contract changed.

The original OTP endpoint's reported 503 cause remains unconfirmed. This source
addition does not diagnose or repair its runtime dependencies. No Railway settings,
schema, migrations, production deployment or account data were changed.

Future authorized validation should cover origin/CSRF rejection, strict input,
all four quota boundaries and overlaps, concurrent duplicates, transaction rollback,
sign-in/session failures, unchanged mobile OTP behavior and multi-worker enforcement.
These checks have not been run.
