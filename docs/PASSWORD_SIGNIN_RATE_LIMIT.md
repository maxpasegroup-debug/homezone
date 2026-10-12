# Password sign-in admission

The password provider admits attempts before user lookup/password verification.
Auth.js performs callback CSRF verification before provider authorization. Denied
attempts return null, preserving generic CredentialsSignin behavior and callback
semantics. No account-existence or quota information is returned.

Defaults: 10 attempts per normalized account per five minutes and 1,000 total
attempts per process per five minutes. The account allowance accommodates ordinary
mistakes while bounding expensive verification; the total backstop bounds traffic
when client identity cannot be established. These initial budgets require staging
capacity/product review and are not a claim of sufficient distributed protection.

Validated optional configuration: PASSWORD_SIGNIN_WINDOW_MS (1..3600000),
PASSWORD_SIGNIN_ACCOUNT_ATTEMPTS (1..10000), PASSWORD_SIGNIN_TOTAL_ATTEMPTS
(1..100000), PASSWORD_SIGNIN_MAX_ACCOUNTS (1..100000). Defaults use 10,000 account
buckets. Invalid configuration fails closed with the same generic credential error.
No deployment values were changed.

Email normalization matches login trim/toLowerCase. Only process-salted HMAC keys
are retained; no passwords or raw account identifiers enter storage/logging.
Admission is synchronous and atomic within one Node process. Expired buckets are
removed on every attempt; idle memory is bounded by the configured cap. Saturation
denies new buckets rather than evicting live limits. Rejected attempts do not extend
the account window. Temporary denial can still be induced by an attacker; no
permanent account lock is created. The process-wide backstop can affect all users.

Railway configuration does not establish a trustworthy client-IP header boundary.
All forwarded/client IP headers are ignored, so malformed/spoofed values cannot
select buckets. There is no per-client isolation yet: clients share the account
and global budgets. Before release, the infrastructure owner must establish how
ingress overwrites authenticated client metadata and approve shared atomic storage
or equivalent verified protection. Multi-instance/restart enforcement is BLOCKED:
each process has independent counters and restarts reset them. No shared service,
dependency, database schema or proxy configuration was introduced.

Monitor aggregate credential failures, saturation and service latency without
recording emails, cookies, CSRF material or passwords. Diagnose configuration
offline; do not reset counters routinely to bypass throttling. Rollout must test
CSRF, callbacks, sessions, expiry, quota exhaustion and recovery on isolated staging.
Server-action password sign-in also passes through this provider. Demo/OAuth
providers and unrelated API limiters are unchanged.
