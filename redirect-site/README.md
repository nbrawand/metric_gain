# Redirect site

The only job of this directory is to give the old domain something to deploy.

`strength-guider.com` moved to `strengthguider.com`. The redirect itself is a
Render rule on a **separate** static site, `/*` to
`https://strengthguider.com/*`, action Redirect, which Render serves as a 301
and which replays the captured path so `/how-it-works` lands on
`/how-it-works` rather than the home page.

It has to be a separate service. Render matches redirect rules on path, not on
hostname, so the same rule on the main site would fire for the new domain too
and loop forever.

Namecheap's URL Redirect Record would have avoided the second service, but it
does not serve HTTPS for the redirecting domain, and the old domain sends HSTS
with a one year max-age. Browsers that have seen that header refuse plain HTTP,
so those visitors would get a connection failure rather than a redirect.

The fallback page is `moved.html`, deliberately **not** `index.html`.

That is the whole trick, and it was learned the hard way. Render does not apply
redirect or rewrite rules to a path where a resource exists; it serves the
resource instead. That is what stops the main site's `/*` rewrite from
shadowing `/assets` and `robots.txt`, and it is correct. But it also meant `/`
resolved to `index.html`, so the homepage, the single most valuable URL to
redirect, returned 200 and served this page rather than a 301. Every other path
redirected properly, which made it easy to miss.

With no file at `/`, nothing matches, the rule fires, and the root 301s like
everything else. `moved.html` is now unreachable in normal operation and exists
only as something to publish and a place to explain this.
