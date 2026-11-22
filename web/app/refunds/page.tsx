import type { Metadata } from 'next';
import { getBootstrap } from '@/lib/supabase';
import { getLang } from '@/lib/lang';
import LegalShell from '@/components/LegalShell';
import { BUSINESS } from '@/lib/business';
import s from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Refunds & Cancellation — Timetoshoot',
  description:
    'When a Timetoshoot booking can be cancelled and refunded, the one point after which the advance cannot be returned, and how long a refund takes.',
  alternates: { canonical: '/refunds' },
};

export const revalidate = 3600;

export default async function RefundsPage() {
  const [{ data }, lang] = await Promise.all([getBootstrap(), getLang()]);
  const B = BUSINESS;
  const link = String(data.config.whatsapp_link ?? '');
  const num = String(data.config.whatsapp_number ?? B.whatsapp).replace(/[^0-9]/g, '');
  const wa = /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(link) ? link : `https://wa.me/${num}`;

  return (
    <LegalShell title="Refunds & Cancellation" updated={B.updated} here="/refunds" lang={lang}
                whatsappNumber={String(data.config.whatsapp_number ?? '')}
                whatsappLink={link}>
      <p className={s.lead}>
        One moment decides whether your advance comes back: the storyboard. Before
        we send it, you can cancel and be refunded in full. After we send it, the
        advance stays with us. Everything below is that rule, spelled out.
      </p>

      <div className={s.box}>
        <p><strong>The short version.</strong> The ₹{B.bookingFee} booking fee is
        not refundable — it comes off your final price instead. The 50% advance is
        fully refundable until we send your storyboard for approval, and not
        refundable after that.</p>
      </div>

      <h2>At a glance</h2>
      <table><tbody>
        <tr><th>What you paid</th><th>When you cancel</th><th>What comes back</th></tr>
        <tr>
          <td>₹{B.bookingFee} booking fee</td>
          <td>Any time</td>
          <td>Nothing — see below</td>
        </tr>
        <tr>
          <td>50% advance</td>
          <td><strong>Before</strong> we send the storyboard</td>
          <td>All of it</td>
        </tr>
        <tr>
          <td>50% advance</td>
          <td><strong>After</strong> we send the storyboard</td>
          <td>Nothing</td>
        </tr>
        <tr>
          <td>Anything you paid</td>
          <td>We cancel, for any reason of ours</td>
          <td>All of it, including the ₹{B.bookingFee}</td>
        </tr>
      </tbody></table>

      <h2>The ₹{B.bookingFee} booking fee</h2>
      <p>
        ₹{B.bookingFee} holds your slot. It is <strong>not refundable</strong>, and
        we say so on the page before you pay it.
      </p>
      <p>
        It is not an extra charge. It <strong>comes off the price of your
        film</strong> — on a ₹2,999 film you pay ₹{(2999 - B.bookingFee).toLocaleString('en-IN')}{' '}
        afterwards, not ₹2,999. If you go ahead with the film, the fee costs you
        nothing at all.
      </p>
      <p>
        We ask for it because a held slot is a slot nobody else can have. It is
        kept small on purpose.
      </p>

      <h2>The 50% advance</h2>
      <p>
        After we have spoken on WhatsApp about your film, you pay half of what is
        left as an advance. We start work once it arrives.
      </p>

      <h2>Before we send the storyboard — full refund</h2>
      <p>
        Change your mind for any reason, and we return the whole advance. You do
        not have to give us a reason. Message us on WhatsApp and we will confirm
        the same day.
      </p>

      <h2>After we send the storyboard — no refund</h2>
      <p>
        A storyboard is the plan of your film: which photographs are used, in what
        order, what is written on them, where the music turns. Writing it is the
        part that takes the thinking, and once it is done it cannot be undone.
      </p>
      <p>
        So from the moment we send your storyboard for approval, the advance is
        not refundable — whether or not you approve it, and whether or not we have
        started putting the film together.
      </p>
      <div className={s.box}>
        <p><strong>You will always know when this moment arrives.</strong> We tell
        you on WhatsApp that your storyboard is on its way, before we send it. If
        you are unsure about going ahead, that is the time to say so.</p>
      </div>

      <h2>If we cannot make your film</h2>
      <p>
        If we cancel — for any reason of our own — you get everything back,
        including the ₹{B.bookingFee} booking fee, within {B.refundDays}.
      </p>

      <h2>How a refund reaches you</h2>
      <p>
        Through Razorpay, back to the same UPI ID, card or account you paid from,
        within <strong>{B.refundDays}</strong> of us agreeing to it. We cannot send
        a refund anywhere other than where the payment came from — that is how the
        payment system works, and it is also what keeps your money safe.
      </p>

      <h2>How to ask for one</h2>
      <p>
        Message us on WhatsApp with your booking reference — it looks like
        TTS-0042 and we send it to you when you book. Tell us you would like to
        cancel. We reply the same day, within our hours ({B.hours}).
      </p>
      <p><a className={s.btn} href={wa} target="_blank" rel="noopener">Message us on WhatsApp</a></p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this page. The date at the top says when it last changed.
        The policy that applies to your booking is the one that was on this page
        on the day you paid.
      </p>
    </LegalShell>
  );
}
