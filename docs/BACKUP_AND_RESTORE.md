# Backup And Restore

## PostgreSQL Backup

Use a managed database backup schedule in production. Before major releases, take a manual logical backup:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=homezone-$(date +%Y%m%d-%H%M).dump
```

Store backups outside the application server with restricted access.

## PostgreSQL Restore

Restore into a fresh database first:

```bash
pg_restore --clean --if-exists --dbname "$DATABASE_URL" homezone-backup.dump
npx prisma migrate deploy
npx prisma generate
```

Run smoke tests after restore before routing production traffic.

## Cloudinary Backup Strategy

Cloudinary is the media source of truth. Keep:

- folder naming conventions stable
- asset IDs stored in database records
- periodic export/download process for critical property and reel media
- admin review for broken media references from the launch readiness dashboard

No automated backup job is included in Phase 7.
