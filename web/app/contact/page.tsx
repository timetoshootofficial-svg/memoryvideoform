import type { Metadata } from 'next';
import { getBootstrap } from '@/lib/supabase';
import { getLang } from '@/lib/lang';
import LegalShell from '@/components/LegalShell';
import { BUSINESS, phoneDisplay, addressLines } from '@/lib/business';
import s from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Contact Us — Timetoshoot',
  description:
    'Reach Timetoshoot on WhatsApp or by phone. Our address in Chennai, the hours we answer, and how to ask about an existing booking.',
  alternates: { canonical: '/contact' },
};

export const revalidate = 3600;

export default async function ContactPage() {
  const [{ data }, lang] = await Promise.all([getBootstrap(), getLang()]);
  const B = BUSINESS;
  const link = String(data.config.whatsapp_link ?? '');
  const num = String(data.config.whatsapp_number ?? B.whatsapp).replace(/[^0-9]/g, '');
  const wa = /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(link) ? link : `https://wa.me/${num}`;
  const ig = String(data.config.instagram_handle ?? 'timetoshoot_');

  return (
    <LegalShell title="Contact Us" here="/contact" lang={lang}
                whatsappNumber={String(data.config.whatsapp_number ?? '')}
                whatsappLink={link}>
      <p className={s.lead}>
        A real person reads these. WhatsApp is the fastest way to reach us, and
        the one we check all day.
      </p>

      <div className={s.card}>
        <div className={s.row}>
          <div className={s.rowk}>WhatsApp</div>
          <div className={s.rowv}>
            <a href={wa} target="_blank" rel="noopener">{phoneDisplay()}</a>
          </div>
        </div>
        <div className={s.row}>
          <div className={s.rowk}>Phone</div>
          <div className={s.rowv}><a href={`tel:+91${B.phone}`}>{phoneDisplay()}</a></div>
        </div>
        <div className={s.row}>
          <div className={s.rowk}>Email</div>
          <div className={s.rowv}><a href={`mailto:${B.email}`}>{B.email}</a></div>
        </div>
        <div className={s.row}>
          <div className={s.rowk}>Instagram</div>
          <div className={s.rowv}>
            <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener">@{ig}</a>
          </div>
        </div>
        <div className={s.row}>
          <div className={s.rowk}>Hours</div>
          <div className={s.rowv}>{B.hours}</div>
        </div>
        <div className={s.row}>
          <div className={s.rowk}>Address</div>
          <div className={s.rowv}>
            <address className={s.addr}>
              {B.tradingName}<br />
              {addressLines().map((l) => <span key={l}>{l}<br /></span>)}
            </address>
          </div>
        </div>
      </div>

      <p><a className={s.btn} href={wa} target="_blank" rel="noopener">Message us on WhatsApp</a></p>

      <h2>About an existing booking</h2>
      <p>
        Send us your booking reference — it looks like TTS-0042 and we give it to
        you when you book. With that we can see your order straight away, which
        saves you explaining it twice.
      </p>

      <h2>Cancelling, or asking for a refund</h2>
      <p>
        Message us on WhatsApp and say so. We reply the same day. What can be
        refunded, and until when, is set out on the{' '}
        <a href="/refunds">Refunds &amp; Cancellation page</a>.
      </p>

      <h2>Who we are</h2>
      <p>
        Timetoshoot makes short memory films from photographs families already
        have. It is run by an individual proprietor in {B.address.city},{' '}
        {B.address.state} — not a separately registered company.
      </p>
    </LegalShell>
  );
}
