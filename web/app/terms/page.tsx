import type { Metadata } from 'next';
import { getBootstrap } from '@/lib/supabase';
import { getLang } from '@/lib/lang';
import LegalShell from '@/components/LegalShell';
import { BUSINESS } from '@/lib/business';
import s from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Terms & Conditions — Timetoshoot',
  description:
    'What you get when you book a memory film from Timetoshoot, what we need from you, how long it takes, and where we stand if something goes wrong.',
  alternates: { canonical: '/terms' },
};

export const revalidate = 3600;

export default async function TermsPage() {
  const [{ data }, lang] = await Promise.all([getBootstrap(), getLang()]);
  const B = BUSINESS;

  return (
    <LegalShell title="Terms & Conditions" updated={B.updated} here="/terms" lang={lang}
                whatsappNumber={String(data.config.whatsapp_number ?? '')}
                whatsappLink={String(data.config.whatsapp_link ?? '')}>
      <p className={s.lead}>
        These terms apply when you book a memory film from Timetoshoot. Paying the
        ₹{B.bookingFee} booking fee means you accept them.
      </p>

      <div className={s.box}>
        <p><strong>In short.</strong> You send photos, we make a short film from
        them. ₹{B.bookingFee} holds your slot and comes off the price. Half the
        balance is paid before we start, the rest when the film is ready. It takes
        about {B.deliveryDays} working days once we have everything from you.</p>
      </div>

      <h2>Who you are dealing with</h2>
      <p>
        Timetoshoot is run by an individual proprietor based in {B.address.city},
        {' '}{B.address.state}. It is not a separately registered company, and we do
        not claim to be one. Our full contact details are on the{' '}
        <a href="/contact">Contact page</a>.
      </p>

      <h2>What we make</h2>
      <p>
        You send us photographs. We turn them into a short film — between 30 seconds
        and 5 minutes, depending on the plan you choose. Every plan&rsquo;s price is
        shown on the booking page before you pay anything.
      </p>
      <p>
        We work with the photographs you give us. We improve what can be improved,
        but we cannot add detail a photograph does not contain. A blurred, very
        small or damaged photograph will look blurred, small or damaged in the film.
      </p>

      <h2>How a booking works</h2>
      <table><tbody>
        <tr><th>Step</th><th>What happens</th></tr>
        <tr><td>1</td><td>You choose a plan and pay ₹{B.bookingFee}. Your slot is held. The fee is <strong>not refundable</strong>, and it comes off the price of your film.</td></tr>
        <tr><td>2</td><td>We message you on WhatsApp to collect your photographs and understand the occasion.</td></tr>
        <tr><td>3</td><td>You pay 50% of the remaining amount as an advance.</td></tr>
        <tr><td>4</td><td>We prepare a <strong>storyboard</strong> — the plan of your film — and send it to you for approval.</td></tr>
        <tr><td>5</td><td>We make the film and send it to you to watch.</td></tr>
        <tr><td>6</td><td>You pay the remaining amount and we send you the final file.</td></tr>
      </tbody></table>
      <p>
        The storyboard matters for more than the film. It is the point after which
        the advance can no longer be refunded, so we always tell you clearly when
        it is on its way. The <a href="/refunds">Refunds &amp; Cancellation page</a>{' '}
        sets this out in full.
      </p>

      <h2>What we need from you</h2>
      <ul>
        <li>The photographs, as clear as you have them.</li>
        <li>The names, dates and words you want to appear.</li>
        <li>Your approval of the storyboard, so we can start making the film.</li>
      </ul>
      <p>
        <strong>The photographs must be yours to share.</strong> By sending them you
        confirm you have the right to use them, and that the people in them do not
        object to being in your film.
      </p>

      <h2>How long it takes</h2>
      <p>
        Your film is ready within <strong>{B.deliveryDays} working days</strong> of
        us having everything: all the photographs, all the details, and your
        approval of the storyboard. If any of those arrive late, the date moves by
        the same amount. We will tell you if it does.
      </p>

      <h2>Changes to the film</h2>
      <p>
        Every plan includes <strong>{B.revisions} rounds of changes</strong> after
        you see the first version. A round of changes means corrections — a name
        spelled wrong, a photograph in the wrong place, a date to fix, music to
        swap.
      </p>
      <p>
        Rebuilding the film around a different idea is not a correction. It is new
        work, and we will quote it before doing anything.
      </p>

      <h2>Your photographs, and your film</h2>
      <p>
        Your photographs remain yours. We keep them only while we are working on
        your film and for 30 days afterwards, then delete them. The{' '}
        <a href="/privacy">Privacy Policy</a> explains this in detail.
      </p>
      <p>
        <strong>We will not show your film or your photographs to anyone without
        asking you first.</strong> If we would like to use your film as an example
        of our work, we will ask, and you are free to say no. Saying no changes
        nothing about your booking.
      </p>

      <h2>Payments</h2>
      <p>
        Payments are handled by Razorpay. We never see or store your card, UPI or
        bank details — they go straight to Razorpay. All prices are in Indian
        Rupees and include everything; there are no charges added later.
      </p>

      <h2>Where we stand</h2>
      <p>
        We make every film with care. What we cannot promise is a particular
        reaction to it — taste is personal, and a memory film is a personal thing.
      </p>
      <p>
        If something does go wrong on our side, what we owe you is limited to the
        amount you have paid us for that film. We are not liable for anything
        beyond that.
      </p>

      <h2>If you break these terms</h2>
      <p>
        We may stop work and cancel a booking if the photographs sent to us are not
        yours to use, or if what you ask us to make is unlawful or would harm
        someone. In that case we refund whatever has not already been worked on.
      </p>

      <h2>Law</h2>
      <p>
        These terms are governed by the laws of India. Any dispute arising from
        them goes to the courts of {B.address.state}.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update this page. The date at the top tells you when it last
        changed. The terms that apply to your booking are the ones that were on
        this page on the day you paid your booking fee.
      </p>

      <h2>Questions</h2>
      <p>
        WhatsApp is the fastest way to reach us. Everything else is on the{' '}
        <a href="/contact">Contact page</a>.
      </p>
    </LegalShell>
  );
}
