export interface AdminBooking {
  id: string; createdAt: string; createdDate: string;
  name: string; phone: string; occasion: string; eventDate: string | null;
  filmLength: string; deliveryDate: string; slotTime: string;
  price: number; follower: string; total: number; status: string;
  holdUntil: string; holdActive: boolean;
  campaign: string; source: string; adId: string; language: string; notes: string;
}

export interface AdminStats {
  total: number; today: number; yesterday: number; last7: number; last30: number;
  pending: number; confirmed: number; paid: number; cancelled: number; expired: number;
  revenuePaid: number; revenueConfirmed: number; revenuePending: number;
  byOccasion: Record<string, number>; byLength: Record<string, number>;
  byCampaign: Record<string, number>; bySlot: Record<string, number>;
}

export interface AdminFunnel {
  all: Record<string, number>; today: Record<string, number>;
  yesterday: Record<string, number>; last7: Record<string, number>;
  sessions: number; sessionsToday: number;
}

export interface AdminPayload {
  ok: true; now: string; today: string;
  stats: AdminStats; bookings: AdminBooking[]; funnel: AdminFunnel;
  config: { whatsapp_number: string; time_slots: string[];
            daily_capacity: number; slot_hold_hours: number };
}

export interface Lead {
  sessionId: string;
  firstSeen: string;
  lastSeen: string;
  day: string;
  name: string;
  phone: string;
  occasion: string;
  eventDate: string | null;
  filmLength: string;
  price: number;
  follower: boolean;
  step: number;
  completed: boolean;
  bookingId: string;
  language: string;
  campaign: string;
  source: string;
  adId: string;
}

export interface StageCounts {
  gaveNumber: number;
  choseOccasion: number;
  sawPrice: number;
  finished: number;
  abandoned: number;
  valueFinished: number;
  valueLeft: number;
}

export type StageWindow = 'today' | 'last7' | 'last30' | 'all';

export interface LeadsPayload {
  ok: true;
  leads: Lead[];
  stages: Record<StageWindow, StageCounts>;
  today: string;
}
