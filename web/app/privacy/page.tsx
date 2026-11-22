import type { Metadata } from 'next';
import { getBootstrap } from '@/lib/supabase';
import s from '../legal.module.css';
import WhatsAppFab from '@/components/WhatsAppFab';
import { getLang } from '@/lib/lang';

export const metadata: Metadata = {
  title: 'Privacy Policy — Timetoshoot',
  description:
    'What Timetoshoot collects when you book a memory film, why, where it is kept, and how to have it deleted.',
  alternates: { canonical: '/privacy' },
};

export const revalidate = 3600;

export default async function PrivacyPage() {
  const [{ data }, lang] = await Promise.all([getBootstrap(), getLang()]);
  const link = String(data.config.whatsapp_link ?? '');
  const num = String(data.config.whatsapp_number ?? '917448326503').replace(/[^0-9]/g, '');
  const wa = /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(link) ? link : `https://wa.me/${num}`;

  return (
    <div className={s.page}>
      <header className={s.phead}>
        <div className={s.wrap + " " + s.hrow}>
          <a className={s.brand} href="/"><span className={s.dot} /><span>TIMETOSHOOT</span></a>
          <a className={s.back} href="/">&larr; Back to site</a>
        </div>
      </header>

      <main className={s.wrap}>
        <h1>Privacy Policy</h1>
        <p className={s.updated}>Last updated: 15 November 2026</p>
      
        <p className={s.lead}>
          Timetoshoot makes short memory films from photos and videos you send us.
          This page explains exactly what we collect when you book, why we collect
          it, where it is kept, and how to have it removed. It is written in plain
          language on purpose.
        </p>
      
        <div className={s.box}>
          <p><strong>The short version.</strong> We collect your name and WhatsApp
          number so we can talk to you about your film, plus the details of the
          booking you made. We do not sell your information, and we do not share it
          with anyone who is not helping us make or deliver your film.</p>
        </div>
      
        <h2>What we collect when you book</h2>
        <p>The booking form on this site asks for, and records:</p>
      
        <table><tbody>
          <tr><th>What</th><th>Why</th></tr>
          <tr><td>Your name</td><td>So we know who we are speaking to</td></tr>
          <tr><td>Your WhatsApp number</td><td>To confirm your booking and send your film</td></tr>
          <tr><td>Occasion and, if you give one, the date of that occasion</td><td>To shape the film and make sure it is ready in time</td></tr>
          <tr><td>The film length you choose</td><td>To price the work before we talk</td></tr>
            <tr><td>Language you used the site in</td><td>So we reply in the same language</td></tr>
        </tbody></table>
      
        <p>
          <strong>We record this as you go, not only when you press the button.</strong>
          If you type your name and number and then leave without finishing, we
          still have them, and we may message you on WhatsApp about the film you
          were looking at. If you would rather we did not, tell us and we will
          delete the record.
        </p>

        <p>
          The form says, on the step where you give your number and again before
          you send it, that continuing means you agree to be contacted on
          WhatsApp about your film. Pressing the button is that agreement.
        </p>
      
        <h2>Information about how you arrived</h2>
        <p>
          If you reached this site from an advertisement, the link usually carries
          campaign information. We record it with your booking so we know which
          advertisement brought you here. This is campaign information, not personal
          information: typically a campaign name, an advertisement id and a click
          identifier supplied by the advertising platform.
        </p>
      
        <h2>Anonymous usage counts</h2>
        <p>
          We count how far visitors get through the booking form, so we can see where
          people give up and fix it. These counts record a random session code that
          changes every visit, which step was reached, and the language. They carry
          <strong>no name, no number and nothing that identifies you</strong>.
        </p>
      
        <h2>Advertising measurement</h2>
        <p>
          When advertising is running, this site may load the Meta Pixel. It tells
          Meta that a visit or a booking happened, so the advertising can be measured
          and improved. Meta handles that information under its own privacy policy.
          The Pixel does not receive your name or your phone number from us.
        </p>
      
        <h2>The photos and videos you send</h2>
        <p>
          Photos and videos are <strong>not uploaded on this website</strong>. You
          send them to us on WhatsApp after we confirm your booking, so they travel
          through WhatsApp, under WhatsApp's own privacy terms.
        </p>
        <p>
          We use what you send only to make your film. <strong>We will never post
          your photos, your film, or your family publicly without asking you first
          and getting a clear yes.</strong>
        </p>
      
        <h2>Where your information is kept</h2>
        <p>
          Bookings are stored in a private database belonging to Timetoshoot,
          hosted by Supabase on servers in Mumbai, India. Access is limited to the
          people at Timetoshoot who need it to make and deliver your film: the
          website itself cannot read the table, only add to it. The site is hosted
          by Vercel. We do not store your information anywhere else, and this site
          has no account for you to create and no password of yours to lose.
        </p>
      
        <h2>How long we keep it</h2>
        <p>
          We keep booking records while we are working on your film and afterwards
          as a record of the work, so we can help you if you come back.
        </p>
        <p>
          <strong>You can ask us to delete your details at any time</strong> and we
          will remove them, unless we are required to keep a record of a payment.
        </p>
      
        <h2>What we never do</h2>
        <ul>
          <li>We do not sell your information to anyone.</li>
          <li>We do not pass your number to other businesses or to marketing lists.</li>
          <li>We do not send you unrelated promotional messages because you booked once.</li>
          <li>We do not ask for payment details on this website.</li>
        </ul>
      
        <h2>Your choices</h2>
        <p>You can ask us, on WhatsApp, to:</p>
        <ul>
          <li>tell you what we hold about you</li>
          <li>correct anything that is wrong</li>
          <li>delete your details</li>
          <li>stop contacting you</li>
        </ul>
        <p>We will do it, and we will not make it difficult.</p>
      
        <h2>Children</h2>
        <p>
          This service is meant for adults booking films, often about their families.
          We do not knowingly take bookings from anyone under 18.
        </p>
      
        <h2>Changes to this policy</h2>
        <p>
          If we change how we handle your information, we will update this page and
          change the date at the top.
        </p>
      
        <h2>Contact us</h2>
        <p>
          The fastest way to reach us is WhatsApp. Tell us what you would like us to
          do with your information and we will confirm once it is done.
        </p>
        <p><a className={s.btn} href={wa} target="_blank" rel="noopener">Message us on WhatsApp</a></p>
        <p style={{ marginTop: '18px' }}>
          Timetoshoot &middot; Tamil Nadu, India<br />
          Instagram: <a href="https://instagram.com/timetoshoot_" target="_blank" rel="noopener">@timetoshoot_</a>
        </p>
      </main>

      <footer className={s.pfoot}>
        <div className={s.wrap}>
          <p style={{ margin: '0 0 6px' }}><a href="/">&larr; Back to Timetoshoot</a></p>
          <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} Timetoshoot. All rights reserved.</p>
        </div>
      </footer>
      <WhatsAppFab lang={lang}
                   number={String(data.config.whatsapp_number ?? '')}
                   link={String(data.config.whatsapp_link ?? '')} />
    </div>
  );
}
