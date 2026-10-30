# Staging deployment identity report

Date: 2026-10-30. Recommendation: **REQUEST FOUNDER ACCESS/EVIDENCE**. Deployment identity remains inconclusive; not ready for activation review.

## Scope and evidence sources

Read HOMEZONE_FINAL_STAGING_PIN_ACTIVATION_HANDOVER.md and HOMEZONE_STAGING_READINESS_VERIFICATION.md. Compared their evidence with current read-only Git history, committed files, mobile staging configuration, railway.json and HOMEZONE_STAGING_DEPLOYMENT_READINESS.md.

No authenticated Railway dashboard, deployment logs or configuration metadata were accessible. Railway CLI is not available on PATH and no repository .railway directory exists. These facts describe available access, not whether the owner has Railway access elsewhere. No credentials or secret files were inspected. Public requests were not repeated: the latest available recorded observation is identified below.

PASS confirms only the named check; FAIL identifies an observed unmet condition; UNKNOWN means evidence is insufficient and does not establish a missing setting or outdated deployment.

## Local source provenance

| Check | Result | Evidence / source |
| --- | --- | --- |
| Current branch identified | PASS | Read-only git branch --show-current: main. |
| Current local SHA identified | PASS | git rev-parse HEAD: e19c1d110efe9f9aa2279b372dd37c4a3281989b. |
| Existing work preserved | PASS | At entry only the untracked handover and readiness-verification documents were listed; neither changed by this investigation. |
| Provider introduction identified | PASS | git log -G AUTH_MOBILE_PIN_ENABLED -- backend/auth.ts identifies 9d730f266d9e568737d360e28fce9fef766f1f89, 2026-10-30 10:50:20 +05:30, mobile-number/PIN foundation commit. |
| Registration introduction identified | PASS | Path history for src/app/api/mobile/auth/register/route.ts identifies 9f45e985c06168fe3f398ad6174e7607ab718fef, 2026-10-30 12:41:14 +05:30. |
| One commit containing both identified | PASS | git show at 9f45e985c06168fe3f398ad6174e7607ab718fef confirms both conditional mobile-pin provider in backend/auth.ts and POST registration route. This commit is an ancestor of current HEAD. |
| Local commit deployed or pushed | UNKNOWN | Local history/ancestry does not establish remote push, Railway branch binding or deployment. No push/fetch performed. |

Current HEAD is a documentation commit dated 2026-10-30 14:04:00 +05:30. Commit times are source-history metadata, not deployment timestamps. The provider foundation and enrollment implementation were separate commits; do not mistake the earlier provider introduction for complete registration support.

## Expected staging identity versus confirmed live identity

| Item | Result | Evidence / source |
| --- | --- | --- |
| Configured mobile environment | PASS | mobile-app/config/staging.local.json: API enabled, environment staging, origin https://homezone-staging.up.railway.app. Configuration must still be explicitly passed into launch/build; no runtime claim. |
| Expected Railway project documented | PASS, documentation only | Handover/readiness report: HOMEZONE/homezone, project ID 1f8c9007-2993-426c-bbd0-b8dd0a0b17da, from historical screenshot/context. |
| Expected staging environment documented | PASS, documentation only | Environment ID 2181eadf-21a0-4ca3-8269-b6b6f28af9f4, historical evidence. |
| Expected backend documented | PASS, documentation only | HomeZone service ID ea6ca516-4063-4ed1-be95-bebcc0d1af00, historical evidence. |
| Current domain-to-service mapping | UNKNOWN | No current Railway Settings/Networking evidence tying the public hostname to those IDs. |
| Actual deployed SHA/deployment ID | UNKNOWN | Neither supplied reports nor available local metadata establish it. |
| Actual deployment status/time | UNKNOWN | No active-deployment record or current dashboard/log metadata. HTTP responses are not deployment-success records. |
| Expected database documented | PASS, documentation only | Owner-intended Postgres-9ZqA; current service ID and backend reference unverified and outside this identity-only inspection. |
| Effective configuration verified | UNKNOWN | No Railway variables inspected. In particular AUTH_MOBILE_PIN_ENABLED is not verified. |

railway.json declares RAILPACK, npm run build, pre-deploy npm run db:migrate and npm start -- --hostname 0.0.0.0. It does not contain project/service identity, deployed SHA or effective dashboard overrides. A deployment may run migrations automatically; nothing in this report authorizes a redeploy to discover its identity.

## Provider response and exact-deployment correlation

Latest available evidence is the prior read-only check recorded in HOMEZONE_STAGING_READINESS_VERIFICATION.md:

| Observation | Result | Source |
| --- | --- | --- |
| Public providers response | PASS for endpoint response | GET https://homezone-staging.up.railway.app/api/auth/providers returned 200 at 2026-10-30 08:47:07.793 UTC; request ID kafWTpBCQvCaZpGns_GTAg. |
| mobile-pin advertised | FAIL at recorded observation | Same response omitted mobile-pin. Not rechecked during this investigation. |
| Registration GET | PASS for expected method-rejection observation only | GET /api/mobile/auth/register returned 405 at 08:47:08.154 UTC; request ID R3PN4CZ3TCK-igue5nX1uw. No POST attempted. |
| Response tied to exact deployed artifact | UNKNOWN | No correlated Railway request log, service/deployment ID or deployed SHA available. Request IDs are correlation leads, not source-version identifiers. |

The observations came from the development computer, not Flutter. They establish neither current provider status indefinitely nor actual PIN account operations. A registration GET 405 is consistent with a POST-only route but cannot identify the deployed handler's source. Historical 404 is superseded as an observation, not proof that the full new artifact was deployed.

## Competing explanations

| Explanation | Result | Supporting evidence and limit |
| --- | --- | --- |
| Older/different deployed source | UNKNOWN; plausible | Local implementation exists; actual deployed SHA unknown. Missing provider does not prove old source. GET 405 weakens an assertion that the registration URL is simply absent, but does not establish Auth.js version. |
| Provider disabled/not literal true at initialization | UNKNOWN; supported by source mechanism | backend/auth.ts:92 registers mobile-pin only if AUTH_MOBILE_PIN_ENABLED === "true" during module initialization. If this exact code is proven deployed, absence points to inactive initialization/configuration, subject to deployment/replica correlation. No effective setting inspected. |
| Wrong service/domain mapping | UNKNOWN; plausible | Historical service IDs are not current mapping evidence. Need current Networking/Settings and deployment logs. |
| Mixed replicas/stale process or artifact | UNKNOWN | No replica/process provenance available. A later configuration value alone cannot prove what each running process initialized with. |
| Missing pepper/quota key/PIN tables hides provider | Not supported by reviewed registration condition | These dependencies are used for enrollment/authentication, not the conditional provider push. Their runtime readiness remains independently unknown. |

Overall conclusion: **INCONCLUSIVE**. There is no evidence-backed exact deployment-level root cause. Do not change a flag, redeploy or weaken protections based on these hypotheses.

## Exact missing evidence

1. Current Railway project/environment/backend IDs and domain mapping for the staging URL.
2. Active deployment ID, exact source commit SHA, status and deployment time, with repository/branch/root metadata.
3. Service request/log evidence correlating request ID kafWTpBCQvCaZpGns_GTAg and its UTC timestamp to the serving deployment; if unavailable, a newly authorized read-only request correlated to current logs.
4. Replica/deployment consistency if multiple processes serve the hostname.
5. Only after source identity is established: private compliance confirmation that AUTH_MOBILE_PIN_ENABLED was literal true at initialization, without secret/configuration dumps. This investigation has not verified it.

## Smallest founder action

In Railway, open HOMEZONE → staging → backend → active deployment details and provide a sanitized screenshot/export containing **project/environment/service identity, deployed commit SHA, deployment ID/status/time and staging domain mapping**. Keep the Variables tab, credentials, tokens and connection strings out of the capture. If metadata spans multiple panels, provide only those nonsecret fields. No settings need changing.

That one evidence package allows a direct local-versus-deployed comparison. If access is provided instead, use a staging-scoped read-only mechanism; do not paste access tokens in chat. Follow with log correlation, then private flag compliance; activation and database readiness remain separate gates.

Only this report was added. Existing work preserved. No application code/Git history, configuration, deployment, process, database or accounts changed. No production access, live requests, builds, tests, migrations, commits or pushes occurred in this investigation.

**Recommendation: REQUEST FOUNDER ACCESS/EVIDENCE.**
