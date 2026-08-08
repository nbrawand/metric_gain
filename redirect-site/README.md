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

`index.html` is never served while the rule is in place. If someone sees it,
the rule is missing.
