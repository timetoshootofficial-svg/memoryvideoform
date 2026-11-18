/** Things that are part of the site itself rather than the database. */
export const SITE = {
  name: 'Timetoshoot',
  url: 'https://timetoshoot.in',

  /** Sample films. Only a thumbnail loads; the player arrives on tap. */
  samples: [
    { youtube: '__pRxYUfCZU', label: '' },
    { youtube: 'i0Nn-RWWIl0', label: '' },
    { youtube: 'slmASGpL0Kk', label: '' },
    { youtube: 'oVgQxC6lf0o', label: '' },
  ],

  /** Screenshots of real WhatsApp feedback, cropped 4:5 (1080x1350). */
  reviewImages: [
    '/reviews/review-1.jpg',
    '/reviews/review-2.jpg',
    '/reviews/review-3.jpg',
    '/reviews/review-4.jpg',
    '/reviews/review-5.jpg',
  ],

  /** Used only if the database cannot be reached at render time. */
  fallback: {
    whatsapp_number: '917448326503',
    whatsapp_link: 'https://wa.me/message/PB6XEXRKZL7BH1',
    instagram_handle: 'timetoshoot_',
    price_30s: 2999, price_1m: 4999, price_2m: 7999,
    price_3m: 9999, price_4m: 13999, price_5m: 16999,
    list_price_30s: 0, list_price_1m: 0, list_price_2m: 0,
    list_price_3m: 0, list_price_4m: 0, list_price_5m: 0,
    units_30s: 1, units_1m: 1, units_2m: 2, units_3m: 2, units_4m: 3, units_5m: 3,
    follower_discount: 200,
    time_slots: ['11:00 AM', '1:00 PM', '4:00 PM', '7:00 PM'],
    daily_capacity: 4,
    min_lead_days: 3,
    booking_window_days: 60,
    slot_hold_hours: 24,
    most_chosen_package: '1m',
    delivery_text: 'Ready within 5 days of receiving all details',
    delivery_days: 5,
    clients_count: '500+',
    revisions_text: '',
  },
} as const;
