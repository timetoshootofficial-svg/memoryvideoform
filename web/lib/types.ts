/** Film lengths, in the order the stepper shows them. */
export const LENGTHS = ['30s', '1m', '2m', '3m', '4m', '5m'] as const;
export type FilmLength = (typeof LENGTHS)[number];

export const OCCASIONS = [
  'Anniversary',
  'Birthday',
  'Birth memory gift',
  'Tribute to loved ones',
  'Other',
] as const;
export type Occasion = (typeof OCCASIONS)[number];

/** Everything the `config` table hands the page. Numbers arrive as numbers. */
export interface SiteConfig {
  today: string;
  daily_capacity: number;
  min_lead_days: number;
  booking_window_days: number;
  slot_hold_hours: number;
  whatsapp_number: string;
  whatsapp_link: string;
  instagram_handle: string;
  most_chosen_package: string;
  delivery_text: string;
  clients_count: string;
  revisions_text: string;
  time_slots: string[];
  film_lengths: FilmLength[];
  [key: string]: string | number | string[] | undefined;
}

export interface DayTime {
  time: string;
  taken: boolean;
}

export interface AvailabilityDay {
  date: string;
  capacity: number;
  used: number;
  slotsLeft: number;
  times: DayTime[];
  freeTimes: number;
}

export interface Bootstrap {
  ok: true;
  config: SiteConfig;
  availability: AvailabilityDay[];
  testimonials: unknown[];
}

export type ApiFailure = { ok: false; code: string; message?: string };

export interface BookingSuccess {
  ok: true;
  bookingId: string;
  total: number;
  price: number;
  discount: number;
  units: number;
  deliveryDate: string;
  slotTime: string;
  holdUntil: string | null;
  holdHours: number;
  spam?: boolean;
}

export type BookingResult = BookingSuccess | ApiFailure;

export interface CalendarDay {
  date: string;
  slotsLeft: number;
  capacityLeft: number;
  capacity: number;
  times: DayTime[] | null;
  freeTimes: number | undefined;
  selectable: boolean;
  reason: 'ok' | 'lead_time' | 'out_of_window' | 'after_event' | 'full';
  best: boolean;
}
