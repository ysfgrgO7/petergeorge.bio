# Security Audit and Hardening Guide

## 1. Firebase Security Rules
Deploy the following rules to `firestore.rules`. They implement granular access and schema validation.

**Highlights:**
- `isAdmin()` helper now checks `email_verified`.
- `students` can only read/write their own data.
- `isValidProgress()` ensures data integrity.

## 2. Next.js Middleware & Headers
The `middleware.ts` file implements:
- **Strict Content Security Policy (CSP)** with nonces to prevent XSS.
- **Permissions-Policy** to disable unused browser features (camera, mic).
- **Strict-Transport-Security** (HSTS) for HTTPS enforcement.
- **X-Content-Type-Options: nosniff** to prevent MIME-type sniffing.

**Integration Note:** The `RootLayout` in `app/layout.tsx` has been updated to pass the nonce from headers to providers.

## 3. Authentication & Session Management
For Server Components, we use **Firebase Session Cookies** instead of raw ID tokens.

- `lib/admin/sessionUtils.ts`: Utilities for creating and verifying session cookies.
- **Best Practice:** When a user logs in, send their ID token to an API route that calls `createSessionCookie` and sets it as an `httpOnly` cookie.

## 4. API Route Protection
Use the `withAuth` Higher-Order Function from `lib/admin/apiWrapper.ts` to protect your API routes:

```typescript
import { withAuth } from '@/lib/admin/apiWrapper';

export const GET = withAuth(async (req) => {
  return NextResponse.json({ message: 'Protected data' });
});
```

## 5. Vercel Dashboard Hardening
Toggle these settings in the Vercel Dashboard:

1.  **Environment Variables:**
    - Use `Production`, `Preview`, and `Development` scopes correctly.
    - Ensure sensitive keys like `FIREBASE_PRIVATE_KEY` are only in `Production` and `Preview` if needed.
2.  **Deployment Protection:**
    - Enable **Vercel Authentication** for Preview Deployments to prevent public access to staging environments.
3.  **DDoS Mitigation:**
    - Vercel has built-in DDoS protection, but you can configure **Attack Mode** in the Security tab if you're under active attack.
4.  **Content Security Policy:**
    - While we've implemented CSP in middleware, you can also monitor violations using Vercel's **Security Headers** reporting.
