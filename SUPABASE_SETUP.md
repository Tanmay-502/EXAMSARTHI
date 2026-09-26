# Supabase Setup Guide

## Authentication Configuration

EXAMSAARTHI V2 uses the PKCE-compatible Magic Link authentication flow (using `token_hash` and `type=email`).
This is securely implemented via the `/auth/confirm` route and standard `@supabase/ssr` practices.

### 1. Redirect URLs

In your Supabase project dashboard (**Authentication > URL Configuration**):

- **Site URL**: `http://localhost:3000` (for local development)
- **Redirect URLs**: Add `http://localhost:3000/**` to ensure the `/auth/confirm` route is allowed.

When deploying to production, add your production domain to both the Site URL and Redirect URLs.

### 2. Email Templates (Magic Link & Confirm Signup)

Because we are using the secure PKCE token hash flow, **all** authentication emails must construct the URL using `.TokenHash` and `.RedirectTo`.
Do **NOT** use the legacy `{{ .ConfirmationURL }}`.

In your Supabase project dashboard (**Authentication > Email Templates**), you must update **BOTH** of the following templates:

1. **Magic Link** (Sent to returning users)
2. **Confirm signup** (Sent to new users when `signInWithOtp` creates their account)

Update the **Message body** of the **Magic Link** template:

```html
<h2>Sign in to Exam Saarthi</h2>
<p>Click the link below to securely sign in:</p>
<p>
  <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">
    Sign In
  </a>
</p>
<p>If you didn't request this email, you can safely ignore it.</p>
```

Update the **Message body** of the **Confirm signup** template:

```html
<h2>Sign in to Exam Saarthi</h2>
<p>Click the link below to securely sign in:</p>
<p>
  <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup">
    Sign In
  </a>
</p>
<p>If you didn't request this email, you can safely ignore it.</p>
```

This ensures the user is securely redirected to:
`http://localhost:3000/auth/confirm?token_hash=...&type=email` (or `type=signup`)
which our application will then exchange for a secure server-side session cookie.
