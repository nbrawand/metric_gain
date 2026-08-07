# Content Security Policy

`vercel.json` ships the CSP as **`Content-Security-Policy-Report-Only`**, not as an
enforcing policy. The other headers there (HSTS, `X-Frame-Options`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) *are* enforcing -
they carry no breakage risk.

Report-Only means violations are logged to the browser console and nothing is
blocked. That is deliberate: the policy has three parts that could not be
verified without exercising the deployed app, and a wrong CSP breaks sign-in or
white-screens the page.

## Why it isn't enforcing yet

1. **Google sign-in.** `@react-oauth/google` injects
   `https://accounts.google.com/gsi/client` at runtime and the widget renders in
   an `accounts.google.com` iframe. `script-src` and `frame-src` cover that, but
   the exact set of origins GSI reaches has not been observed in production.
2. **`connect-src`** hardcodes the Render backend origin. If `VITE_API_URL`ever
   points somewhere else, XHR to the API would be blocked.
3. **`'unsafe-inline'` in `script-src`** is present only for the JSON-LD block in
   `index.html`. It substantially weakens the policy and should be replaced with
   a hash or nonce before enforcing.

## Promoting it to enforcing

1. Deploy, then open the site and **complete a full Google sign-in** plus one
   workout flow with the browser console open.
2. Note every `[Report Only] Refused to ...` message and widen the matching
   directive, or, better, remove the thing that triggered it.
3. Replace `'unsafe-inline'` in `script-src`: take the sha256 of the JSON-LD
   block in `index.html` and list it as `'sha256-...'`.
4. Rename the header key to `Content-Security-Policy` and redeploy.
5. Re-run step 1 to confirm nothing broke.

Until step 4 lands, the CSP provides **no** XSS protection. It is staged, not
finished.
