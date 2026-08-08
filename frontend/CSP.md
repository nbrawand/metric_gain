# Content Security Policy

> **Check it is being sent before trusting any of it.** The policy used to sit
> in `frontend/vercel.json`, on a site served by Render, so it was never sent
> at all. That file is gone; the header is set on the Render static site and
> the values are in [DEPLOY.md](../DEPLOY.md).
> `curl -sI https://www.strength-guider.com/ | grep -i content-security` says
> whether it is live.

The CSP is **enforcing**. It was report-only for as long as it took to measure
the real app against it, which is the only responsible way to get here: a wrong
CSP breaks sign-in or white-screens the page, and report-only never breaks
anything, so an app that works tells you nothing.

Confirmed enforcing rather than merely renamed. A deliberately disallowed image
now reports `disposition: "enforce"` and is actually blocked, where the same
probe returned `report` beforehand. Sign-in still works, the GSI script loads
and the button renders.

**To back it out in a hurry**, rename the header to
`Content-Security-Policy-Report-Only` in the Render dashboard. That disables
enforcement in about a minute without losing the policy.

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

- **The sign-in click-through: one violation, now covered.** A full sign-in on
  production, followed by logging a set, reported the
  `accounts.google.com/gsi/style` stylesheet against `style-src` and nothing
  else. The policy below allows it.

## Worth knowing

1. **`connect-src` hardcodes the Render backend origin.** If `VITE_API_URL`
   ever points elsewhere, API calls are blocked. Worth remembering rather than
   fixing: it is doing its job.
2. **Do not add `Cross-Origin-Opener-Policy`.** Not without testing sign-in
   first. Google's popup posts back to its opener, and the console already
   warns that a COOP would block that call. It is exactly the kind of header
   that looks like a free win while hardening.
3. **One Tap is not used.** `<GoogleLogin>` renders the button only and
   `useOneTap` is never set, so the button flow is the whole surface. If One
   Tap is ever enabled, re-check the console: different rendering path,
   different requests.

## Promoting it to enforcing

All done. Kept as the recipe for changing the policy again later, since the
order is what makes it safe.

1. Put the new policy up as `Content-Security-Policy-Report-Only`.
2. On the live site, console open, complete a full Google sign-in and log a
   set. Note every violation and widen the matching directive, or better,
   remove whatever triggered it. Watch the console, not the app: report-only
   blocks nothing, so the app working proves nothing.
3. Rename the header to `Content-Security-Policy`, keeping the corrected value.
   Both parts matter. Renaming without the corrected value enforces the policy
   that was reporting violations.
4. Sign in again to confirm nothing broke.

### The policy

Live and enforcing. Two changes from the report-only version it replaced:
`'unsafe-inline'` came out of `script-src`, and `https://accounts.google.com`
went into `style-src`.

```
default-src 'self'; script-src 'self' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' data: blob: https://lh3.googleusercontent.com; font-src 'self' data:; connect-src 'self' https://metric-gain-backend.onrender.com https://accounts.google.com; frame-src https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
```

`'unsafe-inline'` stays in `style-src`. Tailwind and React inline styles need
it, and it is a far smaller weakness there than in `script-src`.

The `style-src` addition comes from Google's own documentation, which lists
`https://accounts.google.com/gsi/style` as required, alongside `/gsi/client`
for `script-src` and `/gsi/` for `frame-src` and `connect-src`. The other three
were already covered, because allowing an origin covers every path under it.

Confirmed since, from a real sign-in on production with the console open. The
only violation reported across the whole flow, signing in and logging a set,
was `Loading the stylesheet 'https://accounts.google.com/gsi/style' violates
the following Content Security Policy directive: "style-src 'self'
'unsafe-inline'"`. Nothing else. So the policy below is the whole change.

Two other console messages appear and neither is CSP. `[GSI_LOGGER]: Provided
button width is invalid: 100%` was ours and is fixed. `Cross-Origin-Opener-
Policy policy would block the window.postMessage call` refers to a header we do
not set, and is a standing warning against adding one: Google's sign-in popup
posts back to its opener, so a restrictive COOP would break sign-in. Do not add
`Cross-Origin-Opener-Policy` without testing that flow.

Testing did not surface the `style-src` gap on its own. Loading `/login` and
waiting reported nothing, because GSI fetches that stylesheet when the sign-in
flow is actually engaged, not when the button is drawn. A probe that renders
the page and stops never reaches it. Reading Google's requirements caught what
watching one page load could not, and a real sign-in then confirmed it.

An earlier version of this file blamed the iframe boundary and named One Tap as
the path that would expose it. That was a guess, and wrong twice over: the
button flow does load the stylesheet into our own document, which is exactly
what the real sign-in reported, and the app does not use One Tap at all.

Tokens live in localStorage, so before this was enforcing, any XSS was a full
account takeover. That is what the policy is for, and why `'unsafe-inline'`
staying out of `script-src` matters more than it looks.
