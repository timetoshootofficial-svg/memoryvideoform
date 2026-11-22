/**
 * Who Timetoshoot is, for the pages a payment provider reads.
 *
 * Razorpay checks that the contact details, refund terms and delivery
 * promise on the site match what the account says. They are here, once, so
 * the three legal pages cannot drift apart from each other.
 *
 * The account is an INDIVIDUAL account: the business is not separately
 * registered, so nothing here may claim a company name or a GSTIN.
 */
export const BUSINESS = {
  tradingName: 'Timetoshoot',

  /** Digits only, Indian number. Rendered by `phoneDisplay` below. */
  phone: '7448326503',
  /** The same number on WhatsApp, with the country code. */
  whatsapp: '917448326503',

  address: {
    line1: 'No. 45/6, ASMR City 2',
    line2: 'Kirupandavariyar Nagar, Poonamallee',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
  },

  /** When a message actually gets answered. Do not promise more than this. */
  hours: '8:00 AM to 11:00 PM, every day',

  /** Rounds of corrections included in every plan. */
  revisions: 2,

  /** Working days from "we have everything" to "your film is ready". */
  deliveryDays: 5,

  /** What it costs to hold a slot, and what comes off the final price. */
  bookingFee: 99,
  bookingFeeRefundable: false,

  /** Working days a refund takes to reach the payer. */
  refundDays: '5 to 7 working days',

  /** The day these terms last changed. Shown on each legal page. */
  updated: '22 November 2026',
} as const;

/** +91 74483 26503 */
export const phoneDisplay = (d: string = BUSINESS.phone) =>
  `+91 ${d.slice(0, 5)} ${d.slice(5)}`;

export const addressLines = () => {
  const a = BUSINESS.address;
  return [a.line1, a.line2, `${a.city}, ${a.state}`, a.country];
};
