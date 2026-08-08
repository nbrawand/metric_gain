# Deploying the frontend

The frontend is a **Render static site** named `strength-guider`, served behind
Cloudflare. Responses carry Render's `rndr-id` header, which is how to tell.

It is not on Vercel. A `frontend/vercel.json` existed for a long time holding
security headers and a CSP, and none of it was ever served, because nothing
read the file. It has been deleted. Nothing in the repo configures the deployed
response: **everything below is typed into the Render dashboard**, so this file
is the record of what should be set there.

Check it with `curl -sI https://strengthguider.com/`.

## Routing: the SPA rewrite

Without this, every path except `/` returns 404 to anyone arriving from
outside. Users with the app installed do not see it, because the service worker
answers navigations from its precache, which is why it went unnoticed for so
long. It breaks shared links, bookmarks and every crawler reading the sitemap.

Render dashboard, the `strength-guider` service, **Redirects and Rewrites**:

| Source | Destination | Action |
| --- | --- | --- |
| `/*` | `/index.html` | **Rewrite** |

Rewrite, not Redirect: the URL in the address bar must not change, or every
deep link turns into a bounce through the home page.

This does not shadow real files. Render's rule: "Render does not apply redirect
or rewrite rules to a path if a resource exists at that path." So
`/assets/*.js`, `/robots.txt` and `/sitemap.xml` are still served normally, and
only paths with no file behind them fall through to the app shell.

Verify:

```bash
for p in / /how-it-works /privacy /terms /login; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' https://strengthguider.com$p)  $p"
done
# all 200, and a missing asset should still be a real 404:
curl -s -o /dev/null -w '%{http_code}\n' https://strengthguider.com/assets/nope.js
```

## Response headers

Render dashboard, same service, **Headers**. Path `/*` for all of them.

| Name | Value |
| --- | --- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' data: blob: https://lh3.googleusercontent.com; font-src 'self' data:; connect-src 'self' https://metric-gain-backend.onrender.com https://accounts.google.com; frame-src https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'` |

Two of these deserve a second's thought before you paste them in.

**`Strict-Transport-Security`** is a commitment, not a toggle. `max-age` is a
year and `includeSubDomains` extends it to every subdomain of
`strengthguider.com`. Browsers that see it will refuse plain HTTP to any of
them for that year, and you cannot take it back quickly. Fine if everything on
the domain is HTTPS, which it is today; worth remembering before putting
anything HTTP-only on a subdomain.

**`Content-Security-Policy`** is enforcing, so a mistake in it breaks the site
rather than logging. It was report-only first and promoted only after a real
sign-in produced exactly one violation, which the policy now allows. If it ever
needs backing out in a hurry, renaming it to
`Content-Security-Policy-Report-Only` disables enforcement without losing the
policy. See [CSP.md](frontend/CSP.md) for how it was verified.

`X-Content-Type-Options` is already present on responses today, from Render or
Cloudflare. Setting it explicitly is harmless and makes the intent visible.

## Why this is not in version control

Render can manage all of it from a `render.yaml` Blueprint, and the routes and
headers blocks are part of the spec. It was a deliberate choice not to: a
Blueprint does not adopt a manually created service just because the file
exists, and adopting one requires the file to restate every setting already in
the dashboard or the sync can change what it does not mention. For two rules on
one service, the dashboard is the smaller risk. If the service count grows,
generating a Blueprint from the existing services is the way in, because it
captures the current settings rather than guessing them.
