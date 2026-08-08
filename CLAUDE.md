Do the following. After each make sure to check your work, commit, push it, and
check it off the list

[x] make the days collapsable during the mesocycle creation screen
[x] When a user adds, removes, swaps an exercise during a workout, the same day
of future weeks in the mesocycle should keep those changes.
[x] Go online and do research for missing mesocycle templates if you find
reputable ones then add them to the library. Do the same for the exercise
library.


## Competitive roadmap (vs RP Hypertrophy)

Ordered deliberately. Everything under "Correctness" is a defect, the plan we
hand lifters is wrong today, and the autoregulation bet automates those same
numbers, so building it first would just automate the wrong answer. Work the
sections in order.

Positioning these serve: *"it adapts from what you lifted, not from a survey."*
RP charges $34.99/mo and asks 5 subjective questions per muscle per session
(soreness, pump, workload, joint pain, disruption) to approximate what our
logged sets already measure objectively. Don't copy the survey.

### Correctness, the current plan is wrong

[x] Size the weight jump to the lift instead of always rounding up to the next
multiple of 5. `compute_progression_targets` in
`backend/app/services/progression.py` advertises +2.5% but the `min 2.5` floor
plus `round_to_nearest_5` makes every jump +5 lb. Measured: 15->20 (+33%),
20->25 (+25%), 30->35 (+17%), but 225->230 (+2.2%). That is backwards, light
isolation work gets an unachievable target every week while heavy compounds
barely move. Round to the increment actually available for that exercise
(barbell 5, dumbbell 5, machine/cable per-stack, microplates where relevant),
and keep the percentage as the driver rather than the floor.

[x] Only add weight when the last performance actually hit its target.
`compute_progression_targets` takes prev weight/reps but ignores `target_reps`
and `target_rir`, so missing 8 reps at 0 RIR still earns a heavier target next
week. Hold (or back off) on a miss.

[x] Add kg support. `lbs` is hardcoded in
`frontend/src/pages/WorkoutExecution.tsx` (search `target: ${...} lbs`) and
`round_to_nearest_5` is meaningless on kg plates, which go in 2.5/1.25 steps.
Needs a user-level unit preference; `users.preferences` JSON already exists.
    Stored in preferences as `weight_unit`. Weights are kept as the number the
    lifter typed, so switching units converts the logged history server-side -
    otherwise a 225 lb squat silently becomes 225 kg and feeds every future
    target. Rounding happens in the chosen unit, never by converting a pounds
    answer. Toggle lives in the nav menu.

[x] Add a deload week. `compute_target_rir` ramps `[3,2,2,1,1,0]` over a 6-week
block, so RIR hits 0 on the final week and the block just ends, the next block
then starts with a fully fatigued lifter. RP's final week *is* the deload
(volume drops to maintenance, ~6 sets/muscle/week). Decide whether the deload
is an extra week or the last planned week, and make the calendar and the
"blocks complete when every session is done" logic agree with the choice.
    Decided: an extra week. `weeks` still means training weeks; instances carry
    `includes_deload` and expose `total_weeks`. Blocks already in flight keep
    their old span (the flag is stored, not derived) since they have no
    sessions for that week.

[x] Warn on unrecoverable volume at plan time. There is no ceiling at all, the
old auto-volume setup and per-session cap were removed in `2812ab0`/`855754d`.
Five chest exercises at 3 starting sets +2/week generates 15/25/35/45/55/65
sets per week; RP's chest MRV is ~22. The volume chart
(`frontend/src/utils/volume.ts`, `MuscleGroupVolumeChart`) already computes
these totals for the review step, flag the muscle groups that blow past a
sane weekly ceiling instead of rendering the number silently.
    Ceilings live in `volume.ts` as `WEEKLY_SET_CEILINGS`, roughly where the
    published MRV ranges top out. The review step lists the offending groups
    (first week crossed, plus the peak) and the chart draws the ceiling as a
    dashed line with over-cap weeks in amber. It warns rather than blocks, it
    is still the lifter's plan.

### The strategic bet

[x] Performance-driven volume autoregulation, from data we already store. Every
set records target weight/reps/RIR and actual weight/reps, which is enough to
score performance vs target with **zero extra taps from the lifter**. Replace
the fixed `weekly_set_increment` (chosen once at creation, replayed for the
whole block by `compute_sets_for_week`) with: hit targets on all sets -> +1 set
next week; missed on one -> hold; missed on most -> drop a set. Cap against a
per-muscle-group ceiling. Note RP manages volume per *muscle group* while we
increment per *exercise*, recovery happens per muscle, so the cap belongs at
the muscle-group level. Keep the manual increment as an override for lifters
who want to drive it themselves.
    Done. On by default for new blocks (toggle when starting one), which also
    means sessions generate flat instead of pre-ramped, pre-ramping and then
    autoregulating would apply two increases to the same week. Cap enforced at
    the muscle-group level; ceilings are duplicated in
    `backend/app/services/autoregulation.py` and `frontend/src/utils/volume.ts`
    with a test asserting they match. Blocks already running keep their fixed
    plan (`autoregulate_volume` is stored, not derived).

### Table stakes we're missing

[x] Progress analytics. There is no route for it at all (see the `Route` list
in `frontend/src/App.tsx`), we store every set ever logged and show none of it
back. Estimated 1RM over time, weekly volume per muscle group across blocks,
PR history. Reviewers ding RP for weak analytics, so this is cheap ground.
    Done: /progress, backed by /v1/analytics. Estimated 1RM counts reps left in
    reserve, so a set stopped at 2 RIR isn't read as weaker than the same
    weight taken to failure; Epley is clamped at 12 effective reps.

[x] Optional rest timer. **Product decision needed first, don't just build
it.** The rest/log info modals in `frontend/src/pages/WorkoutExecution.tsx`
currently say "No timer here on purpose," which is a defensible stance, but a
missing timer is one of the most-requested features in RP's own App Store
reviews. Suggest opt-in and off by default, so the philosophy stays the default
without being a reason to churn.
    Built as suggested: off by default, opt in from the menu with a duration
    preset. Starts when a set is saved, counts up past zero rather than
    freezing at 0:00, and survives a locked screen (wall-clock deadline, not a
    decrementing counter). The "No timer here on purpose" copy is now the
    softer "that judgement is the default here".

[x] Plate calculator and warmup-set guidance. Both are recurring complaints
about RP; both are self-contained and need no backend work.
    Tap a target weight in a workout to get plates per side and a warmup ramp.
    Unit-aware, and honest when no plate combination hits the target exactly.

[x] Bodypart-specialization templates (chest focus, arm focus, glute focus).
RP has 100+ templates against our 10, the answer is a strong builder plus a
handful of good blocks, not 100 we can't maintain. Overlaps with the template
research item above; do them together.
    Done with the template research item: Chest Focus Upper/Lower and Arm Focus
    Upper/Lower added (Glute & Lower Body Focus already existed). Both hold
    everything outside the focus at maintenance rather than adding volume on
    top, and say so in the description. Library is now 16 templates.

### Marketing, not code

[x] Say "works offline" on the landing page. Neither `Landing.tsx` nor
`HowItWorks.tsx` mentions it at all today, and it is our one clear head-to-head
win: RP has no offline mode and their top App Store complaint is verbatim
"needs to work without internet." We already have the sync queue and it's
hardened.
    Hero mentions it, a landing card replaces "Stays on Your Plan" (whose claim
    stopped being true once mid-workout edits started carrying forward), and
    How It Works gains an offline section.

## Landing page and pre-purchase surface

From a review of how RP Hypertrophy and Alpha Progression sell. What they lead
with: RP anchors on Dr. Mike Israetel plus named pro athletes, a transformation
carousel, 100+ plans and 250+ technique videos, at $34.99/mo with **no free
trial** (30-day money-back only). Alpha Progression leads with 4.9 stars /
40k+ reviews / 25M+ workouts, founder credentials, and an explicit comparison
table naming Strong, Hevy and Fitbod.

Documented complaints about RP, the openings: price ("more than my gym
membership"), steep setup, cluttered UI, not suitable for beginners, no offline
mode, weak analytics.

Everything below is visible to people who have not paid. Ordered by leverage.

### Highest leverage

[x] Put the price in the hero. $4.99/mo appears once, in the footer. RP is
$34.99 and price is the single most repeated complaint about them. Being 7x
cheaper is the strongest card and it is currently buried.

[x] Sell the free trial above the fold. RP has no free trial at all, only a
money-back guarantee, which requires paying first. "Free for 5 days, no card up
front" is a structural advantage that appears nowhere near the top. Change the
CTA from "Get Started" to something that says free.

[x] State the positioning: *it adapts from what you lifted, not from a survey.*
RP asks 5 subjective questions per muscle per session (soreness, pump,
workload, joint pain, disruption); we score the same thing objectively off
logged sets with zero extra taps. Concrete, checkable, and currently unsaid on
the landing page.

[x] Promote offline from one card among four to a headline-level claim. RP's
most-cited App Store complaint is reportedly needing internet. Clearest
head-to-head win we have.

[x] Claim beginners explicitly. Reviewers consistently say RP is too complex for
newcomers. We ship three beginner templates and an educational How It Works
page, and the landing page never says "good for your first structured block."

Two bugs found while doing the above, both fixed:
- The whole app, landing page included, blocked on fetching the Google client
  id from the backend, with retries. A cold server meant seconds of "Loading..."
  on the one page a prospect sees before paying. Only the login page needs that
  config; routes now mount immediately.
- The red "Can't reach the server" banner showed to logged-out visitors, which
  is exactly what a cold backend produces on the landing page. It now only
  appears for people who actually have work to lose.

### Accuracy, the page describes an older product

[x] Fix the exercise count. It says 115; there are 140. Template count is not
mentioned at all; there are 16. This category competes on countable numbers
(RP leads with "100+ plans, 250+ videos").

[x] Advertise what shipped but is not mentioned: deload weeks, kg support,
plate calculator and warmup ramps, the Progress page, the optional rest timer,
per-muscle volume warnings.

### Structural gaps both competitors have and we do not

[x] Add an FAQ. Both use one heavily for objection handling. Candidates: is
this for beginners, what if I miss a workout, do I need particular equipment,
can I cancel, is there an app to download, what happens to my data if I stop.

[x] Add an honest comparison table. Alpha Progression does this by name. Four
rows would carry it: price, free trial, works offline, adapts from logged sets
vs self-reported surveys.

[ ] Add product imagery for the newer screens. Correction to the original
note: there are already three phone mockups on the page, not one. What is
missing is the Progress charts, the volume warning and the plate calculator -
the newest and most visual work. Needs matching device-framed mockups rather
than raw browser screenshots, which is design work, not copy.

[~] Social proof, ratings, user counts, testimonials. **Do not manufacture
any.** Honest routes: a founder note on why this was built, the App Store
rating once there is one, or letting How It Works carry the credibility.
    Partly done: a "Why This Exists" section now stands in, saying plainly that
    this is small and independent and has no endorsement wall, and pointing at
    the method instead. Real ratings and testimonials stay open until there are
    genuine ones to show, this item cannot be finished by writing copy.

[x] Build a real pricing section. One sentence today: no annual option, no plan
comparison, no money-back guarantee. RP anchors high with an annual price;
inverting that and letting one cheap monthly price be the whole story may work
better for us.

### Smaller

[x] Add a Privacy Policy. The footer links only Terms. We use Google OAuth and
Stripe, this is a trust signal and probably a compliance gap.
    Written against an audit of what the code actually does, not a template.
    **Not reviewed by a lawyer**, treat it as an accurate description of our
    practices that still needs professional review before it is relied on.

[x] Reframe the PWA angle. "No download needed" reads apologetic. It is a
benefit: nothing to install, no app store, updates instantly, works on any
device.
    The section was defined entirely by what it is not, with a native app as
    the implied standard: "no download needed", "no app store required", "like
    a native app". It is "Nothing to Install" now, and leads with starting in
    seconds, the same account across devices, and improvements arriving without
    an update to approve. The FAQ answer went the same way.

[ ] Let people see the product without signing up. Alpha's free tier is
"genuinely usable, forever". A read-only demo block or an annotated screenshot
tour would let people evaluate before committing.

[x] Use How It Works as top-of-funnel content. It is public, genuinely
educational, and now covers RIR, mesocycles, progressive overload, deloads and
autoregulation, but it is positioned as documentation rather than a reason to
visit. SEO and content-marketing value going unused.
    The blocker was smaller and more basic than the framing suggested: there
    was no per-route metadata at all, so every page served the home page's
    title and description to search engines and link previews. `usePageMeta`
    fixes that for the five public routes. The RIR section, the most searchable
    thing on the page, had no anchor to link to. There is a contents list now,
    a "Learn the Method, Free" section on the landing page that links each
    question to its section, and a sitemap that includes /privacy plus a
    robots.txt that excludes /account and /progress.

[ ] Add email capture for people who are not ready to pay yet.

## Open

[ ] **Every route except `/` returns 404 on direct navigation in production.**
`/how-it-works`, `/privacy`, `/terms` and `/login` all 404 against the live
site; only `/` serves the app. Installed users never see it, because the
service worker's `navigateFallback` answers navigations from its precache,
which is why it went unnoticed. It hits everyone arriving from outside: a
shared link, a bookmark, and every crawler reading the sitemap.

    The frontend is served by Render behind Cloudflare, not by Vercel:
    responses carry Render's `rndr-id` header, and the service is
    `strength-guider` (its onrender.com subdomain serves the same build as the
    live site). Fixed by one dashboard rule, Source `/*`, Destination
    `/index.html`, Action **Rewrite** (not Redirect). Blueprints were
    considered and declined: adopting a manually created service means
    restating every dashboard setting in the file or risking a sync changing
    what it does not mention, which is a poor trade for two rules. `DEPLOY.md`
    records what to set and how to verify it.

[ ] **The security headers have never been served.** Same discovery.
`frontend/vercel.json` held them, on a site Render serves, so the site returns
no HSTS, no `X-Frame-Options`, no `Referrer-Policy`, no `Permissions-Policy`
and no CSP at all. The only security header present is
`X-Content-Type-Options`, which comes from elsewhere. That file is deleted;
the values to set on the Render static site are in `DEPLOY.md`.


[x] Self-service account deletion and data export. Writing the privacy policy
made this concrete: there is no endpoint for either, so the policy has to
promise both by email. Most privacy regimes expect a user to be able to delete
their account and get a copy of their data without asking a human. The policy
says we are working on making both self-service, so this is now a promise in
writing.
    Done: an Account page, `/v1/account/export` and `DELETE /v1/account`.
    Neither is behind the subscription guard, a lapsed subscriber is the most
    likely person to want their data out. Deletion closes the Stripe customer
    first and refuses to proceed if that fails, because deleting the row loses
    the only link between the person and a card that is still being charged.
    The export is column-driven rather than a hand-written field list, so a
    column added later cannot silently go missing from it. Privacy policy
    rewritten to describe the buttons instead of promising email.

[ ] Error monitoring. Eighteen commits of behaviour change, autoregulation,
deload weeks, unit conversion that rewrites logged history, and a production
500 still reaches us via a user rather than a page. Nothing is wired up: no
Sentry, no alerting. Highest-value infrastructure item.

[x] CI. 264 backend tests, 78 frontend tests, and `npm run lint` now exits 0
including warnings, so there is finally a gate worth wiring to GitHub Actions.
Before this it could not have gated anything.
    Done: `.github/workflows/ci.yml`, three jobs (backend, frontend, prose).
    The prose job rejects em dashes, which otherwise return the moment anyone
    writes a new comment. Every step verified locally before committing,
    including that the em dash check actually fails when one is present.

[ ] Check whether the Stripe webhook is currently failing in production, and
replay anything that did. `stripe` was the only unpinned dependency and Render
installs requirements.txt on every build, so builds since 2026-03-26 could have
picked up stripe 15.0.0, where `StripeObject` stopped subclassing `dict` and
every `.get()` in `routers/billing.py` raises. Now pinned to 14.4.1, so the
next deploy is safe either way, but that does not undo events already dropped.
Stripe Dashboard, Developers, Webhooks, look at the delivery attempts: 500s
mean it happened. Stripe retries for about three days, so anything older than
that is gone and the affected subscriptions need reconciling by hand. Worst
case is a `checkout.session.completed` that never landed, which is a customer
who paid and never got access.

[x] Rewrite `routers/billing.py` off `.get()` and `isinstance(x, dict)` so the
stripe pin can move past 15. Small surface: `_id_of`, `_invoice_subscription_id`
and the event handler body. Until then the pin is load bearing and the comment
in requirements.txt says so.
    Done differently to the plan, and better: rather than teaching each helper
    about StripeObject, the handler verifies with the SDK and then reads the
    raw JSON payload. The SDK object model stops being part of our contract
    entirely. Verified by running the whole suite against 14.4.1 and 15.4.0,
    and by checking the old code does fail under 15. A regression test fakes a
    non-dict `construct_event` return so CI catches a relapse on the pinned
    version, where `.get()` would still work.

[ ] Decide whether to move the stripe pin to 15.x. The code no longer needs
the pin, but nothing tests the live API surface (Customer, Subscription,
checkout, billing_portal) because those call Stripe. One test-mode checkout and
one portal visit would settle it.

[ ] Promote the CSP from report-only. It protects nothing today, and it turns
out it is not even being served: it lived in `frontend/vercel.json`, and the
site is on Render. So this now starts with getting the headers deployed at all,
then one real sign-in with the browser console open to catch what Google's GSI
widget reaches for, then enforcing. Steps in `frontend/CSP.md`. Until then,
tokens in localStorage mean an XSS is full account takeover.

[x] Tests for WorkoutExecution.tsx and Mesocycles.tsx (1,600 and 1,141 lines,
no direct coverage). Both need refactoring to be testable; the components and
stores they compose are covered, which is why this is lower than it looks.
    WorkoutExecution has 9 tests now, and no refactoring was needed after all:
    it renders under mocks once the instance fixture carries its nested
    `mesocycle_template`, which is what the page actually reads the plan from.
    They cover set logging, editing one field without destroying the other,
    the skipped rule, and the four offline paths that decide whether a lift
    survives a failed save. Mutation tested: removing the enqueue fails 4,
    flattening the skipped rule fails 1, dropping the field-preserving spread
    fails 3.
    Mesocycles.tsx has 10, covering the two irreversible things it does:
    deleting a template and starting a block. Also mutation tested. One of
    them, that a block is dated from local parts rather than toISOString, was
    passing vacuously, because the assertion can only fail in the hours where
    the local and UTC dates differ and CI runs in UTC, where they never do.
    The suite now pins TZ to America/Los_Angeles and that test freezes the
    clock at 21:30 local, so it fails for the right reason.

[ ] Watch autoregulation against real training. The logic is well covered but
the *policy* is unproven: +1 on a clean week, -1 below 60% of target reps,
capped per muscle group. The first block someone runs end to end is the test.
