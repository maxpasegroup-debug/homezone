# Google OAuth Setup

HomeZone enables Google sign-in only when both production OAuth variables are present:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

The Auth.js callback route is handled by:

```text
/api/auth/callback/google
```

For the production domain, the full callback URL is:

```text
https://maxpase.com/api/auth/callback/google
```

## Railway Variables

Set these in Railway under the HomeZone service variables:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_URL=https://maxpase.com
AUTH_SECRET=
```

Recommended companion values:

```env
AUTH_URL=https://maxpase.com
NEXT_PUBLIC_SITE_URL=https://maxpase.com
```

Generate `AUTH_SECRET` locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

After adding or changing variables, redeploy the Railway service.

## Google Cloud Console

Create an OAuth Client ID:

- Application type: Web application
- Authorized JavaScript origins:

```text
https://maxpase.com
```

- Authorized redirect URIs:

```text
https://maxpase.com/api/auth/callback/google
```

Copy the client ID and client secret into Railway as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## Verification

After redeploy:

- `/auth` should show `Continue with Google` or `Sign up with Google`.
- It should no longer show `Google login not configured`.
- Clicking Google should redirect to Google and then back to `/api/auth/callback/google`.
