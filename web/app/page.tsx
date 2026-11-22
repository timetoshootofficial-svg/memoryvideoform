import { getBootstrap } from '@/lib/supabase';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { availableLengths, basePrice } from '@/lib/logic';
import LangToggle from '@/components/LangToggle';
import Hero from '@/components/Hero';
import WorkMarquee from '@/components/WorkMarquee';
import Process from '@/components/Process';
import BookingForm from '@/components/booking/BookingForm';
import Reviews from '@/components/Reviews';
import Faq from '@/components/Faq';
import Footer from '@/components/Footer';
import { BUSINESS } from '@/lib/business';
import { razorpayConfigured } from '@/lib/razorpay';
import StickyCta from '@/components/StickyCta';
import WhatsAppFab from '@/components/WhatsAppFab';
import MetaPixel from '@/components/MetaPixel';

/* Prices and availability are fetched on the server and arrive inside the
   HTML. The static site had to ask for them after the page had painted,
   which is why the calendar used to appear a beat late. */
export const revalidate = 60;

export default async function Page() {
  const [lang, { data }] = await Promise.all([getLang(), getBootstrap()]);
  const t = makeT(lang);
  const c = data.config;

  /* The cheapest film on offer, read from config rather than written down,
     so the hero cannot drift away from what the form charges. */
  const priced = availableLengths(c).map((l) => basePrice(c, l)).filter((n) => n > 0);
  const fromPrice = priced.length ? Math.min(...priced) : 0;

  return (
    <>
      <header>
        <div className="wrap hrow">
          <div className="brand"><span className="dot" /><span>TIMETOSHOOT</span></div>
          <LangToggle lang={lang} />
        </div>
      </header>

      <main>
        <Hero t={t} lang={lang} clients={String(c.clients_count)} fromPrice={fromPrice} />
        <div className="strip" aria-hidden="true" />
        <WorkMarquee lang={lang} />
        <Process t={t} deliveryDays={Number(c.delivery_days) || BUSINESS.deliveryDays} />
        <BookingForm config={c} lang={lang}
                     payments={razorpayConfigured()}
                     fee={Number(c.booking_fee) || BUSINESS.bookingFee} />
        <Reviews lang={lang} />
        <Faq t={t} deliveryDays={Number(c.delivery_days) || BUSINESS.deliveryDays}
             revisions={BUSINESS.revisions} />
      </main>

      <Footer t={t} instagram={String(c.instagram_handle)} whatsapp={String(c.whatsapp_link)} />
      <StickyCta lang={lang} />
      <WhatsAppFab lang={lang} number={String(c.whatsapp_number)} link={String(c.whatsapp_link)} />
      <MetaPixel id={process.env.NEXT_PUBLIC_PIXEL_ID ?? ''} />
    </>
  );
}
