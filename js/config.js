/* Timetoshoot — the only file you edit to connect the site to Supabase.
 * Prices, capacity, rules and copy numbers live in the `config` table.
 */
window.TTS_CONFIG = {
  /* Supabase → Project Settings → Data API → Project URL */
  supabaseUrl: 'https://ksvctdgpwyrtbsucespc.supabase.co',

  /* Supabase → Project Settings → API Keys → Publishable key.
     This one is MEANT to be public. Every table has row level security on
     with no policy, so this key can read and write nothing directly; it can
     only call the five tts_* functions, which validate everything server
     side. Never put the SECRET key (sb_secret_...) in this file. */
  supabaseKey: 'sb_publishable_-k6uRiL9nVxByNP887x4QA_FxC97DlY',

  /* Meta Pixel ID — leave empty to disable the pixel completely */
  pixelId: '',

  /* Fallbacks used only when the Sheet cannot be reached */
  fallback: {
    whatsapp_number: '917448326503',
    whatsapp_link: 'https://wa.me/message/PB6XEXRKZL7BH1',
    instagram_handle: 'timetoshoot',
    price_30s: 2999,
    price_1m: 4999,
    price_2m: 7999,
    price_3m: 9999,
    price_4m: 13999,
    price_5m: 16999,

    /* Shown struck through beside the price. Clear one to hide its strike. */
    list_price_30s: 4499,
    list_price_1m: 6499,
    list_price_2m: 9499,
    list_price_3m: 11999,
    list_price_4m: 15999,
    list_price_5m: 18999,
    follower_discount: 200,
    time_slots: ['11:00 AM', '1:00 PM', '4:00 PM', '7:00 PM'],
    daily_capacity: 4,
    units_30s: 1,
    units_1m: 1,
    units_2m: 2,
    units_3m: 2,
    units_4m: 3,
    units_5m: 3,
    min_lead_days: 3,
    booking_window_days: 60,
    slot_hold_hours: 24,
    most_chosen_package: '1m',
    delivery_text: 'Ready within 5 days of receiving all details',
    clients_count: '200+',
    revisions_text: ''
  },

  /* Sample films, played from YouTube.
     Only the thumbnail loads with the page; the player arrives when someone
     taps, so the page stays fast on mobile data.
     youtube = the id from the share link, e.g. https://youtu.be/ABC123 -> 'ABC123'
     label   = what the viewer sees under the film. Leave '' for no caption. */
  samples: [
    { youtube: '__pRxYUfCZU', label: '' },
    { youtube: 'i0Nn-RWWIl0', label: '' },
    { youtube: 'slmASGpL0Kk', label: '' },
    { youtube: 'oVgQxC6lf0o', label: '' }
  ],


  /* Screenshots of real WhatsApp feedback, shown under Testimonials.
     Crop each one to 4:5 portrait — 1080 x 1350 px is ideal. Keep each file
     under 250 KB. Add or remove lines freely; the section hides itself when
     the list is empty.
     Blur out phone numbers and profile photos before you add them. */
  reviewImages: [
    'assets/review-1.jpg',
    'assets/review-2.jpg',
    'assets/review-3.jpg',
    'assets/review-4.jpg',
    'assets/review-5.jpg'
  ],

  /* Browser-side cache for config/availability, in seconds */
  cacheSeconds: 60
};
