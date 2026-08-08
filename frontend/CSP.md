# Content Security Policy

> **Check it is being sent before trusting any of it.** The policy used to sit
> in `frontend/vercel.json`, on a site served by Render, so it was never sent
> at all. That file is gone; the header is set on the Render static site and
> the values are in [DEPLOY.md](../DEPLOY.md).
> `curl -sI https://www.strength-guider.com/ | grep -i content-security` says
> whether it is live.

The CSP is sent as **`Content-Security-Policy-Report-Only`**, not as an
enforcing policy. The other headers (HSTS, `X-Frame-Options`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) *are*
enforcing and carry no breakage risk.

Report-Only means violations are reported and nothing is blocked. A wrong CSP
breaks sign-in or white-screens the page, so it stays report-only until the
real app has been exercised against it.

## What has been checked

Measured against production, and against the real build served locally with a
stricter policy. Violations were collected through `report-uri` and the
`securitypolicyviolation` event rather than by reading the console, and the
method was proved by deliberately tripping `img-src` first, so "no violations"
means no violations rather than a listener that never fired.

- **Page load, routing, and the Google button: clean.** Loading `/login` on
  production reports nothing. The GSI script loads, the button renders, the
  `accounts.google.com` iframe is created, and the only external origins the
  page touches are `https://accounts.google.com` and the Render backend. Both
  are already allowed.
- **`'unsafe-inline'` in `script-src` is not needed.** It was there for the
  JSON-LD block in `index.html`. Serving the real build with it removed
  produces no `script-src` violation, because a
  `<script type="application/ld+json">` block is data and is not policed as an
  inline script. No hash is needed either, which is a better outcome than the
  hash this file used to recommend.

## What is still unverified

1. **The sign-in click-through.** Everything up to rendering the button is
   clean, but the credential exchange after clicking has not been exercised.
   That is the one step that needs a real account.
2. **`connect-src` hardcodes the Render backend origin.** If `VITE_API_URL`
   ever points elsewhere, API calls are blocked. Worth remembering rather than
   fixing: it is doing its job.

## Promoting it to enforcing

1. On the live site, with the browser console open, **complete a full Google
   sign-in** and log one set in a workout.
2. Note every `[Report Only] Refused to ...` line. Nothing means step 3 is
   safe. Anything else, widen the matching directive, or better, remove
   whatever triggered it.
3. In the Render dashboard, replace the `Content-Security-Policy-Report-Only`
   header with the policy below, under the enforcing name
   `Content-Security-Policy`.
4. Re-run step 1 to confirm nothing broke.

### The policy to enforce

Two changes from the one being reported on today: `'unsafe-inline'` comes out
of `script-src`, and `https://accounts.google.com` goes into `style-src`.

```
default-src 'self'; script-src 'self' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' data: blob: https://lh3.googleusercontent.com; font-src 'self' data:; connect-src 'self' https://metric-gain-backend.onrender.com https://accounts.google.com; frame-src https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
```

`'unsafe-inline'` stays in `style-src`. Tailwind and React inline styles need
it, and it is a far smaller weakness there than in `script-src`.

The `style-src` addition comes from Google's own documentation, which lists
`https://accounts.google.com/gsi/style` as required, alongside `/gsi/client`
for `script-src` and `/gsi/` for `frame-src` and `connect-src`. The other three
were already covered, because allowing an origin covers every path under it.

Testing did not surface the `style-src` gap and could not have. The button
renders inside an `accounts.google.com` iframe, and a page's CSP does not
govern what loads inside a cross-origin frame, so that stylesheet never touched
our policy. Other GSI rendering paths, One Tap in particular, load it into our
own document, where it would have been blocked. That is the argument for
reading the third party's requirements rather than only observing one code
path.

Until step 3 lands, the CSP provides **no** XSS protection, and tokens in
localStorage mean an XSS is a full account takeover.
