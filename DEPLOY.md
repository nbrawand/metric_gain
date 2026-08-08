# Deploying the frontend

## Domains

`strengthguider.com` is the site. `www.strengthguider.com` 301s to it, which
Render does automatically for the paired subdomain.

`strength-guider.com` is the old domain and 301s to the new one, paths intact.
That redirect is a **separate** Render static site, `strength-guider-redirect`,
publishing `redirect-site/` with one rule, `/*` to `https://strengthguider.com/*`,
action Redirect. It has to be separate: Render matches rules on path, not
hostname, so the same rule on the main site would fire for the new domain and
loop. Keep the old domain registered and pointed there; links in the wild do
not expire.

### Why `redirect-site/` looks the way it does

It holds exactly one file, `moved.html`, and no `index.html`. That is
deliberate. Render does not apply redirect rules to a path where a resource
exists, it serves the resource instead. That is what stops the main site's
`/*` rewrite from shadowing `/assets` and `robots.txt`. It also means an
`index.html` here made `/` return 200 and serve that page rather than a 301,
so the homepage, the most valuable URL to redirect, was the one URL that did
not. Every other path worked, which made it easy to miss.

The same rule is why nothing else belongs in that directory. Any file added is
publicly served on the old domain instead of redirecting, and is indexable. A
README lived there briefly and was reachable at
`https://www.strength-guider.com/README.md`, which is why this explanation is
here instead.

`moved.html` is unreachable in normal operation and exists only because a
Render static site needs something to publish.


The frontend is a **Render static site** named `strength-guider`, served behind
Cloudflare. Responses carry Render's `rndr-id` header, which is how to tell.

It is not on Vercel. A `frontend/vercel.json` existed for a long time holding
security headers and a CSP, and none of it was ever served, because nothing
read the file. It has been deleted. Nothing in the repo configures the deployed
response: **everything below is typed into the Render dashboard**, so this file
is the record of what should be set there.

Check it with `curl -sI https://strengthguider.com/`.

## Google sign-in

The OAuth client lives in Google Cloud project **`319029498301`**, administered
by **strengthguider@gmail.com**. That is the account to sign in as to reach it,
which is worth writing down because nothing in the app or the Render dashboard
points at it.

The client id itself is not a secret and is served publicly from
`/v1/auth/google-client-id`; its leading number is the project number, which is
how the project was identified in the first place.

What matters when a domain changes: **Authorized JavaScript origins** on that
client must list every origin the app is actually served from. Sign-in fails
with an origin mismatch otherwise, and it fails at credential exchange rather
than at render, so the button still appears and nothing looks wrong until
someone tries. Redirect URIs are not used, the button returns an ID token
straight to the page.

The owning Google account has no bearing on app accounts. Users are matched on
the verified email in the token, so the client id is only ever checked during
verification.

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
