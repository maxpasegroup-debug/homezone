# HomeZone backend

The backend TypeScript implementations live in this folder:

- `api/`: API handlers for accounts, properties, payments, AI, and other modules.
- `auth.ts`: Auth.js configuration and login handlers.
- `db.ts`: Prisma database connection.

For example, account creation is implemented in
`api/auth/password/signup/route.ts`.

This backend runs inside the existing Next.js application. The files in
`../src/app/api` export these handlers so Next.js can serve the same `/api/*`
URLs. Shared domain logic remains in `../src/lib`; database schema and migrations
remain in `../prisma`.

Run `npm run dev` from the project root to start the frontend and backend.
For Railway, deploy the project root containing `package.json` and
`railway.json`. Do not set the Railway Root Directory to `backend`: this folder
is not a separate server or npm package. Configure `DATABASE_URL` in the
application service to connect to Railway PostgreSQL.
