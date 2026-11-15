/* Timetoshoot — the only file you edit to connect the site to your Sheet.
 * Everything else (prices, capacity, rules, copy numbers) lives in the Config tab.
 */
window.TTS_CONFIG = {
  /* Paste the Apps Script Web App URL here (ends with /exec) */
  apiUrl: 'https://script.google.com/macros/s/AKfycby4Bo9k1GACPUKu_aF1jPS1kxUPJ78xlkZSZmQ41teoqQ1OYawBRzF9s0eRy1rtpYA/exec',

  /* Must match API_TOKEN in Apps Script > Project Settings > Script Properties.
     NOTE: on a static site this is visible to visitors. It stops drive-by spam,
     it is not a secret. Your Sheet ID and Sheet data are never exposed. */
  apiToken: '772329400d0a496a9857643dd0f17ddb1d3cf313',

  /* Meta Pixel ID — leave empty to disable the pixel completely */
  pixelId: '',

  /* Fallbacks used only when the Sheet cannot be reached */
  fallback: {
    whatsapp_number: '917448326503',
    instagram_handle: 'timetoshoot',
    price_30s: 2999,
    price_1m: 4999,
    price_2m: 7999,
    follower_discount: 200,
    time_slots: ['11:00 AM', '1:00 PM', '4:00 PM', '7:00 PM'],
    daily_capacity: 4,
    units_30s: 1,
    units_1m: 1,
    units_2m: 2,
    min_lead_days: 3,
    booking_window_days: 60,
    slot_hold_hours: 24,
    most_chosen_package: '1m',
    delivery_text: 'Ready within 5 days of receiving all details',
    clients_count: '200+',
    revisions_text: ''
  },

  /* Sample films, 16:9 landscape. Put your own videos in assets/ and point here.
     poster = a still image shown before the video loads (keeps the page fast). */
  samples: [
    { src: 'assets/sample-1.mp4', poster: 'assets/sample-1.jpg', label: 'Anniversary film' },
    { src: 'assets/sample-2.mp4', poster: 'assets/sample-2.jpg', label: 'Birthday film' },
    { src: 'assets/sample-3.mp4', poster: 'assets/sample-3.jpg', label: 'Tribute film' }
  ],

  founderPhoto: 'assets/keerthika.jpg',

  /* Browser-side cache for config/availability, in seconds */
  cacheSeconds: 60
};
