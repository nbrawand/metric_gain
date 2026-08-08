import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../utils/pageMeta';

export default function Terms() {

  usePageMeta({
    title: 'Terms of Service | Strength Guider',
    description: 'The terms you agree to when using Strength Guider.',
    path: '/terms',
  });
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

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-gray-400 mb-10">Last updated: March 22, 2026</p>

        <div className="space-y-10 text-gray-300 leading-relaxed">
          {/* AGREEMENT */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">AGREEMENT TO OUR LEGAL TERMS</h2>
            <p className="mb-4">
              We are Strength Guider ("<strong className="text-white">Company</strong>," "<strong className="text-white">we</strong>," "<strong className="text-white">us</strong>," "<strong className="text-white">our</strong>").
            </p>
            <p className="mb-4">
              We operate the website{' '}
              <a href="https://strengthguider.com" className="text-teal-400 hover:text-teal-300 transition-colors">
                strengthguider.com
              </a>{' '}
              (the "<strong className="text-white">Site</strong>"), as well as any other related products and services that refer or link to these legal terms (the "<strong className="text-white">Legal Terms</strong>") (collectively, the "<strong className="text-white">Services</strong>").
            </p>
            <p className="mb-4">
              These Legal Terms constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("<strong className="text-white">you</strong>"), concerning your access to and use of the Services. You agree that by accessing the Services, you have read, understood, and agreed to be bound by all of these Legal Terms. IF YOU DO NOT AGREE WITH ALL OF THESE LEGAL TERMS, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SERVICES AND YOU MUST DISCONTINUE USE IMMEDIATELY.
            </p>
            <p className="mb-4">
              We will provide you with prior notice of any scheduled changes to the Services you are using. The modified Legal Terms will become effective upon posting or notifying you by strengthguider@gmail.com, as stated in the email message. By continuing to use the Services after the effective date of any changes, you agree to be bound by the modified terms.
            </p>
            <p className="mb-4">
              The Services are intended for users who are at least 18 years old. Persons under the age of 18 are not permitted to use or register for the Services.
            </p>
            <p>
              We recommend that you print a copy of these Legal Terms for your records.
            </p>
          </section>

          {/* TABLE OF CONTENTS */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">TABLE OF CONTENTS</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li><a href="#services" className="text-teal-400 hover:text-teal-300 transition-colors">OUR SERVICES</a></li>
              <li><a href="#ip" className="text-teal-400 hover:text-teal-300 transition-colors">INTELLECTUAL PROPERTY RIGHTS</a></li>
              <li><a href="#userreps" className="text-teal-400 hover:text-teal-300 transition-colors">USER REPRESENTATIONS</a></li>
              <li><a href="#userreg" className="text-teal-400 hover:text-teal-300 transition-colors">USER REGISTRATION</a></li>
              <li><a href="#subscriptions" className="text-teal-400 hover:text-teal-300 transition-colors">SUBSCRIPTIONS</a></li>
              <li><a href="#prohibited" className="text-teal-400 hover:text-teal-300 transition-colors">PROHIBITED ACTIVITIES</a></li>
              <li><a href="#ugc" className="text-teal-400 hover:text-teal-300 transition-colors">USER GENERATED CONTRIBUTIONS</a></li>
              <li><a href="#license" className="text-teal-400 hover:text-teal-300 transition-colors">CONTRIBUTION LICENSE</a></li>
              <li><a href="#reviews" className="text-teal-400 hover:text-teal-300 transition-colors">GUIDELINES FOR REVIEWS</a></li>
              <li><a href="#socialmedia" className="text-teal-400 hover:text-teal-300 transition-colors">SOCIAL MEDIA</a></li>
              <li><a href="#thirdparty" className="text-teal-400 hover:text-teal-300 transition-colors">THIRD-PARTY WEBSITES AND CONTENT</a></li>
              <li><a href="#sitemanage" className="text-teal-400 hover:text-teal-300 transition-colors">SERVICES MANAGEMENT</a></li>
              <li><a href="#privacy" className="text-teal-400 hover:text-teal-300 transition-colors">PRIVACY POLICY</a></li>
              <li><a href="#copyrightno" className="text-teal-400 hover:text-teal-300 transition-colors">COPYRIGHT INFRINGEMENTS</a></li>
              <li><a href="#terms" className="text-teal-400 hover:text-teal-300 transition-colors">TERM AND TERMINATION</a></li>
              <li><a href="#modifications" className="text-teal-400 hover:text-teal-300 transition-colors">MODIFICATIONS AND INTERRUPTIONS</a></li>
              <li><a href="#law" className="text-teal-400 hover:text-teal-300 transition-colors">GOVERNING LAW</a></li>
              <li><a href="#disputes" className="text-teal-400 hover:text-teal-300 transition-colors">DISPUTE RESOLUTION</a></li>
              <li><a href="#corrections" className="text-teal-400 hover:text-teal-300 transition-colors">CORRECTIONS</a></li>
              <li><a href="#disclaimer" className="text-teal-400 hover:text-teal-300 transition-colors">DISCLAIMER</a></li>
              <li><a href="#liability" className="text-teal-400 hover:text-teal-300 transition-colors">LIMITATIONS OF LIABILITY</a></li>
              <li><a href="#indemnification" className="text-teal-400 hover:text-teal-300 transition-colors">INDEMNIFICATION</a></li>
              <li><a href="#userdata" className="text-teal-400 hover:text-teal-300 transition-colors">USER DATA</a></li>
              <li><a href="#electronic" className="text-teal-400 hover:text-teal-300 transition-colors">ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES</a></li>
              <li><a href="#california" className="text-teal-400 hover:text-teal-300 transition-colors">CALIFORNIA USERS AND RESIDENTS</a></li>
              <li><a href="#misc" className="text-teal-400 hover:text-teal-300 transition-colors">MISCELLANEOUS</a></li>
              <li><a href="#contact" className="text-teal-400 hover:text-teal-300 transition-colors">CONTACT US</a></li>
            </ol>
          </section>

          {/* 1. OUR SERVICES */}
          <section id="services">
            <h2 className="text-xl font-bold text-white mb-4">1. OUR SERVICES</h2>
            <p className="mb-4">
              The information provided when using the Services is not intended for distribution to or use by any person or entity in any jurisdiction or country where such distribution or use would be contrary to law or regulation or which would subject us to any registration requirement within such jurisdiction or country. Accordingly, those persons who choose to access the Services from other locations do so on their own initiative and are solely responsible for compliance with local laws, if and to the extent local laws are applicable.
            </p>
            <p>
              The Services are not tailored to comply with industry-specific regulations (Health Insurance Portability and Accountability Act (HIPAA), Federal Information Security Management Act (FISMA), etc.), so if your interactions would be subjected to such laws, you may not use the Services. You may not use the Services in a way that would violate the Gramm-Leach-Bliley Act (GLBA).
            </p>
          </section>

          {/* 2. INTELLECTUAL PROPERTY RIGHTS */}
          <section id="ip">
            <h2 className="text-xl font-bold text-white mb-4">2. INTELLECTUAL PROPERTY RIGHTS</h2>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Our intellectual property</h3>
            <p className="mb-4">
              We are the owner or the licensee of all intellectual property rights in our Services, including all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics in the Services (collectively, the "Content"), as well as the trademarks, service marks, and logos contained therein (the "Marks").
            </p>
            <p className="mb-4">
              Our Content and Marks are protected by copyright and trademark laws (and various other intellectual property rights and unfair competition laws) and treaties in the United States and around the world.
            </p>
            <p>
              The Content and Marks are provided in or through the Services "AS IS" for your personal, non-commercial use or internal business purpose only.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Your use of our Services</h3>
            <p className="mb-4">
              Subject to your compliance with these Legal Terms, including the "<a href="#prohibited" className="text-teal-400 hover:text-teal-300 transition-colors">PROHIBITED ACTIVITIES</a>" section below, we grant you a non-exclusive, non-transferable, revocable license to:
            </p>
            <ul className="list-disc list-inside space-y-1 mb-4">
              <li>access the Services; and</li>
              <li>download or print a copy of any portion of the Content to which you have properly gained access,</li>
            </ul>
            <p className="mb-4">
              solely for your personal, non-commercial use or internal business purpose.
            </p>
            <p className="mb-4">
              Except as set out in this section or elsewhere in our Legal Terms, no part of the Services and no Content or Marks may be copied, reproduced, aggregated, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted, distributed, sold, licensed, or otherwise exploited for any commercial purpose whatsoever, without our express prior written permission.
            </p>
            <p>
              If you wish to make any use of the Services, Content, or Marks other than as set out in this section or elsewhere in our Legal Terms, please address your request to: strengthguider@gmail.com. If we ever grant you the permission to post, reproduce, or publicly display any part of our Services or Content, you must identify us as the owners or licensors of the Services, Content, or Marks and ensure that any copyright or proprietary notice appears or is visible on posting, reproducing, or displaying our Content.
            </p>
            <p className="mt-4">
              We reserve all rights not expressly granted to you in and to the Services, Content, and Marks.
            </p>
            <p className="mt-4">
              Any breach of these Intellectual Property Rights will constitute a material breach of our Legal Terms and your right to use our Services will terminate immediately.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Your submissions and contributions</h3>
            <p className="mb-4">
              Please review this section and the "<a href="#prohibited" className="text-teal-400 hover:text-teal-300 transition-colors">PROHIBITED ACTIVITIES</a>" section carefully prior to using our Services to understand the (a) rights you give us and (b) obligations you have when you post or upload any content through the Services.
            </p>
            <p className="mb-4">
              <strong className="text-white">Submissions:</strong> By directly sending us any question, comment, suggestion, idea, feedback, or other information about the Services ("Submissions"), you agree to assign to us all intellectual property rights in such Submission. You agree that we shall own this Submission and be entitled to its unrestricted use and dissemination for any lawful purpose, commercial or otherwise, without acknowledgment or compensation to you.
            </p>
            <p className="mb-4">
              <strong className="text-white">Contributions:</strong> The Services may invite you to chat, contribute to, or participate in blogs, message boards, online forums, and other functionality during which you may create, submit, post, display, transmit, publish, distribute, or broadcast content and materials to us or through the Services, including but not limited to text, writings, video, audio, photographs, music, graphics, comments, reviews, rating suggestions, personal information, or other material ("Contributions"). Any Submission that is publicly posted shall also be treated as a Contribution.
            </p>
            <p className="mb-4">
              You understand that Contributions may be viewable by other users of the Services and possibly through third-party websites.
            </p>
            <p className="mb-4">
              <strong className="text-white">When you post Contributions, you grant us a license (including use of your name, trademarks, and logos):</strong> By posting any Contributions, you grant us an unrestricted, unlimited, irrevocable, perpetual, non-exclusive, transferable, royalty-free, fully-paid, worldwide right, and license to: use, copy, reproduce, distribute, sell, resell, publish, broadcast, retitle, store, publicly perform, publicly display, reformat, translate, excerpt (in whole or in part), and exploit your Contributions (including, without limitation, your image, name, and voice) for any purpose, commercial, advertising, or otherwise, to prepare derivative works of, or incorporate into other works, your Contributions, and to sublicense the licenses granted in this section. Our use and distribution may occur in any media formats and through any media channels.
            </p>
            <p className="mb-4">
              This license includes our use of your name, company name, and franchise name, as applicable, and any of the trademarks, service marks, trade names, logos, and personal and commercial images you provide.
            </p>
            <p className="mb-4">
              <strong className="text-white">You are responsible for what you post or upload:</strong> By sending us Submissions and/or posting Contributions through any part of the Services or making Contributions accessible through the Services by linking your account through the Services to any of your social networking accounts, you:
            </p>
            <ul className="list-disc list-inside space-y-1 mb-4">
              <li>confirm that you have read and agree with our "<a href="#prohibited" className="text-teal-400 hover:text-teal-300 transition-colors">PROHIBITED ACTIVITIES</a>" and will not post, send, publish, upload, or transmit through the Services any Submission nor post any Contribution that is illegal, harassing, hateful, harmful, defamatory, obscene, bullying, abusive, discriminatory, threatening to any person or group, sexually explicit, false, inaccurate, deceitful, or misleading;</li>
              <li>to the extent permissible by applicable law, waive any and all moral rights to any such Submission and/or Contribution;</li>
              <li>warrant that any such Submission and/or Contributions are original to you or that you have the necessary rights and licenses to submit such Submissions and/or Contributions and that you have full authority to grant us the above-mentioned rights in relation to your Submissions and/or Contributions; and</li>
              <li>warrant and represent that your Submissions and/or Contributions do not constitute confidential information.</li>
            </ul>
            <p>
              You are solely responsible for your Submissions and/or Contributions and you expressly agree to reimburse us for any and all losses that we may suffer because of your breach of (a) this section, (b) any third party's intellectual property rights, or (c) applicable law.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Copyright infringement</h3>
            <p>
              We respect the intellectual property rights of others. If you believe that any material available on or through the Services infringes upon any copyright you own or control, please immediately refer to the "<a href="#copyrightno" className="text-teal-400 hover:text-teal-300 transition-colors">COPYRIGHT INFRINGEMENTS</a>" section below.
            </p>
          </section>

          {/* 3. USER REPRESENTATIONS */}
          <section id="userreps">
            <h2 className="text-xl font-bold text-white mb-4">3. USER REPRESENTATIONS</h2>
            <p className="mb-4">
              By using the Services, you represent and warrant that:
            </p>
            <ol className="list-decimal list-inside space-y-2 mb-4">
              <li>all registration information you submit will be true, accurate, current, and complete;</li>
              <li>you will maintain the accuracy of such information and promptly update such registration information as necessary;</li>
              <li>you have the legal capacity and you agree to comply with these Legal Terms;</li>
              <li>you are not a minor in the jurisdiction in which you reside;</li>
              <li>you will not access the Services through automated or non-human means, whether through a bot, script, or otherwise;</li>
              <li>you will not use the Services for any illegal or unauthorized purpose; and</li>
              <li>your use of the Services will not violate any applicable law or regulation.</li>
            </ol>
            <p>
              If you provide any information that is untrue, inaccurate, not current, or incomplete, we have the right to suspend or terminate your account and refuse any and all current or future use of the Services (or any portion thereof).
            </p>
          </section>

          {/* 4. USER REGISTRATION */}
          <section id="userreg">
            <h2 className="text-xl font-bold text-white mb-4">4. USER REGISTRATION</h2>
            <p>
              You may be required to sign in with a supported third-party account (currently Google) to use the Services. You are responsible for all use of your account and for maintaining the security of the third-party account you sign in with. We reserve the right to remove or reclaim a display name if we determine, in our sole discretion, that it is inappropriate, obscene, or otherwise objectionable.
            </p>
          </section>

          {/* 5. SUBSCRIPTIONS */}
          <section id="subscriptions">
            <h2 className="text-xl font-bold text-white mb-4">5. SUBSCRIPTIONS</h2>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Billing and Renewal</h3>
            <p className="mb-4">
              Your subscription will continue and automatically renew unless canceled. You consent to our charging your payment method on a recurring basis without requiring your prior approval for each recurring charge, until such time as you cancel the applicable order. The length of your billing cycle will depend on the type of subscription plan you choose when you subscribed to the Services.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Free Trial</h3>
            <p className="mb-4">
              We offer a 5-day free trial to new users who register with the Services. The account will be charged according to the user's chosen subscription at the end of the free trial.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Cancellation</h3>
            <p className="mb-4">
              All purchases are non-refundable. You can cancel your subscription at any time from the Manage Subscription button on your Home page. Your cancellation will take effect at the end of the current paid term. If you have any questions or are unsatisfied with our Services, please email us at{' '}
              <a href="mailto:strengthguider@gmail.com" className="text-teal-400 hover:text-teal-300 transition-colors">
                strengthguider@gmail.com
              </a>.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Fee Changes</h3>
            <p>
              We may, from time to time, make changes to the subscription fee and will communicate any price changes to you in accordance with applicable law.
            </p>
          </section>

          {/* 6. PROHIBITED ACTIVITIES */}
          <section id="prohibited">
            <h2 className="text-xl font-bold text-white mb-4">6. PROHIBITED ACTIVITIES</h2>
            <p className="mb-4">
              You may not access or use the Services for any purpose other than that for which we make the Services available. The Services may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.
            </p>
            <p className="mb-4">As a user of the Services, you agree not to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Systematically retrieve data or other content from the Services to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.</li>
              <li>Trick, defraud, or mislead us and other users, especially in any attempt to learn sensitive account information such as account credentials.</li>
              <li>Circumvent, disable, or otherwise interfere with security-related features of the Services, including features that prevent or restrict the use or copying of any Content or enforce limitations on the use of the Services and/or the Content contained therein.</li>
              <li>Disparage, tarnish, or otherwise harm, in our opinion, us and/or the Services.</li>
              <li>Use any information obtained from the Services in order to harass, abuse, or harm another person.</li>
              <li>Make improper use of our support services or submit false reports of abuse or misconduct.</li>
              <li>Use the Services in a manner inconsistent with any applicable laws or regulations.</li>
              <li>Engage in unauthorized framing of or linking to the Services.</li>
              <li>Upload or transmit (or attempt to upload or to transmit) viruses, Trojan horses, or other material, including excessive use of capital letters and spamming (continuous posting of repetitive text), that interferes with any party's uninterrupted use and enjoyment of the Services or modifies, impairs, disrupts, alters, or interferes with the use, features, functions, operation, or maintenance of the Services.</li>
              <li>Engage in any automated use of the system, such as using scripts to send comments or messages, or using any data mining, robots, or similar data gathering and extraction tools.</li>
              <li>Delete the copyright or other proprietary rights notice from any Content.</li>
              <li>Attempt to impersonate another user or person or use the username of another user.</li>
              <li>Upload or transmit (or attempt to upload or to transmit) any material that acts as a passive or active information collection or transmission mechanism, including without limitation, clear graphics interchange formats ("gifs"), 1x1 pixels, web bugs, cookies, or other similar devices (sometimes referred to as "spyware" or "passive collection mechanisms" or "pcms").</li>
              <li>Interfere with, disrupt, or create an undue burden on the Services or the networks or services connected to the Services.</li>
              <li>Harass, annoy, intimidate, or threaten any of our employees or agents engaged in providing any portion of the Services to you.</li>
              <li>Attempt to bypass any measures of the Services designed to prevent or restrict access to the Services, or any portion of the Services.</li>
              <li>Copy or adapt the Services' software, including but not limited to Flash, PHP, HTML, JavaScript, or other code.</li>
              <li>Except as permitted by applicable law, decipher, decompile, disassemble, or reverse engineer any of the software comprising or in any way making up a part of the Services.</li>
              <li>Except as may be the result of standard search engine or Internet browser usage, use, launch, develop, or distribute any automated system, including without limitation, any spider, robot, cheat utility, scraper, or offline reader that accesses the Services, or use or launch any unauthorized script or other software.</li>
              <li>Use a buying agent or purchasing agent to make purchases on the Services.</li>
              <li>Make any unauthorized use of the Services, including collecting usernames and/or email addresses of users by electronic or other means for the purpose of sending unsolicited email, or creating user accounts by automated means or under false pretenses.</li>
              <li>Use the Services as part of any effort to compete with us or otherwise use the Services and/or the Content for any revenue-generating endeavor or commercial enterprise.</li>
              <li>Sell or otherwise transfer your account.</li>
            </ul>
          </section>

          {/* 7. USER GENERATED CONTRIBUTIONS */}
          <section id="ugc">
            <h2 className="text-xl font-bold text-white mb-4">7. USER GENERATED CONTRIBUTIONS</h2>
            <p className="mb-4">
              The Services may invite you to chat, contribute to, or participate in blogs, message boards, online forums, and other functionality, and may provide you with the opportunity to create, submit, post, display, transmit, perform, publish, distribute, or broadcast content and materials to us or on the Services, including but not limited to text, writings, video, audio, photographs, graphics, comments, suggestions, or personal information or other material (collectively, "Contributions"). Contributions may be viewable by other users of the Services and through third-party websites. As such, any Contributions you transmit may be treated as non-confidential and non-proprietary.
            </p>
            <p className="mb-4">When you create or make available any Contributions, you thereby represent and warrant that:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>The creation, distribution, transmission, public display, or performance, and the accessing, downloading, or copying of your Contributions do not and will not infringe the proprietary rights, including but not limited to the copyright, patent, trademark, trade secret, or moral rights of any third party.</li>
              <li>You are the creator and owner of or have the necessary licenses, rights, consents, releases, and permissions to use and to authorize us, the Services, and other users of the Services to use your Contributions in any manner contemplated by the Services and these Legal Terms.</li>
              <li>You have the written consent, release, and/or permission of each and every identifiable individual person in your Contributions to use the name or likeness of each and every such identifiable individual person to enable inclusion and use of your Contributions in any manner contemplated by the Services and these Legal Terms.</li>
              <li>Your Contributions are not false, inaccurate, or misleading.</li>
              <li>Your Contributions are not unsolicited or unauthorized advertising, promotional materials, pyramid schemes, chain letters, spam, mass mailings, or other forms of solicitation.</li>
              <li>Your Contributions are not obscene, lewd, lascivious, filthy, violent, harassing, libelous, slanderous, or otherwise objectionable (as determined by us).</li>
              <li>Your Contributions do not ridicule, mock, disparage, intimidate, or abuse anyone.</li>
              <li>Your Contributions are not used to harass or threaten (in the legal sense of those terms) any other person and to promote violence against a specific person or class of people.</li>
              <li>Your Contributions do not violate any applicable law, regulation, or rule.</li>
              <li>Your Contributions do not violate the privacy or publicity rights of any third party.</li>
              <li>Your Contributions do not violate any applicable law concerning child pornography, or otherwise intended to protect the health or well-being of minors.</li>
              <li>Your Contributions do not include any offensive comments that are connected to race, national origin, gender, sexual preference, or physical handicap.</li>
              <li>Your Contributions do not otherwise violate, or link to material that violates, any provision of these Legal Terms, or any applicable law or regulation.</li>
            </ul>
            <p className="mt-4">
              Any use of the Services in violation of the foregoing violates these Legal Terms and may result in, among other things, termination or suspension of your rights to use the Services.
            </p>
          </section>

          {/* 8. CONTRIBUTION LICENSE */}
          <section id="license">
            <h2 className="text-xl font-bold text-white mb-4">8. CONTRIBUTION LICENSE</h2>
            <p className="mb-4">
              By posting your Contributions to any part of the Services or making Contributions accessible to the Services by linking your account from the Services to any of your social networking accounts, you automatically grant, and you represent and warrant that you have the right to grant, to us an unrestricted, unlimited, irrevocable, perpetual, non-exclusive, transferable, royalty-free, fully-paid, worldwide right, and license to host, use, copy, reproduce, disclose, sell, resell, publish, broadcast, retitle, archive, store, cache, publicly perform, publicly display, reformat, translate, transmit, excerpt (in whole or in part), and distribute such Contributions (including, without limitation, your image and voice) for any purpose, commercial, advertising, or otherwise, and to prepare derivative works of, or incorporate into other works, such Contributions, and grant and authorize sublicenses of the foregoing. The use and distribution may occur in any media formats and through any media channels.
            </p>
            <p className="mb-4">
              This license will apply to any form, media, or technology now known or hereafter developed, and includes our use of your name, company name, and franchise name, as applicable, and any of the trademarks, service marks, trade names, logos, and personal and commercial images you provide. You waive all moral rights in your Contributions, and you warrant that moral rights have not otherwise been asserted in your Contributions.
            </p>
            <p className="mb-4">
              We do not assert any ownership over your Contributions. You retain full ownership of all of your Contributions and any intellectual property rights or other proprietary rights associated with your Contributions. We are not liable for any statements or representations in your Contributions provided by you in any area on the Services. You are solely responsible for your Contributions to the Services and you expressly agree to exonerate us from any and all responsibility and to refrain from any legal action against us regarding your Contributions.
            </p>
            <p>
              We have the right, in our sole and absolute discretion, (1) to edit, redact, or otherwise change any Contributions; (2) to re-categorize any Contributions to place them in more appropriate locations on the Services; and (3) to pre-screen or delete any Contributions at any time and for any reason, without notice. We have no obligation to monitor your Contributions.
            </p>
          </section>

          {/* 9. GUIDELINES FOR REVIEWS */}
          <section id="reviews">
            <h2 className="text-xl font-bold text-white mb-4">9. GUIDELINES FOR REVIEWS</h2>
            <p className="mb-4">
              We may provide you areas on the Services to leave reviews or ratings. When posting a review, you must comply with the following criteria:
            </p>
            <ol className="list-decimal list-inside space-y-2 mb-4">
              <li>you should have firsthand experience with the person/entity being reviewed;</li>
              <li>your reviews should not contain offensive profanity, or abusive, racist, offensive, or hateful language;</li>
              <li>your reviews should not contain discriminatory references based on religion, race, gender, national origin, age, marital status, sexual orientation, or disability;</li>
              <li>your reviews should not contain references to illegal activity;</li>
              <li>you should not be affiliated with competitors if posting negative reviews;</li>
              <li>you should not make any conclusions as to the legality of conduct;</li>
              <li>you may not post any false or misleading statements; and</li>
              <li>you may not organize a campaign encouraging others to post reviews, whether positive or negative.</li>
            </ol>
            <p>
              We may accept, reject, or remove reviews in our sole discretion. We have absolutely no obligation to screen reviews or to delete reviews, even if anyone considers reviews objectionable or inaccurate. Reviews are not endorsed by us, and do not necessarily represent our opinions or the views of any of our affiliates or partners. We do not assume liability for any review or for any claims, liabilities, or losses resulting from any review. By posting a review, you hereby grant to us a perpetual, non-exclusive, worldwide, royalty-free, fully paid, assignable, and sublicensable right and license to reproduce, modify, translate, transmit by any means, display, perform, and/or distribute all content relating to review.
            </p>
          </section>

          {/* 10. SOCIAL MEDIA */}
          <section id="socialmedia">
            <h2 className="text-xl font-bold text-white mb-4">10. SOCIAL MEDIA</h2>
            <p className="mb-4">
              As part of the functionality of the Services, you may link your account with online accounts you have with third-party service providers (each such account, a "Third-Party Account") by authorizing us to access that account through the provider's own sign-in flow. We never receive or store your password for a Third-Party Account.
            </p>
            <p className="mb-4">
              You represent and warrant that you are entitled to grant us access to your Third-Party Account, without breach by you of any of the terms and conditions that govern your use of the applicable Third-Party Account, and without obligating us to pay any fees or making us subject to any usage limitations imposed by the third-party service provider of the Third-Party Account.
            </p>
            <p className="mb-4">
              By granting us access to any Third-Party Accounts, you understand that (1) we may access, make available, and store (if applicable) any content that you have provided to and stored in your Third-Party Account (the "Social Network Content") so that it is available on and through the Services via your account, including without limitation any friend lists; and (2) we may submit to and receive from your Third-Party Account additional information to the extent you are notified when you link your account with the Third-Party Account.
            </p>
            <p className="mb-4">
              Depending on the Third-Party Accounts you choose and subject to the privacy settings that you have set in such Third-Party Accounts, personally identifiable information that you post to your Third-Party Accounts may be available on and through your account on the Services. Please note that if a Third-Party Account or associated service becomes unavailable or our access to such Third-Party Account is terminated by the third-party service provider, then Social Network Content may no longer be available on and through the Services.
            </p>
            <p>
              You will have the ability to disable the connection between your account on the Services and your Third-Party Accounts at any time. PLEASE NOTE THAT YOUR RELATIONSHIP WITH THE THIRD-PARTY SERVICE PROVIDERS ASSOCIATED WITH YOUR THIRD-PARTY ACCOUNTS IS GOVERNED SOLELY BY YOUR AGREEMENT(S) WITH SUCH THIRD-PARTY SERVICE PROVIDERS. We make no effort to review any Social Network Content for any purpose, including but not limited to, for accuracy, legality, or non-infringement, and we are not responsible for any Social Network Content. You can deactivate the connection between the Services and your Third-Party Account by contacting us using the contact information below or through your account settings (if applicable). We will attempt to delete any information stored on our servers that was obtained through such Third-Party Account, except the username and profile picture that became associated with your account.
            </p>
          </section>

          {/* 11. THIRD-PARTY WEBSITES AND CONTENT */}
          <section id="thirdparty">
            <h2 className="text-xl font-bold text-white mb-4">11. THIRD-PARTY WEBSITES AND CONTENT</h2>
            <p className="mb-4">
              The Services may contain (or you may be sent via the Site) links to other websites ("Third-Party Websites") as well as articles, photographs, text, graphics, pictures, designs, music, sound, video, information, applications, software, and other content or items belonging to or originating from third parties ("Third-Party Content"). Such Third-Party Websites and Third-Party Content are not investigated, monitored, or checked for accuracy, appropriateness, or completeness by us, and we are not responsible for any Third-Party Websites accessed through the Services or any Third-Party Content posted on, available through, or installed from the Services, including the content, accuracy, offensiveness, opinions, reliability, privacy practices, or other policies of or contained in the Third-Party Websites or the Third-Party Content.
            </p>
            <p className="mb-4">
              Inclusion of, linking to, or permitting the use or installation of any Third-Party Websites or any Third-Party Content does not imply approval or endorsement thereof by us. If you decide to leave the Services and access the Third-Party Websites or to use or install any Third-Party Content, you do so at your own risk, and you should be aware these Legal Terms no longer govern. You should review the applicable terms and policies, including privacy and data gathering practices, of any website to which you navigate from the Services or relating to any applications you use or install from the Services. Any purchases you make through Third-Party Websites will be through other websites and from other companies, and we take no responsibility whatsoever in relation to such purchases which are exclusively between you and the applicable third party.
            </p>
            <p>
              You agree and acknowledge that we do not endorse the products or services offered on Third-Party Websites and you shall hold us blameless from any harm caused by your purchase of such products or services. Additionally, you shall hold us blameless from any losses sustained by you or harm caused to you relating to or resulting in any way from any Third-Party Content or any contact with Third-Party Websites.
            </p>
          </section>

          {/* 12. SERVICES MANAGEMENT */}
          <section id="sitemanage">
            <h2 className="text-xl font-bold text-white mb-4">12. SERVICES MANAGEMENT</h2>
            <p>
              We reserve the right, but not the obligation, to: (1) monitor the Services for violations of these Legal Terms; (2) take appropriate legal action against anyone who, in our sole discretion, violates the law or these Legal Terms, including without limitation, reporting such user to law enforcement authorities; (3) in our sole discretion and without limitation, refuse, restrict access to, limit the availability of, or disable (to the extent technologically feasible) any of your Contributions or any portion thereof; (4) in our sole discretion and without limitation, notice, or liability, to remove from the Services or otherwise disable all files and content that are excessive in size or are in any way burdensome to our systems; and (5) otherwise manage the Services in a manner designed to protect our rights and property and to facilitate the proper functioning of the Services.
            </p>
          </section>

          {/* 13. PRIVACY POLICY */}
          <section id="privacy">
            <h2 className="text-xl font-bold text-white mb-4">13. PRIVACY POLICY</h2>
            <p className="mb-4">
              We care about data privacy and security. By using the Services, you agree to be bound by the data handling described in these Terms, which is incorporated into these Legal Terms. Please be advised the Services are hosted in the United States. If you access the Services from any other region of the world with laws or other requirements governing personal data collection, use, or disclosure that differ from applicable laws in the United States, then through your continued use of the Services, you are transferring your data to the United States, and you expressly consent to have your data transferred to and processed in the United States.
            </p>
          </section>

          {/* 14. COPYRIGHT INFRINGEMENTS */}
          <section id="copyrightno">
            <h2 className="text-xl font-bold text-white mb-4">14. COPYRIGHT INFRINGEMENTS</h2>
            <p className="mb-4">
              We respect the intellectual property rights of others. If you believe that any material available on or through the Services infringes upon any copyright you own or control, please immediately notify us using the contact information provided below (a "Notification"). A copy of your Notification will be sent to the person who posted or stored the material addressed in the Notification. Please be advised that pursuant to applicable law you may be held liable for damages if you make material misrepresentations in a Notification. Thus, if you are not sure that material located on or linked to by the Services infringes your copyright, you should consider first contacting an attorney.
            </p>
          </section>

          {/* 15. TERM AND TERMINATION */}
          <section id="terms">
            <h2 className="text-xl font-bold text-white mb-4">15. TERM AND TERMINATION</h2>
            <p className="mb-4">
              These Legal Terms shall remain in full force and effect while you use the Services. WITHOUT LIMITING ANY OTHER PROVISION OF THESE LEGAL TERMS, WE RESERVE THE RIGHT TO, IN OUR SOLE DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS TO AND USE OF THE SERVICES (INCLUDING BLOCKING CERTAIN IP ADDRESSES), TO ANY PERSON FOR ANY REASON OR FOR NO REASON, INCLUDING WITHOUT LIMITATION FOR BREACH OF ANY REPRESENTATION, WARRANTY, OR COVENANT CONTAINED IN THESE LEGAL TERMS OR OF ANY APPLICABLE LAW OR REGULATION. WE MAY TERMINATE YOUR USE OR PARTICIPATION IN THE SERVICES OR DELETE YOUR ACCOUNT AND ANY CONTENT OR INFORMATION THAT YOU POSTED AT ANY TIME, WITHOUT WARNING, IN OUR SOLE DISCRETION.
            </p>
            <p>
              If we terminate or suspend your account for any reason, you are prohibited from registering and creating a new account under your name, a fake or borrowed name, or the name of any third party, even if you may be acting on behalf of the third party. In addition to terminating or suspending your account, we reserve the right to take appropriate legal action, including without limitation pursuing civil, criminal, and injunctive redress.
            </p>
          </section>

          {/* 16. MODIFICATIONS AND INTERRUPTIONS */}
          <section id="modifications">
            <h2 className="text-xl font-bold text-white mb-4">16. MODIFICATIONS AND INTERRUPTIONS</h2>
            <p className="mb-4">
              We reserve the right to change, modify, or remove the contents of the Services at any time or for any reason at our sole discretion without notice. However, we have no obligation to update any information on our Services. We will not be liable to you or any third party for any modification, price change, suspension, or discontinuance of the Services.
            </p>
            <p className="mb-4">
              We cannot guarantee the Services will be available at all times. We may experience hardware, software, or other problems or need to perform maintenance related to the Services, resulting in interruptions, delays, or errors. We reserve the right to change, revise, update, suspend, discontinue, or otherwise modify the Services at any time or for any reason without notice to you. You agree that we have no liability whatsoever for any loss, damage, or inconvenience caused by your inability to access or use the Services during any downtime or discontinuance of the Services.
            </p>
            <p>
              Nothing in these Legal Terms will be construed to obligate us to maintain and support the Services or to supply any corrections, updates, or releases in connection therewith.
            </p>
          </section>

          {/* 17. GOVERNING LAW */}
          <section id="law">
            <h2 className="text-xl font-bold text-white mb-4">17. GOVERNING LAW</h2>
            <p>
              These Legal Terms shall be governed by and defined following the laws of the State of Colorado. Strength Guider and yourself irrevocably consent that the courts of the State of Colorado shall have exclusive jurisdiction to resolve any dispute which may arise in connection with these Legal Terms.
            </p>
          </section>

          {/* 18. DISPUTE RESOLUTION */}
          <section id="disputes">
            <h2 className="text-xl font-bold text-white mb-4">18. DISPUTE RESOLUTION</h2>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Informal Negotiations</h3>
            <p className="mb-4">
              To expedite resolution and control the cost of any dispute, controversy, or claim related to these Legal Terms (each a "Dispute" and collectively, the "Disputes") brought by either you or us (individually, a "Party" and collectively, the "Parties"), the Parties agree to first attempt to negotiate any Dispute (except those Disputes expressly provided below) informally for at least thirty (30) days before initiating arbitration. Such informal negotiations commence upon written notice from one Party to the other Party.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Binding Arbitration</h3>
            <p className="mb-4">
              Any dispute arising out of or in connection with these Legal Terms, including any question regarding its existence, validity, or termination, shall be referred to and finally resolved by the International Commercial Arbitration Court under the European Arbitration Chamber (Belgium, Brussels, Avenue Louise, 146) according to the Rules of this ICAC, which, as a result of referring to it, is considered as the part of this clause. The number of arbitrators shall be two (2). The seat, or legal place, of arbitration shall be Douglas County, Colorado. The language of the proceedings shall be English. The governing law of these Legal Terms shall be the substantive law of the State of Colorado.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Restrictions</h3>
            <p className="mb-4">
              The Parties agree that any arbitration shall be limited to the Dispute between the Parties individually. To the full extent permitted by law, (a) no arbitration shall be joined with any other proceeding; (b) there is no right or authority for any Dispute to be arbitrated on a class-action basis or to utilize class action procedures; and (c) there is no right or authority for any Dispute to be brought in a purported representative capacity on behalf of the general public or any other persons.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">Exceptions to Informal Negotiations and Arbitration</h3>
            <p>
              The Parties agree that the following Disputes are not subject to the above provisions concerning informal negotiations and binding arbitration: (a) any Disputes seeking to enforce or protect, or concerning the validity of, any of the intellectual property rights of a Party; (b) any Dispute related to, or arising from, allegations of theft, piracy, invasion of privacy, or unauthorized use; and (c) any claim for injunctive relief. If this provision is found to be illegal or unenforceable, then neither Party will elect to arbitrate any Dispute falling within that portion of this provision found to be illegal or unenforceable and such Dispute shall be decided by a court of competent jurisdiction within the courts listed for jurisdiction above, and the Parties agree to submit to the personal jurisdiction of that court.
            </p>
          </section>

          {/* 19. CORRECTIONS */}
          <section id="corrections">
            <h2 className="text-xl font-bold text-white mb-4">19. CORRECTIONS</h2>
            <p>
              There may be information on the Services that contains typographical errors, inaccuracies, or omissions, including descriptions, pricing, availability, and various other information. We reserve the right to correct any errors, inaccuracies, or omissions and to change or update the information on the Services at any time, without prior notice.
            </p>
          </section>

          {/* 20. DISCLAIMER */}
          <section id="disclaimer">
            <h2 className="text-xl font-bold text-white mb-4">20. DISCLAIMER</h2>
            <p>
              THE SERVICES ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE SERVICES WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE SERVICES AND YOUR USE THEREOF, INCLUDING, WITHOUT LIMITATION, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE MAKE NO WARRANTIES OR REPRESENTATIONS ABOUT THE ACCURACY OR COMPLETENESS OF THE SERVICES' CONTENT OR THE CONTENT OF ANY WEBSITES OR MOBILE APPLICATIONS LINKED TO THE SERVICES AND WE WILL ASSUME NO LIABILITY OR RESPONSIBILITY FOR ANY (1) ERRORS, MISTAKES, OR INACCURACIES OF CONTENT AND MATERIALS, (2) PERSONAL INJURY OR PROPERTY DAMAGE, OF ANY NATURE WHATSOEVER, RESULTING FROM YOUR ACCESS TO AND USE OF THE SERVICES, (3) ANY UNAUTHORIZED ACCESS TO OR USE OF OUR SECURE SERVERS AND/OR ANY AND ALL PERSONAL INFORMATION AND/OR FINANCIAL INFORMATION STORED THEREIN, (4) ANY INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM THE SERVICES, (5) ANY BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE WHICH MAY BE TRANSMITTED TO OR THROUGH THE SERVICES BY ANY THIRD PARTY, AND/OR (6) ANY ERRORS OR OMISSIONS IN ANY CONTENT AND MATERIALS OR FOR ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF THE USE OF ANY CONTENT POSTED, TRANSMITTED, OR OTHERWISE MADE AVAILABLE VIA THE SERVICES. WE DO NOT WARRANT, ENDORSE, GUARANTEE, OR ASSUME RESPONSIBILITY FOR ANY PRODUCT OR SERVICE ADVERTISED OR OFFERED BY A THIRD PARTY THROUGH THE SERVICES, ANY HYPERLINKED WEBSITE, OR ANY WEBSITE OR MOBILE APPLICATION FEATURED IN ANY BANNER OR OTHER ADVERTISING, AND WE WILL NOT BE A PARTY TO OR IN ANY WAY BE RESPONSIBLE FOR MONITORING ANY TRANSACTION BETWEEN YOU AND ANY THIRD-PARTY PROVIDERS OF PRODUCTS OR SERVICES. AS WITH THE PURCHASE OF A PRODUCT OR SERVICE THROUGH ANY MEDIUM OR IN ANY ENVIRONMENT, YOU SHOULD USE YOUR BEST JUDGMENT AND EXERCISE CAUTION WHERE APPROPRIATE.
            </p>
          </section>

          {/* 21. LIMITATIONS OF LIABILITY */}
          <section id="liability">
            <h2 className="text-xl font-bold text-white mb-4">21. LIMITATIONS OF LIABILITY</h2>
            <p>
              IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. NOTWITHSTANDING ANYTHING TO THE CONTRARY CONTAINED HEREIN, OUR LIABILITY TO YOU FOR ANY CAUSE WHATSOEVER AND REGARDLESS OF THE FORM OF THE ACTION, WILL AT ALL TIMES BE LIMITED TO THE AMOUNT PAID, IF ANY, BY YOU TO US DURING THE SIX (6) MONTH PERIOD PRIOR TO ANY CAUSE OF ACTION ARISING. CERTAIN US STATE LAWS AND INTERNATIONAL LAWS DO NOT ALLOW LIMITATIONS ON IMPLIED WARRANTIES OR THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES. IF THESE LAWS APPLY TO YOU, SOME OR ALL OF THE ABOVE DISCLAIMERS OR LIMITATIONS MAY NOT APPLY TO YOU, AND YOU MAY HAVE ADDITIONAL RIGHTS.
            </p>
          </section>

          {/* 22. INDEMNIFICATION */}
          <section id="indemnification">
            <h2 className="text-xl font-bold text-white mb-4">22. INDEMNIFICATION</h2>
            <p>
              You agree to defend, indemnify, and hold us harmless, including our subsidiaries, affiliates, and all of our respective officers, agents, partners, and employees, from and against any loss, damage, liability, claim, or demand, including reasonable attorneys' fees and expenses, made by any third party due to or arising out of: (1) your Contributions; (2) use of the Services; (3) breach of these Legal Terms; (4) any breach of your representations and warranties set forth in these Legal Terms; (5) your violation of the rights of a third party, including but not limited to intellectual property rights; or (6) any overt harmful act toward any other user of the Services with whom you connected via the Services. Notwithstanding the foregoing, we reserve the right, at your expense, to assume the exclusive defense and control of any matter for which you are required to indemnify us, and you agree to cooperate, at your expense, with our defense of such claims. We will use reasonable efforts to notify you of any such claim, action, or proceeding which is subject to this indemnification upon becoming aware of it.
            </p>
          </section>

          {/* 23. USER DATA */}
          <section id="userdata">
            <h2 className="text-xl font-bold text-white mb-4">23. USER DATA</h2>
            <p>
              We will maintain certain data that you transmit to the Services for the purpose of managing the performance of the Services, as well as data relating to your use of the Services. Although we perform regular routine backups of data, you are solely responsible for all data that you transmit or that relates to any activity you have undertaken using the Services. You agree that we shall have no liability to you for any loss or corruption of any such data, and you hereby waive any right of action against us arising from any such loss or corruption of such data.
            </p>
          </section>

          {/* 24. ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES */}
          <section id="electronic">
            <h2 className="text-xl font-bold text-white mb-4">24. ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES</h2>
            <p>
              Visiting the Services, sending us emails, and completing online forms constitute electronic communications. You consent to receive electronic communications, and you agree that all agreements, notices, disclosures, and other communications we provide to you electronically, via email and on the Services, satisfy any legal requirement that such communication be in writing. YOU HEREBY AGREE TO THE USE OF ELECTRONIC SIGNATURES, CONTRACTS, ORDERS, AND OTHER RECORDS, AND TO ELECTRONIC DELIVERY OF NOTICES, POLICIES, AND RECORDS OF TRANSACTIONS INITIATED OR COMPLETED BY US OR VIA THE SERVICES. You hereby waive any rights or requirements under any statutes, regulations, rules, ordinances, or other laws in any jurisdiction which require an original signature or delivery or retention of non-electronic records, or to payments or the granting of credits by any means other than electronic means.
            </p>
          </section>

          {/* 25. CALIFORNIA USERS AND RESIDENTS */}
          <section id="california">
            <h2 className="text-xl font-bold text-white mb-4">25. CALIFORNIA USERS AND RESIDENTS</h2>
            <p>
              If any complaint with us is not satisfactorily resolved, you can contact the Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs in writing at 1625 North Market Blvd., Suite N 112, Sacramento, California 95834 or by telephone at (800) 952-5210 or (916) 445-1254.
            </p>
          </section>

          {/* 26. MISCELLANEOUS */}
          <section id="misc">
            <h2 className="text-xl font-bold text-white mb-4">26. MISCELLANEOUS</h2>
            <p>
              These Legal Terms and any policies or operating rules posted by us on the Services or in respect to the Services constitute the entire agreement and understanding between you and us. Our failure to exercise or enforce any right or provision of these Legal Terms shall not operate as a waiver of such right or provision. These Legal Terms operate to the fullest extent permissible by law. We may assign any or all of our rights and obligations to others at any time. We shall not be responsible or liable for any loss, damage, delay, or failure to act caused by any cause beyond our reasonable control. If any provision or part of a provision of these Legal Terms is determined to be unlawful, void, or unenforceable, that provision or part of the provision is deemed severable from these Legal Terms and does not affect the validity and enforceability of any remaining provisions. There is no joint venture, partnership, employment or agency relationship created between you and us as a result of these Legal Terms or use of the Services. You agree that these Legal Terms will not be construed against us by virtue of having drafted them. You hereby waive any and all defenses you may have based on the electronic form of these Legal Terms and the lack of signing by the parties hereto to execute these Legal Terms.
            </p>
          </section>

          {/* 27. CONTACT US */}
          <section id="contact">
            <h2 className="text-xl font-bold text-white mb-4">27. CONTACT US</h2>
            <p className="mb-4">
              In order to resolve a complaint regarding the Services or to receive further information regarding use of the Services, please contact us at:
            </p>
            <div className="space-y-1">
              <p>
                <a href="mailto:strengthguider@gmail.com" className="text-teal-400 hover:text-teal-300 transition-colors">
                  strengthguider@gmail.com
                </a>
              </p>
            </div>
          </section>
        </div>

        {/* Termly Attribution */}
        <div className="mt-16 pt-8 border-t border-gray-700 text-center">
          <p className="text-gray-500 text-xs">
            These Terms of Service were created using{' '}
            <a
              href="https://termly.io/products/terms-and-conditions-generator/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-400 hover:text-teal-300 transition-colors"
            >
              Termly's Terms and Conditions Generator
            </a>.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700">
          <Link to="/privacy" className="text-teal-400 hover:text-teal-300 transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </main>
  );
}
