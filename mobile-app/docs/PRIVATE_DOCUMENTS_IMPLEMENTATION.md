# Private-document implementation (continuation)

Status: source implemented and feature off by default. No migration was applied,
no document was uploaded/downloaded, and no database or storage provider was used.

## Storage and authorization

Latest continuation: uploads and exports additionally require the approved
fail-closed scanner adapter. See ACCOUNT_COLLECTIONS_AND_PRIVATE_SCANNING.md for
the server-only configuration, exact provider contract and outstanding approvals.
Existing encrypted files are rescanned on export; encryption is not a trusted
scan status. No scanner endpoint was configured or contacted during development.

The existing PostgreSQL platform can store bounded encrypted PDFs. This avoids
public Cloudinary URLs for sensitive documents and adds no new external provider.
`PrivateFile` stores AES-256-GCM ciphertext, a random 12-byte IV, 16-byte tag, key
identifier and metadata. AAD binds file ID, scope and parent record. Keys remain
server-side and are never returned to Flutter or stored in the database.

- Supported content: PDFs with a recognized header, up to 524,288 bytes (512 KiB).
  Header validation is not malware scanning or a full PDF integrity check.
- Maximum: 50 managed files per parent. Upload admission serializes on that
  parent's PostgreSQL row, then rechecks authority and the count in a transaction.
- Property: current property owner or web administrator.
- Lead: existing assigned-profile/property-owner/admin CRM rules. No new team
  permissions or customer access to internal CRM documents are inferred.
- Studio: customer/admin reads; only a web administrator uploads deliveries.
  Uploading a PDF does not automatically mark an order delivered.
- Every browser or mobile download reauthenticates and rechecks parent access.
  Internal `/api/private-files/[id]` URLs are not bearer links. Responses use
  no-store; binary downloads are attachments with nosniff and sandbox headers.
- Mobile JSON downloads remain below the existing API response bound. Native
  pick/export operations have a per-screen lease and stale-result rejection.
  Leaving the screen or losing the session invalidates its local authority.
- Export requires user consent and a system-chosen destination. Exported copies
  leave HOMEZONE's control; already accepted OS/provider exports cannot be undone.
- Private route diagnostics accept fixed operation categories only. They do not
  log original errors, document bytes, filenames or encryption keys. Raw Prisma
  query/error logging is disabled; other application logging still needs the
  separately authorized security/operational review.

## Required server configuration

| Variable | Required value/purpose |
|---|---|
| `PRIVATE_FILES_ENABLED` | Exact `true` only after storage capacity, migration, privacy and recovery approval; absent means disabled. |
| `PRIVATE_FILE_ACTIVE_KEY_ID` | Nonsecret active key ID, 1-40 letters/digits/underscore/hyphen. |
| `PRIVATE_FILE_KEYS` | Secret JSON object, up to eight key-ID to canonical base64 mappings; each decodes to exactly 32 bytes. Active ID must exist. No values are supplied here. |
| Existing `DATABASE_URL` | Explicitly isolated approved PostgreSQL target with reviewed migration history. |

Keep old keys while their files or backups must remain readable. All workers must
use consistent key IDs/key material. Back up ciphertext and the keyring separately
through approved protected processes; losing keys loses access. No keys were
created, inspected, copied or provisioned in this pass.

## Migration and retention gate

`prisma/migrations/20261026120000_private_files/migration.sql` adds `PrivateFile`
and `AccountServiceRequest`, their checks/indexes and restrictive foreign keys.
It does not modify/delete existing rows or apply a retention policy. New private
files and review records can prevent deletion of referenced parents. Deletion,
purge, legal holds, backup expiry and key destruction require an approved policy
and a later authorized implementation. No purge endpoint or automatic cleanup is
provided. Removing managed file metadata is blocked until that workflow exists.

Before any deployment: review all prior migrations, isolation, table capacity,
backup/restore, encryption-key custody, ingress body/rate limits and monitoring.
Railway's existing pre-deploy command runs `npm run db:migrate`; therefore a future
deployment would apply this pending migration unless the owner controls the gate.
This document does not authorize that deployment or migration.

Rollback: disable new uploads/access, preserve tables, ciphertext and keys, and
restore/redeploy only through the approved recovery procedure. Do not drop
populated tables or remove keys as a rollback shortcut.

## Legacy and large media

New public uploads reject document folders and PDF/Word MIME types. New sensitive
metadata references must point to a managed file for the same parent. Existing
external references are preserved, with downloads withheld in the updated UI
pending privacy review. Previously public objects may remain public at their
provider: this code cannot retroactively revoke them. Inventory, migration and
provider-side revocation require separate authorization; no URL was fetched here.

Large private images, video, Word documents and malware scanning still require
an approved access-controlled provider/format workflow. Existing public property
photographs continue using the existing Cloudinary integration.
