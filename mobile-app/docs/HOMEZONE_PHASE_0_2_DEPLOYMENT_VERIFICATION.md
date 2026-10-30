# Phase 0.2 — staging deployment verification

Date: 2026-10-30. Recommendation: **READY FOR CREDENTIAL ROTATION PLANNING**. This is not activation, deployment or rotation authorization; deployment identity and PIN availability remain unresolved.

## Scope and baseline

Read-only local repository/deployment inspection plus one unauthenticated GET to the staging providers endpoint. No private secret files/configuration dumps, account operations, database access, settings changes, migrations, deployments/restarts, builds/tests, commits or pushes. Production not contacted.

Local branch main; HEAD `09a39de3888772c2ca712355a16f89d2c379a392`; clean before this report. Founder-confirmed source repository: maxpasegroup-debug/homezone. No GitHub settings accessed/changed. No source modifications.

PASS confirms only the described observation. FAIL means the named required condition is unmet at the observation. UNKNOWN means unavailable evidence, not proof of an absent setting or failed deployment.

## Verification checklist

| Check | Status | Evidence / source |
| --- | --- | --- |
| Railway CLI available in this session | FAIL | Get-Command railway/railway.exe/railway.cmd and where.exe railway found none. Repository node_modules/.bin/railway.cmd and common npm/WinGet/Scoop shim locations absent. This does not prove no executable exists anywhere on disk. No installation attempted. |
| CLI authentication confirmed | UNKNOWN | CLI unavailable; no whoami/status command possible. No auth token/config inspected. |
| Accessible Railway connector | FAIL for available tooling | No Railway-specific tool listed in available tool metadata. No authenticated Railway deployment session available. |
| Local Railway project/environment link | UNKNOWN | Repository .railway directory absent; no CLI status available. No railway link/init command run. |
| Intended project/service/environment | PASS, founder confirmation | HomeZone project, HomeZone backend service, staging; Postgres-9ZqA database. Source repository/branch confirmed by founder, not verified effective Railway binding. |
| Current exact project/environment/backend IDs | UNKNOWN | Historical IDs below; no current dashboard record. |
| Active/latest deployment ID,status,created time,SHA | UNKNOWN | No accessible Railway API/dashboard record or deployment logs containing those fields. Local commit time is not deployment time. |
| Four URL settings reported updated | PASS, founder confirmation only | Founder confirms AUTH_URL,NEXTAUTH_URL,AUTH_STAGING_ORIGIN,NEXT_PUBLIC_SITE_URL set to approved staging origin. No independent private metadata read. |
| All four saved to correct service/environment | UNKNOWN independently | Founder confirmation accepted as supplied evidence; saved/effective scopes, shared-variable resolution, pending changes and per-replica state not independently visible. |
| Live Auth.js URLs now point to staging | PASS, public observation | GET providers at 09:52:09.510 UTC returned200; all advertised sign-in/callback origins were https://homezone-staging.up.railway.app. |
| Live mobile-pin provider available | FAIL | Same response lists password only, no mobile-pin. |
| New deployment occurred after URL update | UNKNOWN | Exact update/save/apply time and deployment creation/start times unavailable. Changed public behavior does not identify deployment event or prove timestamp ordering. |
| Active deployment contains PIN implementation | UNKNOWN | No deployed SHA/bundle provenance. Provider absence cannot distinguish old source from disabled configuration. |
| Local HEAD contains PIN implementation commit | PASS | git merge-base --is-ancestor 9f45e985c06168fe3f398ad6174e7607ab718fef HEAD returned0; backend/auth.ts still contains conditional mobile-pin provider. |
| Automatic Railway deployment settings verified | UNKNOWN | GitHub branch binding, auto-deploy, watch paths, approvals/CI wait and staged-variable apply state are dashboard settings, not established by source. |
| Exposed staging AUTH_SECRET requires rotation | FAIL — security remediation outstanding | Founder reports prior screenshot exposure. Treat compromised without retrieving/repeating value. No rotation performed. |
| Exposed staging database credential requires rotation | FAIL — security remediation outstanding | Founder reports DATABASE_URL credential exposure. Rotate underlying database login/password/access, not merely rewrite URL text. No value retrieved or change performed. |

## Public evidence and what it proves

Observed from development computer, not Flutter:

```text
UTC: 2026-10-30T09:52:09.510Z
GET https://homezone-staging.up.railway.app/api/auth/providers
HTTP: 200
Railway request ID: 14yqWg-NTF2saD16s_GTAg
Provider IDs: password
Advertised signin/callback origins: https://homezone-staging.up.railway.app
```

Request used a15s timeout, no credentials/cookies, no redirect following; only sanitized provider IDs/public URL origins and request ID recorded. No token/secret/header dump.

Earlier 09:01:40.173 UTC staging observation generated speeko.online callbacks. The new observation establishes corrected public URL-generation behavior at this time. It does NOT prove each of AUTH_URL,NEXTAUTH_URL,AUTH_STAGING_ORIGIN,NEXT_PUBLIC_SITE_URL is saved/effective, identify the serving SHA or certify all replicas. Auth.js provider URL generation alone does not exercise every custom origin guard or site-link configuration. Thus: **public auth URL behavior confirmed staging; full four-variable runtime activation UNKNOWN**.

Missing mobile-pin remains unresolved. backend/auth.ts:92 includes it only for literal AUTH_MOBILE_PIN_ENABLED=true at module initialization. Once exact deployed bundle/process is confirmed, privately check that gate. Missing pepper/key/table is not the provider-registration condition in this source. No flag changed here.

## Deployment identity and source comparison

| Field | Available identity / limitation |
| --- | --- |
| Founder-confirmed repository/branch | maxpasegroup-debug/homezone, main; effective Railway source binding unknown |
| Current local HEAD | 09a39de3888772c2ca712355a16f89d2c379a392, documentation commit dated 2026-10-30 14:57:49 +05:30 |
| Commit containing PIN provider + enrollment | 9f45e985c06168fe3f398ad6174e7607ab718fef, 2026-10-30 12:41:14 +05:30; ancestor of HEAD |
| Historical project lead | HomeZone/homezone, 1f8c9007-2993-426c-bbd0-b8dd0a0b17da |
| Historical staging environment lead | 2181eadf-21a0-4ca3-8269-b6b6f28af9f4 |
| Historical backend service lead | HomeZone, ea6ca516-4063-4ed1-be95-bebcc0d1af00 |
| Current backend/deployment mapping | UNKNOWN; founder confirmation of names is not verification of historical IDs |
| Active/latest deployment record | ID,status,creation/start/completion time and SHA UNKNOWN |

If owner supplies a SHA present locally, compare ancestry to 9f45e985... using read-only Git. A descendant is source-lineage evidence, not proof no later revert or build-root issue; inspect exact artifact/source too. Do not push/fetch/redeploy to discover identity.

## Automatic deployment behavior: repository versus dashboard

railway.json declares RAILPACK, build npm run build, pre-deploy npm run db:migrate, start npm start -- --hostname 0.0.0.0 and ON_FAILURE restart policy/max3. package script db:migrate runs prisma migrate deploy: deployment can apply ALL pending migrations. Never redeploy casually as a diagnostic.

.github/workflows/ci.yml triggers checks on pull requests and pushes to main/master, runs dependency generation/checks/tests/build; it does not establish Railway auto-deploy linkage/settings. No workflow ran in this investigation. Dashboard overrides, source root/watch paths, selected branch, CI gating, variable-change staging/application and auto-deploy behavior remain UNKNOWN. No claim that every variable save automatically deploys.

An unchanged displayed timestamp is inconclusive: need exact current active/latest deployment records and update/application time, not a relative timestamp or screenshot refresh assumption. Do not infer either redeployment or failure to save solely from that display.

## Exact dashboard evidence required from founder

Without saving/changing anything, open HomeZone → staging → HomeZone:

1. Record project/environment/service IDs and public-domain mapping under service settings/networking.
2. In Deployments, inspect both active deployment and newest deployment (they may differ): ID,status,creation/start/completion UTC,source SHA/repository/branch and any change reason. Provide sanitized metadata only.
3. Record the four URL changes' save/apply time and whether dashboard shows unapplied/pending changes. Privately confirm each name resolves in THIS staging backend, including shared/reference scope. Report compliant/not compliant; never screenshot the full variable list or secret values.
4. Under source/deploy settings record linked repository,branch,root,auto-deploy/watch-path/CI-gating configuration and command overrides. Do not toggle anything.
5. Correlate request ID14yqWg-NTF2saD16s_GTAg at09:52:09.510 UTC with serving service/deployment logs, if available. Capture only identity/status, not request bodies/private user data.

This evidence determines whether a new deployment followed updates and whether serving artifact contains PIN. If unavailable, leave UNKNOWN. No staging redeploy, restart or settings change is authorized by this report.

## Credential rotation planning requirement — not execution

Both staging AUTH_SECRET and the underlying credential referenced by DATABASE_URL are reported exposed and must be treated compromised. No need to redisplay the screenshot or credential to justify remediation planning.

Plan separately, against independently confirmed staging identities:

- Inventory all consumers/replicas/migration runners privately and establish production credential separation before any change. Do not access/rotate production or assume credentials are shared. If owner finds cross-environment reuse, stop and request separately scoped incident response.
- AUTH_SECRET rotation can invalidate existing sessions. Define owner notice/window, session invalidation/revocation scope, coordinated replica rollout and verification. Any registry write, restart or deployment needs approval.
- Database rotation must revoke/replace the exposed underlying database credential, update every authorized staging consumer/reference and verify connectivity without exposing strings. Confirm backup/recoverability, platform-specific supported rotation action and rollback/overlap strategy before execution; no guessed SQL/commands. Updating DATABASE_URL alone does not revoke leaked access.
- Keep new material in private owner-controlled secret storage. Do not put it into Git, Dart defines, chat, documents or logs. Restrict/remove exposure artifacts where feasible without deleting unrelated work; review access history through authorized owner processes.
- Avoid planning rollback that simply reinstates exposed credentials. A recovery plan must restore service with uncompromised credentials. Preserve PIN pepper and stored credential hashes; do not rotate unrelated keys automatically.

Separate founder approval required for the exact rotation scope/action, secret provisioning/settings changes, resulting deployment/restart, session/database operations and controlled verification. This report supplies none of those approvals. Full deployment identity can be gathered as the first planning step; do not delay recognizing compromise because deployment SHA is unknown.

## Exact next action and recommendation

Founder provides the sanitized active/latest deployment evidence package and variable save/apply times described above, while authorizing preparation of a **staging-only AUTH_SECRET and database-credential rotation plan**. Do not share secrets. Continue identity correlation and privately confirm PIN activation prerequisites before proposing deployment changes.

Only this report added; no environment/source/Git history/database/account/production changes. Public callback-origin behavior is corrected, but PIN authentication is still unavailable in the observed provider list and full URL-variable activation/deployment chronology remains unconfirmed.

**READY FOR CREDENTIAL ROTATION PLANNING** — planning only, not ready for rotation execution or PIN activation approval.
