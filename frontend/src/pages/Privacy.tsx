import { useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * Privacy Policy.
 *
 * Written against what the code actually does, audited at the time of writing:
 * the columns on the users table, the third parties we genuinely call (Google
 * for sign-in, Stripe for payment, Render and Vercel for hosting), the two
 * localStorage keys, and the absence of any analytics or tracking script.
 *
 * Two rights below are honoured by email rather than by a button, because no
 * self-service deletion or export endpoint exists yet. Do not soften that
 * wording without building them first. The policy has to match the product.
 */
export default function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="bg-gray-900 min-h-screen py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center text-teal-400 hover:text-teal-300 transition-colors mb-8"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-400 mb-10">Last updated: August 7, 2026</p>

        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">THE SHORT VERSION</h2>
            <p className="mb-4">
              Strength Guider stores the email address and name your Google account gives
              us at sign-in, and the training you log. We do not run analytics, advertising
              or tracking of any kind, and we do not sell or share your data with anyone
              for their own purposes. Your card details never reach our servers.
            </p>
            <p>
              The rest of this page says the same thing in more detail.
            </p>
          </section>

          <section id="what-we-collect">
            <h2 className="text-xl font-bold text-white mb-4">1. WHAT WE COLLECT</h2>
            <p className="mb-4">
              <strong className="text-white">From signing in.</strong> We use Google
              Sign-In. Google tells us your email address, your name, and whether Google
              has verified that email. We do not receive your Google password, and we
              cannot see anything else in your Google account.
            </p>
            <p className="mb-4">
              <strong className="text-white">What you create in the app.</strong> The
              training blocks and workout templates you build, every set you log (weight,
              reps, reps in reserve, and any note you attach), plus any custom exercises
              you add. This is the substance of the service.
            </p>
            <p className="mb-4">
              <strong className="text-white">Your settings.</strong> Your unit preference
              (pounds or kilograms), whether the rest timer is on and for how long, your
              time zone, and whether you have completed the introduction.
            </p>
            <p className="mb-4">
              <strong className="text-white">Account and billing state.</strong> When your
              account was created, when you last signed in, whether your subscription is
              in trial, active, past due or cancelled, and identifiers issued to us by
              Stripe so we know which subscription is yours.
            </p>
            <p>
              <strong className="text-white">We do not collect</strong> your card number,
              your location, your contacts, your device identifiers, or anything from other
              sites you visit.
            </p>
          </section>

          <section id="no-tracking">
            <h2 className="text-xl font-bold text-white mb-4">2. NO TRACKING</h2>
            <p className="mb-4">
              There are no analytics scripts, advertising pixels, session recorders or
              third-party trackers on this site. We do not build a profile of you, we do
              not track you across other websites, and there is nothing here for an ad
              network to read.
            </p>
            <p>
              We also do not use cookies for tracking. The site stores two things in your
              browser: your sign-in tokens, so you stay signed in, and any sets you logged
              while offline, so they are not lost before they reach the server. Both are
              required for the app to function, and both are cleared when you sign out or
              clear your browser data.
            </p>
          </section>

          <section id="how-we-use-it">
            <h2 className="text-xl font-bold text-white mb-4">3. HOW WE USE IT</h2>
            <p className="mb-4">We use what we hold to:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Sign you in and keep you signed in.</li>
              <li>
                Generate your training plan and its targets, which is arithmetic on the
                sets you logged and happens on our servers, not by any human reading them.
              </li>
              <li>Show your own progress back to you.</li>
              <li>Take payment and manage your subscription.</li>
              <li>Reply to you if you contact us for support.</li>
              <li>Keep the service running and secure.</li>
            </ul>
            <p>
              We do not use your training data to train machine learning models, and we do
              not use it for advertising.
            </p>
          </section>

          <section id="who-we-share-with">
            <h2 className="text-xl font-bold text-white mb-4">4. WHO WE SHARE IT WITH</h2>
            <p className="mb-4">
              We do not sell your personal information, and we do not share it with anyone
              for their own marketing. We rely on a small number of service providers to
              run the app:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <strong className="text-white">Google</strong>: sign-in only. Google
                handles the authentication; we receive your email address and name.
              </li>
              <li>
                <strong className="text-white">Stripe</strong>: payment processing. You
                enter your card details directly with Stripe. We never see, receive or
                store them; we hold only the identifiers Stripe gives us.
              </li>
              <li>
                <strong className="text-white">Render</strong>: hosts our application
                servers and database, where your account and training data live.
              </li>
              <li>
                <strong className="text-white">Vercel</strong>: hosts the website itself.
              </li>
            </ul>
            <p>
              Each of these has its own privacy policy governing what it does with the data
              it processes on our behalf. We may also disclose information if we are
              legally required to, or where it is necessary to protect our rights or
              someone's safety.
            </p>
          </section>

          <section id="how-long">
            <h2 className="text-xl font-bold text-white mb-4">5. HOW LONG WE KEEP IT</h2>
            <p className="mb-4">
              We keep your account and training history for as long as your account exists,
              so that your logged sets and progress are still there if you stop training
              for a while and come back, including if your subscription lapses and you
              later resubscribe.
            </p>
            <p>
              If you ask us to delete your account, we delete it and the training data
              attached to it. We may keep a minimal billing record where tax or accounting
              law requires it.
            </p>
          </section>

          <section id="your-rights">
            <h2 className="text-xl font-bold text-white mb-4">6. YOUR RIGHTS</h2>
            <p className="mb-4">
              You can ask us to give you a copy of the personal data we hold about you, to
              correct it, or to delete it. Depending on where you live you may also have
              the right to object to or restrict certain processing, and to complain to
              your local data protection authority.
            </p>
            <p className="mb-4">
              Some of this you can do yourself in the app: your unit and timer preferences
              are editable in the menu, and you can delete individual training blocks and
              custom exercises as you go.
            </p>
            <p>
              <strong className="text-white">
                Account deletion and a full copy of your data are handled by email rather
                than a button.
              </strong>{' '}
              Write to{' '}
              <a
                href="mailto:strengthguider@gmail.com"
                className="text-teal-400 hover:text-teal-300 transition-colors"
              >
                strengthguider@gmail.com
              </a>{' '}
              from the address on your account and we will action it. We are working on
              making both self-service.
            </p>
          </section>

          <section id="security">
            <h2 className="text-xl font-bold text-white mb-4">7. SECURITY</h2>
            <p className="mb-4">
              Traffic to and from the site is encrypted in transit. Sign-in is handled by
              Google rather than by a password we store, and sign-out invalidates the
              tokens on your account rather than simply forgetting them on your device.
              Access to another account's data is refused by the server, not merely hidden
              in the interface.
            </p>
            <p>
              No service can promise perfect security, and we will not pretend otherwise.
              If we ever become aware of a breach affecting your data, we will tell you.
            </p>
          </section>

          <section id="children">
            <h2 className="text-xl font-bold text-white mb-4">8. CHILDREN</h2>
            <p>
              Strength Guider is not intended for children under 13, and we do not
              knowingly collect their personal information. If you believe a child has
              given us their data, contact us and we will delete it.
            </p>
          </section>

          <section id="international">
            <h2 className="text-xl font-bold text-white mb-4">9. WHERE YOUR DATA IS HELD</h2>
            <p>
              Our servers and service providers are based in the United States, so if you
              use Strength Guider from elsewhere your information is transferred to and
              processed there.
            </p>
          </section>

          <section id="changes">
            <h2 className="text-xl font-bold text-white mb-4">10. CHANGES</h2>
            <p>
              If this policy changes we will update the date at the top of this page. If a
              change materially affects how we handle your data, we will make it obvious
              rather than quietly editing this page.
            </p>
          </section>

          <section id="contact">
            <h2 className="text-xl font-bold text-white mb-4">11. CONTACT</h2>
            <p>
              Questions about this policy, or about the data we hold on you, go to{' '}
              <a
                href="mailto:strengthguider@gmail.com"
                className="text-teal-400 hover:text-teal-300 transition-colors"
              >
                strengthguider@gmail.com
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700">
          <Link to="/terms" className="text-teal-400 hover:text-teal-300 transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </main>
  );
}
