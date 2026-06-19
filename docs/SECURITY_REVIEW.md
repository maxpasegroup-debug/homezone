# Security Review

## RBAC

Protected dashboards and APIs use middleware and server-side role checks. Admin routes require `ADMIN` or `SUPER_ADMIN`.

Finding: RBAC foundation is launch-ready, but role changes depend on session/JWT refresh timing. Critical APIs still enforce server checks.

## Admin Protection

Admin dashboard and verification/moderation APIs are protected by admin helpers and rate limits.

Finding: ADMIN and SUPER_ADMIN access is correctly scoped.

## Rate Limiting

Sensitive APIs use in-memory rate limiting.

Finding: Good for single-instance launch. Move to Redis/Upstash before multi-instance scaling.

## Upload Validation

Upload APIs validate folder, MIME type, and size.

Finding: Launch-ready for basic media safety. Add antivirus or moderation provider later if needed.

## OTP Flow

Phone is verified only after successful OTP verification. OTP codes are hashed with `OTP_PEPPER`.

Finding: Delivery provider must be configured with production credentials before launch.

## Razorpay Webhook Verification

Payment success is accepted only from Razorpay signature verification or webhook verification.

Finding: Ensure webhook secret is production-only and rotated if exposed.

## Production Auth Configuration

Required:

- strong `AUTH_SECRET`
- production `NEXTAUTH_URL`
- Google OAuth production callback
- demo login disabled automatically in production

Finding: Auth is launch-ready after env audit passes.

## Monitoring

Logger is Sentry-ready and includes event IDs when capturing exceptions.

Finding: Full Sentry SDK installation/wiring is recommended after initial launch.
