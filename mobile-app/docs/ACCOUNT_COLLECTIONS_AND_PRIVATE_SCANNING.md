# Account pagination and private scanning continuation

Source implementation only. No tests, database operations, scanner requests,
document transfers, live account actions or infrastructure verification ran.

## Account collections

`GET /api/mobile/account?view=profile` returns the authenticated profile only.
The existing endpoint without that query retains its prior bounded shape for
compatibility. New Flutter code uses the profile-only view and:

`GET /api/mobile/account/collections?collection=<kind>[&parent=<shortlist>][&cursor=<token>]`

Kinds: `saved`, `shortlists`, `shortlistItems`, `enquiries`. Parent is required
only for shortlistItems. Responses contain collection, parent, items and
nextCursor (null means no further page). Pages contain at most 25 records.
Shortlist metadata loads separately from its property pages to bound responses.

Tokens contain version, collection, parent, createdAt and a stable tie-break ID.
They are opaque navigation positions, not credentials or authorization. They
are bounded, schema checked and scoped to kind/parent. Actor identity always
comes from the current authenticated session. Suspended profiles are rejected;
shortlist ownership and published-property visibility are checked on every page.

Ordering is immutable createdAt descending then ID descending (propertyId for
compound records). Renaming a shortlist does not move a cursor boundary. Deleting
the boundary record does not invalidate the next page because reads compare
values rather than relying on the cursor row still existing. Newly inserted
records above a boundary appear on refresh. Concurrent multi-request browsing
is not a database snapshot: refresh is needed for concurrent edits/removals.

Flutter initial account loading fetches three first pages, not all records in an
unbounded background loop. Each collection and shortlist has an explicit load
control. Failed requests retain their cursor for retry. Results are deduplicated
by stable ID and guarded by actor, coordinator generation and account-load epoch.
Refresh/mutation resets paging to the first pages. Shortlist-add candidates wait
until that shortlist's membership has fully loaded; saved candidates can also be
loaded through Saved. Unknown favorite state is not silently treated as absent;
mutations and detail views use the exact per-property status endpoint.

Pending additive migration:
`20261026143000_account_collection_indexes` adds four compound indexes supporting
the actor/parent + createdAt + tie-break queries. It was not applied. Review table
sizes, available disk, index-build lock impact and recovery with the database
owner before authorizing the existing deployment migration runner. No data is
deleted by this migration. Do not run deployment to obtain approval implicitly.

Deferred regression cases: identical timestamps, foreign-parent/cursor misuse,
boundary deletion, inter-page insertion, rename, final/empty pages, duplicate
taps, retry, same-account generation replacement and late responses after reset.

## Private-file scanner adapter (not a provisioned provider)

Encrypted storage is still limited to 512 KiB PDFs, 50 per parent. File headers
and encryption do not establish malware safety. Uploads must receive a clean
verdict before any file/metadata is stored. Every download, including old
encrypted files, rescans the decrypted bytes before returning them. There is no
trusted/unscanned bypass, cached clean flag or public fallback. A clean verdict
is only the configured scanner's judgment of those exact bytes at that time;
it is not a security certification or a guarantee that a document is harmless.
Because scanning introduces an asynchronous gap, upload admission locks and
rechecks the current actor profile as well as parent authority in its database
transaction. Exports recheck the session, current actor and parent permission
after scanning. A failed recheck prevents publication; it cannot undo bytes
already processed by an authorized scanner request.

Server-only owner inputs:

- `PRIVATE_FILE_SCANNER_APPROVED=true`: explicit approval to send private bytes
  to the chosen endpoint, after privacy/security review. Default is unavailable.
- `PRIVATE_FILE_SCANNER_URL`: owner-approved HTTPS endpoint; no URL credentials,
  query parameters or fragments. Redirects are rejected. No guessed provider URL.
- `PRIVATE_FILE_SCANNER_KEY`: server-only bearer credential, at least 32 characters,
  no whitespace. Supply securely; never put it in Flutter defines or evidence.
- Existing private encryption/opt-in keys, isolated database and reviewed migration.

The provider (or an approved internal gateway) must implement this **adapter
contract**, not an assumed vendor API:

1. HTTPS POST raw application/pdf bytes, Authorization Bearer credential,
   X-Homezone-Scan-Contract: 1 and X-Homezone-Content-SHA256 for the exact bytes.
   No filename, account ID, parent ID or database metadata is included.
2. A successful JSON response no larger than 2 KiB:
   `{ "version": 1, "sha256": "<matching digest>", "verdict": "clean" }`
   or verdict `infected`. No raw scanner details are forwarded to clients.
3. Missing configuration, failures, timeout after 8 seconds, redirects, malformed
   JSON, wrong contract/digest and unknown verdicts all fail closed. Infected
   uploads receive a safe rejection. No file is stored on scan failure. Existing
   documents stay encrypted and cannot be exported when scanning is unavailable.

Owner must approve scanner provenance/update policy, coverage, capacity, outbound
destination, egress restrictions, credential rotation, monitoring, processing
region, retention/no-content-logging, incident handling and availability. This
code does not provision that service, send a sample or prove its behavior.

Large files, private video/images/Word formats, resumable upload and streaming
object delivery remain blocked. Before implementing them, the owner must select
private object storage and its authentication, quarantine/promote protocol,
streaming scanner contract, size limits, encryption/key ownership, retention and
deletion policy. Public Cloudinary media is not a private-storage substitute.
No payload limits or database CHECK constraints were raised speculatively.

## Team and review boundaries

Existing owner/assigned-profile/admin authorization remains in force. No new
delegated/team access was granted. Invitations/consent, account linking,
deactivation/reassignment and delegated actions still need explicit product and
security decisions. Team role labels are not global account privileges.

Review requests still record human review only. Admin updates now reject a
suspended reviewer, validate the request reference and trim/validate meaningful
review notes. State transitions remain conditional updates plus audit in one
transaction. Admin queue access also rejects a suspended reviewer. No account
deletion, irreversible purge, provider refund, eligibility rule or policy
approval was added or implied by recording REVIEWED/CLOSED.

## Role-workspace and review-queue continuation

The Flutter role workspace now requests `mode=cursor` on
`GET /api/mobile/workspace`, with optional `after` and existing module/parent.
Legacy `page` mode retains its prior response shape and page bound; the new UI
uses no page-number ceiling. Mixing page and cursor modes is rejected. Duplicate
query keys, malformed/oversized cursors and module/parent mismatches fail safely.
Cursors are navigation positions, never identity or permission.

All cursor-mode workspace reads use bounded 20-record pages plus one lookahead.
Most lists have deterministic descending ID order and ID keyset comparison;
this is stable record order, not a promise of chronological or recent-update
ranking. Calendar preserves dueAt ascending, nulls last, then ID ascending.
History preserves viewedAt descending then property ID descending. Calendar and
history cursor tokens include their ordering value. Moving history/calendar
records during browsing can move them above the boundary; refresh for concurrent
changes. Cursor reads never require the boundary row itself to still exist.

Workspace results remain scoped by current actor, suspended state, role, owned
project and/or existing assigned-profile/property-owner rules. No delegation
permissions were introduced. UI responses check actor, generation and request
epoch, validate nextCursor/hasMore consistency and deduplicate by stable ID.
History uses property identity rather than a nonexistent history-row ID.

New child modules, each requiring the existing parent authority:

- leadNotes: paginated notes, with canEdit derived from the existing author rule;
  actor IDs are not returned just to drive UI permissions. Edit uses the existing
  note endpoint; its authorization remains authoritative.
- leadTasks: paginated tasks, with complete/reopen through existing task routes.
- leadVisits: paginated visits, with update through existing visit routes.
- requestQuotes: the requester sees their request's quotes; an active verified
  provider sees only its own quotes. Customer accept/reject and provider revision
  use existing quote handlers. A provider does not acquire customer powers from
  another provider's quote or a client-supplied canDecide value.

Cursor-mode parent records omit embedded first-20 child arrays rather than
presenting those arrays as complete. The UI opens the dedicated child lists.
Legacy page-mode projections retain the old embedded shape for compatibility.
Root query projections, parent checks and child queries remain bounded. Existing
incoming-request opportunity visibility rules were preserved, not expanded.

The shared lead-access helper now rejects a missing/suspended actor or stale
role before returning lead access, covering the existing linked mutation routes.
Quote mutation also explicitly rejects a suspended actor. No team role labels
or metadata were converted into permissions.

Admin review queue now has explicit status filters and createdAt/ID keyset Next
navigation without a new page ceiling. Existing page bookmarks remain supported;
new links use cursor positions. Invalid query state is not displayed as an empty
queue. REVIEWED/CLOSED continues to mean human review only, never authorization
for account deletion or a provider refund. No execution-policy approvals were
invented; no account data or money was changed.

The scanner adapter additionally requires the exact three response fields,
exact application/json media type (optional parameters allowed), matching digest,
contract version and verdict. Input must still be a bounded PDF. Missing or extra
fields, unknown verdicts, malformed content and transport failures fail closed.
No actual scanner provider/endpoint/credential was supplied or exercised.

Deferred checks remain owner-authorized work: all workspace module cursor paths,
parent/foreign-cursor rejection, boundary deletion, equal due/view times, null due
times, concurrent updates, stale session results, nested record mutations, note
ownership, provider isolation, review filter paging and scanner contract failures.
Compilation/typechecking are not evidence these runtime/security cases passed.

## Paged selection and bounded permission checks

Workspace visit creation and lead assignment now use WorkspaceRecordPicker.
The chooser explicitly loads further enquiry/team pages, retains cursor state
for retries, distinguishes no eligible rows so far from exhausted results, and
uses current actor/generation/request-epoch checks. Refresh restarts the first
page. No account mutation occurs merely by selecting a record; existing forms
and action confirmations remain. The team chooser filters active linked members
on every loaded page, not just the first 20. The server still independently
checks assignment membership and lead access. The enquiry chooser skips records
without a property reference; visit creation rechecks ownership/publication.

MarketplaceRepository.workspacePage centralizes bounded cursor response parsing
for workspace lists and selectors. It validates module/mode/source, item count,
nextCursor format/progress and hasMore consistency. Credential/cookie details
remain inside the existing transport/coordinator; selectors own no credentials.

API lead mutations now use requireLeadPermission, a bounded ownership/status
projection. They no longer load all lead notes, tasks, notifications, visits and
timeline merely to decide whether a write is allowed. Existing full web lead
views retain requireLeadAccess and their existing shape; that full retrieval
happens only after permission admission. The buyer enquiry fallback also
explicitly rejects suspended actors. No author, owner, assignment or admin rule
was broadened. Mobile visit create/cancel now rejects suspended actors directly.

Private export reads check scoped metadata/authority before fetching ciphertext,
then validate that the fetched file still has the admitted scope/parent. The
existing post-scan session/permission recheck remains. Upload storage owns a
copy of the admitted bounded bytes across asynchronous scan/encryption; mutable
caller buffers cannot change what is encrypted after the scan. There is still
no unscanned export, provider shortcut or public private-document fallback.

Review submission remains idempotent. A previously completed review is reported
as existing, with no claim that a new review was opened. Both review endpoints
explicitly return executionPerformed=false. This is a factual execution result,
not a policy approval system; no deletion, purge, refund or automatic reopening
was implemented. Reopening and financial/data-retention execution need policy
approval and an authorized workflow.
