/* Timetoshoot — all user-facing copy, English and Tamil.
 * {placeholders} are filled at runtime.
 *
 * Ported verbatim from the static site's js/i18n.js. Every key exists in both
 * languages; a test fails the build if one ever does not.
 */
/* Timetoshoot — all user-facing copy, English and Tamil.
 * {placeholders} are filled at runtime.
 */
const STRINGS = {
  en: {
    /* ---- chrome ---- */
    brand: 'TIMETOSHOOT',
    nav_cta: 'Book now',
    sticky_cta: 'Book now',
    lang_label: 'Language',

    /* ---- hero ---- */
    hero_tagline: 'Memories fade. We give them life again.',
    hero_h1_1: 'Your photos are',
    hero_h1_2: 'still breathing.',
    hero_sub: 'Send us your photos. We turn them into a short film your family will watch again and again.',

    /* ---- samples ---- */
    stat_families: 'families trusted us',
    stat_delivery: 'typical delivery',
    stat_price: 'starting price',
    stat_days: 'days',
    hero_price: 'Films start at ₹{amount}',
    samples_title: 'Our work',
    samples_sub: 'Tap to play.',
    samples_play: 'Play this film',
    samples_placeholder: 'Add your sample film here',

    /* ---- how it works ---- */
    how_title: 'How it works',
    how_sub: 'Four steps. Only the first one is yours.',
    who_you: 'You',
    who_us: 'We do this',
    how_1_t: 'You send the photos',
    how_1_d: 'One clear photo of each person in the film. Send them on WhatsApp.',
    how_2_t: 'We write the story',
    how_2_d: 'We shape your moments into a story and show it to you before anything is made.',
    how_3_t: 'We produce the film',
    how_3_d: 'Music, pacing and captions, cut together into your film.',
    how_4_t: 'It reaches your WhatsApp',
    how_4_d: '{delivery}',

    /* ---- pricing ---- */

    /* ---- form shell ---- */
    form_title: 'Book your film',
    form_sub: 'Under a minute. You see the price before you send anything.',
    step_of: 'Step {n} of {total}',
    back: 'Back',
    next: 'Continue',
    start_cta: 'Book now',

    /* ---- step 1 ---- */
    s1_title: 'Who is this film for?',
    s1_sub: 'Two things to start.',
    label_name: 'Your name',
    ph_name: 'e.g. Priya',
    label_phone: 'WhatsApp number',
    ph_phone: '98765 43210',
    phone_hint: 'We confirm your booking on WhatsApp.',
    consent: 'By continuing you agree to be contacted on WhatsApp about this film.',
    err_name: 'Please enter your name.',
    err_phone: 'Enter a valid 10-digit Indian mobile number.',
    err_consent: 'Please tick the box so we can reach you.',

    /* ---- step 2 ---- */
    s2_title: 'What is the occasion?',
    s2_sub: 'This shapes the music and the mood.',
    occ_anniversary: 'Anniversary',
    occ_birthday: 'Birthday',
    occ_birth: 'Birth memory gift',
    occ_tribute: 'Tribute to loved ones',
    occ_other: 'Something else',
    tribute_note: 'We handle these films with care and in private. Take your time.',
    err_occasion: 'Please choose an occasion.',

    /* ---- step 3 ---- */
    s3_title: 'How long should it be?',
    s3_sub: 'Longer films hold more moments. This is the full price.',
    len_30s: '30 seconds',
    len_1m: '1 minute',
    len_2m: '2 minutes',
    len_3m: '3 minutes',
    len_4m: '4 minutes',
    len_5m: '5 minutes',
    len_30s_short: '30 sec',
    len_1m_short: '1 min',
    len_2m_short: '2 min',
    len_3m_short: '3 min',
    len_4m_short: '4 min',
    len_5m_short: '5 min',
    your_film: 'Your film: {length}',
    discount_applied: '(₹{amount} off applied)',
    total_label: 'Total',

    /* ---- step 4 ---- */
    s4_title: 'Pick your date and time',
    s4_sub: 'Choose a day, then a time. These are the slots still open.',
    s4_sub_event: 'Choose a day before {date}, then a time. Highlighted days are the sweet spot.',
    time_title: 'Times on {date}',
    time_taken: 'Taken',
    mini_sum: '{length} · {occasion}',
    reserve_cta: 'Book now',
    reserve_note: 'The rest is agreed on WhatsApp — the date, the photos, and how you pay the balance.',
    err_pick_time: 'Please pick a time.',
    legend_available: 'Free',
    legend_best: 'Best',
    legend_full: 'Full',
    legend_selected: 'Chosen',
    slots_left: '{n} left',
    full: 'Full',
    loading_dates: 'Checking real availability…',
    no_dates_title: 'Nothing fits before your date',
    no_dates_body: 'Every free day we have falls after {date}. We can sometimes take a rush job — message us and we will tell you honestly.',
    rush_cta: 'Message us for a rush option',
    err_pick_date: 'Please pick a delivery date.',
    two_min_note: 'A 2 minute film takes two slots, so only days with enough room are shown.',
    retry: 'Try again',
    load_failed: 'We could not load live dates. Please check your connection.',

    /* ---- step 5 ---- */
    submitting: 'Reserving your slot…',
    privacy_inline: 'Your name and number are used only to contact you about this film.',

    /* ---- result ---- */
    you_save: 'You save ₹{amount}',
    pay_cta: 'Hold my slot — ₹{amount}',
    pay_note: '₹{amount} holds your slot and comes off the price of your film. It is not refundable.',
    pay_or_wa: 'Ask on WhatsApp first',
    wa_enquiry: 'Hi, I would like a memory film.\n\nName: {name}\nOccasion: {occasion}\nLength: {length}\nPrice shown: ₹{amount}\n\nI have a question before I book.',
    pay_opening: 'Opening payment…',
    pay_retry: 'Pay ₹{amount} to hold your slot',
    pay_dismissed: 'Payment not completed. Your details are saved — pay now, or just message us.',
    pay_failed: 'That payment did not go through. Try again, or message us on WhatsApp.',
    pay_unavailable: 'Payment could not open. Message us on WhatsApp and we will sort it out.',
    ticket_held: 'Slot held',
    ticket_received: 'Booking received',
    ticket_hint: 'Your booking number. Keep it — we will ask for it on WhatsApp.',
    ticket_occasion: 'Occasion',
    ticket_film: 'Film',
    ticket_total: 'Total',
    ticket_paid: 'Paid now',
    ticket_due: 'To pay',
    ticket_screenshot: 'Take a screenshot of this.',
    success_title: 'Almost done',
    success_body: 'Your reference is {id}. One more step: send us the message on WhatsApp and we will take it from there.',
    success_note: 'We reply the same day. Nothing is confirmed until we talk.',
    open_whatsapp: 'Chat on WhatsApp',
    err_slot_taken: 'That slot was just taken. Please pick another time.',
    err_rate_limit: 'You have reached today’s booking limit. Please message us on WhatsApp.',
    err_duplicate: 'You already have this booking. We will confirm on WhatsApp.',
    err_generic: 'Something went wrong. Please try again, or message us on WhatsApp.',
    err_offline: 'You look offline. Please check your connection and try again.',

    /* ---- whatsapp message ---- */
    wa_message: 'Hi Timetoshoot! I am {name}. I would like to book a {length} film for {occasion}. Reference {id}, total \u20b9{amount}. Please tell me the next step.',
    wa_rush: 'Hi Timetoshoot! I’m {name}. I need a {length} film delivered before {date}. Is a rush option possible?',
    wa_plain: 'Hi Timetoshoot! I would like to know more about a memory film.',

    /* ---- testimonials ---- */
    testi_title: 'What families tell us',
    testi_sub: 'Straight from our WhatsApp, unedited.',
    testi_open: 'Open this review',

    /* ---- faq ---- */
    faq_title: 'Questions, answered honestly',
    faq_1_q: 'What do I need to send?',
    faq_1_a: 'One clear photo of each person in the film, on WhatsApp. Ten good photos beat fifty blurry ones. Send a song too, if you have one in mind.',
    delivery_line: 'Ready within {days} working days of us receiving all your photos and details.',
    faq_2_q: 'How long does it take?',
    faq_2_a: '{delivery} Photos that arrive late move the date with them, so send them as soon as you can.',
    faq_3_q: 'Can I ask for changes?',
    faq_3_a_default: 'Yes — {n} rounds of changes are included. A wrong name, a photo in the wrong place, a song to swap: tell us on WhatsApp and we fix it.',
    faq_4_q: 'How do I pay?',
    faq_4_a: 'We confirm your booking on WhatsApp and send the payment details there. Half before we start, the rest when your film is ready.',
    faq_5_q: 'Are my photos private?',
    faq_5_a: 'Yes. Your photos are used only to make your film. We never post them without asking you first.',
    faq_6_q: 'I need it urgently. Can you do it?',
    faq_6_a: 'Often yes. Message us on WhatsApp with the date you need it by, and we will tell you straight away whether we can make it. We would rather say no than miss your day.',

    /* ---- footer ---- */
    footer_tagline: 'Memory films, made in Tamil Nadu.',
    footer_instagram: 'Instagram',
    footer_whatsapp: 'WhatsApp',
    footer_privacy: 'Your name and number are used only to contact you about your booking. We do not sell or share your details.',
    footer_privacy_link: 'Privacy Policy',
    footer_terms_link: 'Terms',
    footer_refunds_link: 'Refunds & Cancellation',
    footer_contact_link: 'Contact us',
    footer_rights: '© {year} Timetoshoot. All rights reserved.'
  },

  ta: {
    brand: 'TIMETOSHOOT',
    nav_cta: 'இப்போதே புக் செய்யுங்கள்',
    sticky_cta: 'இப்போதே புக் செய்யுங்கள்',
    lang_label: 'மொழி',

    hero_tagline: 'நினைவுகள் மறையும். நாங்கள் அவற்றை மீண்டும் உயிர்ப்பிக்கிறோம்.',
    hero_h1_1: 'உங்கள் புகைப்படங்கள்',
    hero_h1_2: 'இன்னும் மூச்சு விடுகின்றன.',
    hero_sub: 'உங்கள் புகைப்படங்களை அனுப்புங்கள். உங்கள் குடும்பம் மீண்டும் மீண்டும் பார்க்கும் ஒரு சிறிய படமாக மாற்றுகிறோம்.',

    stat_families: 'குடும்பங்கள் நம்பின',
    stat_delivery: 'வழக்கமான டெலிவரி',
    stat_price: 'தொடக்க விலை',
    stat_days: 'நாட்கள்',
    hero_price: 'படங்கள் ₹{amount} முதல்',
    samples_title: 'எங்கள் படைப்புகள்',
    samples_sub: 'பார்க்க தட்டுங்கள்.',
    samples_play: 'இந்த படத்தை பார்க்க',
    samples_placeholder: 'உங்கள் மாதிரி படத்தை இங்கே சேர்க்கவும்',

    how_title: 'எப்படி வேலை செய்கிறது',
    how_sub: 'நான்கு படிகள். முதல் படி மட்டும் உங்களுடையது.',
    who_you: 'நீங்கள்',
    who_us: 'நாங்கள்',
    how_1_t: 'புகைப்படங்களை அனுப்புங்கள்',
    how_1_d: 'படத்தில் வரும் ஒவ்வொருவருக்கும் ஒரு தெளிவான புகைப்படம். வாட்ஸ்அப்பில் அனுப்புங்கள்.',
    how_2_t: 'கதையை உருவாக்குகிறோம்',
    how_2_d: 'உங்கள் தருணங்களை ஒரு கதையாக வடிவமைத்து, உருவாக்கும் முன்பே உங்களுக்கு காட்டுகிறோம்.',
    how_3_t: 'படத்தை தயாரிக்கிறோம்',
    how_3_d: 'இசை, வேகம், வசனங்கள் — எல்லாம் சேர்த்து உங்கள் படம் உருவாகிறது.',
    how_4_t: 'வாட்ஸ்அப்பில் வந்து சேரும்',
    how_4_d: '{delivery}',


    form_title: 'உங்கள் படத்தை புக் செய்யுங்கள்',
    form_sub: 'ஒரு நிமிடத்திற்கும் குறைவு. அனுப்பும் முன்பே விலை தெரியும்.',
    step_of: 'படி {n} / {total}',
    back: 'பின்னால்',
    next: 'தொடரவும்',
    start_cta: 'இப்போதே புக் செய்யுங்கள்',

    s1_title: 'இந்த படம் யாருக்காக?',
    s1_sub: 'தொடங்க இரண்டு விவரங்கள்.',
    label_name: 'உங்கள் பெயர்',
    ph_name: 'உதா. பிரியா',
    label_phone: 'வாட்ஸ்அப் எண்',
    ph_phone: '98765 43210',
    phone_hint: 'வாட்ஸ்அப்பில் உங்கள் புக்கிங்கை உறுதி செய்வோம்.',
    consent: 'தொடர்வதன் மூலம், இந்த படம் தொடர்பாக வாட்ஸ்அப்பில் தொடர்பு கொள்ள ஒப்புக்கொள்கிறீர்கள்.',
    err_name: 'உங்கள் பெயரை உள்ளிடுங்கள்.',
    err_phone: 'சரியான 10 இலக்க இந்திய மொபைல் எண்ணை உள்ளிடுங்கள்.',
    err_consent: 'உங்களை தொடர்பு கொள்ள இந்த பெட்டியை தேர்வு செய்யுங்கள்.',

    s2_title: 'என்ன நிகழ்வு?',
    s2_sub: 'இது இசையையும் உணர்வையும் தீர்மானிக்கும்.',
    occ_anniversary: 'திருமண நாள்',
    occ_birthday: 'பிறந்தநாள்',
    occ_birth: 'குழந்தை நினைவு பரிசு',
    occ_tribute: 'அன்புக்குரியவர்களுக்கு நினைவாக',
    occ_other: 'வேறு ஏதாவது',
    tribute_note: 'இத்தகைய படங்களை கவனமாகவும் தனிப்பட்ட முறையிலும் கையாளுகிறோம். நிதானமாக இருங்கள்.',
    err_occasion: 'ஒரு நிகழ்வை தேர்வு செய்யுங்கள்.',

    s3_title: 'எவ்வளவு நீளம் வேண்டும்?',
    s3_sub: 'நீளமான படங்களில் அதிக தருணங்கள் இடம்பெறும். இதுவே முழு விலை.',
    len_30s: '30 வினாடி',
    len_1m: '1 நிமிடம்',
    len_2m: '2 நிமிடம்',
    len_3m: '3 நிமிடம்',
    len_4m: '4 நிமிடம்',
    len_5m: '5 நிமிடம்',
    len_30s_short: '30 வினாடி',
    len_1m_short: '1 நிமிடம்',
    len_2m_short: '2 நிமிடம்',
    len_3m_short: '3 நிமிடம்',
    len_4m_short: '4 நிமிடம்',
    len_5m_short: '5 நிமிடம்',
    your_film: 'உங்கள் படம்: {length}',
    discount_applied: '(₹{amount} தள்ளுபடி)',
    total_label: 'மொத்தம்',

    s4_title: 'தேதியையும் நேரத்தையும் தேர்ந்தெடுங்கள்',
    s4_sub: 'முதலில் நாள், பிறகு நேரம் தேர்வு செய்யுங்கள். இவை இன்னும் காலியாக உள்ள இடங்கள்.',
    time_title: '{date} அன்று உள்ள நேரங்கள்',
    time_taken: 'பிடிபட்டது',
    mini_sum: '{length} · {occasion}',
    reserve_cta: 'இப்போதே புக் செய்யுங்கள்',
    reserve_note: 'மீதியை வாட்ஸ்அப்பில் பேசி முடிவு செய்வோம் — தேதி, படங்கள், மீதி தொகை எப்படி கட்டுவது.',
    err_pick_time: 'ஒரு நேரத்தை தேர்வு செய்யுங்கள்.',
    s4_sub_event: '{date}-க்கு முன் ஒரு நாளையும் நேரத்தையும் தேர்வு செய்யுங்கள். குறிக்கப்பட்ட நாட்கள் சிறந்தவை.',
    legend_available: 'காலி',
    legend_best: 'சிறந்தது',
    legend_full: 'நிரம்பியது',
    legend_selected: 'தேர்வு',
    slots_left: '{n} இடம்',
    full: 'நிரம்பியது',
    loading_dates: 'உண்மையான காலி தேதிகளை பார்க்கிறோம்…',
    no_dates_title: 'உங்கள் தேதிக்கு முன் இடம் இல்லை',
    no_dates_body: 'எங்களுக்கு காலியான நாட்கள் அனைத்தும் {date}-க்குப் பிறகே வருகின்றன. சில சமயங்களில் அவசர வேலையை ஏற்க முடியும் — எங்களுக்கு செய்தி அனுப்புங்கள், உண்மையை சொல்வோம்.',
    rush_cta: 'அவசர வசதிக்கு செய்தி அனுப்புங்கள்',
    err_pick_date: 'ஒரு தேதியை தேர்வு செய்யுங்கள்.',
    two_min_note: '2 நிமிட படத்திற்கு இரண்டு இடங்கள் தேவை, எனவே போதிய இடம் உள்ள நாட்கள் மட்டும் காட்டப்படுகின்றன.',
    retry: 'மீண்டும் முயற்சி',
    load_failed: 'தேதிகளை ஏற்ற முடியவில்லை. உங்கள் இணைப்பை சரிபார்க்கவும்.',

    submitting: 'உங்கள் இடத்தை பிடிக்கிறோம்…',
    privacy_inline: 'உங்கள் பெயரும் எண்ணும் இந்த படம் தொடர்பாக மட்டுமே பயன்படுத்தப்படும்.',

    you_save: '₹{amount} மிச்சம்',
    pay_cta: 'இடத்தைப் பிடிக்க — ₹{amount}',
    pay_note: '₹{amount} உங்கள் இடத்தைப் பிடிக்கும், அது படத்தின் விலையிலிருந்து கழிக்கப்படும். இது திரும்பத் தரப்படாது.',
    pay_or_wa: 'வாட்ஸ்அப்பில் கேளுங்கள்',
    wa_enquiry: 'வணக்கம், எனக்கு ஒரு நினைவு படம் வேண்டும்.\n\nபெயர்: {name}\nநிகழ்வு: {occasion}\nநீளம்: {length}\nகாட்டிய விலை: ₹{amount}\n\nபுக் செய்வதற்கு முன் ஒரு கேள்வி இருக்கிறது.',
    pay_opening: 'பேமெண்ட் திறக்கிறது…',
    pay_retry: '₹{amount} கட்டி இடத்தைப் பிடியுங்கள்',
    pay_dismissed: 'பேமெண்ட் முடியவில்லை. உங்கள் விவரங்கள் சேமிக்கப்பட்டுவிட்டன — இப்போது கட்டலாம், அல்லது எங்களுக்கு செய்தி அனுப்பலாம்.',
    pay_failed: 'அந்த பேமெண்ட் நிறைவேறவில்லை. மீண்டும் முயலுங்கள், அல்லது வாட்ஸ்அப்பில் சொல்லுங்கள்.',
    pay_unavailable: 'பேமெண்ட் திறக்க முடியவில்லை. வாட்ஸ்அப்பில் சொல்லுங்கள், நாங்கள் சரி செய்கிறோம்.',
    ticket_held: 'இடம் பிடிக்கப்பட்டது',
    ticket_received: 'புக்கிங் பெறப்பட்டது',
    ticket_hint: 'இதுவே உங்கள் புக்கிங் எண். வைத்துக்கொள்ளுங்கள் — வாட்ஸ்அப்பில் இதைக் கேட்போம்.',
    ticket_occasion: 'நிகழ்வு',
    ticket_film: 'படம்',
    ticket_total: 'மொத்தம்',
    ticket_paid: 'இப்போது கட்டியது',
    ticket_due: 'கட்ட வேண்டியது',
    ticket_screenshot: 'இதை ஸ்கிரீன்ஷாட் எடுத்து வைத்துக்கொள்ளுங்கள்.',
    success_title: 'கிட்டத்தட்ட முடிந்தது',
    success_body: 'உங்கள் குறிப்பு எண் {id}. இன்னொரு படி மட்டும்: வாட்ஸ்அப்பில் செய்தியை அனுப்புங்கள், மீதியை நாங்கள் பார்த்துக்கொள்கிறோம்.',
    success_note: 'அதே நாளில் பதில் சொல்வோம். பேசும் வரை எதுவும் உறுதியாகாது.',
    open_whatsapp: 'வாட்ஸ்அப்பில் பேசுங்கள்',
    err_slot_taken: 'அந்த இடம் இப்போதே பிடிக்கப்பட்டது. வேறு நேரத்தை தேர்வு செய்யுங்கள்.',
    err_rate_limit: 'இன்றைய புக்கிங் வரம்பை எட்டிவிட்டீர்கள். வாட்ஸ்அப்பில் செய்தி அனுப்புங்கள்.',
    err_duplicate: 'இந்த புக்கிங் ஏற்கனவே உள்ளது. வாட்ஸ்அப்பில் உறுதி செய்வோம்.',
    err_generic: 'ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும் அல்லது வாட்ஸ்அப்பில் செய்தி அனுப்பவும்.',
    err_offline: 'இணையம் இல்லை எனத் தெரிகிறது. இணைப்பை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',

    wa_message: 'வணக்கம் Timetoshoot! நான் {name}. ஒரு {length} நினைவு படம் புக் செய்ய விரும்புகிறேன். நிகழ்வு: {occasion}. குறிப்பு {id}, மொத்தம் ₹{amount}. அடுத்த படி என்ன என்று சொல்லுங்கள்.',
    wa_rush: 'வணக்கம் Timetoshoot! நான் {name}. {date}-க்கு முன் {length} படம் தேவை. அவசர வசதி சாத்தியமா?',
    wa_plain: 'வணக்கம் Timetoshoot! நினைவு படம் பற்றி தெரிந்து கொள்ள விரும்புகிறேன்.',

    testi_title: 'குடும்பங்கள் சொல்வது',
    testi_sub: 'எங்கள் வாட்ஸ்அப்பில் இருந்து அப்படியே.',
    testi_open: 'இந்த கருத்தை திறக்க',

    faq_title: 'கேள்விகளுக்கு நேர்மையான பதில்கள்',
    faq_1_q: 'நான் என்ன அனுப்ப வேண்டும்?',
    faq_1_a: 'படத்தில் வரும் ஒவ்வொருவருக்கும் ஒரு தெளிவான புகைப்படம், வாட்ஸ்அப்பில். ஐம்பது மங்கலான படங்களை விட பத்து நல்ல படங்கள் சிறந்தது. பாடல் மனதில் இருந்தால் அதையும் அனுப்புங்கள்.',
    delivery_line: 'உங்கள் புகைப்படங்களும் விவரங்களும் முழுமையாக கிடைத்த பிறகு {days} வேலை நாட்களுக்குள் தயாராகிவிடும்.',
    faq_2_q: 'எவ்வளவு நேரம் ஆகும்?',
    faq_2_a: '{delivery} படங்கள் தாமதமாக வந்தால் தேதியும் அவ்வளவு நகரும், அதனால் முடிந்தவரை சீக்கிரம் அனுப்புங்கள்.',
    faq_3_q: 'மாற்றங்கள் கேட்க முடியுமா?',
    faq_3_a_default: 'முடியும் — {n} முறை மாற்றங்கள் உள்ளடங்கும். பெயர் தவறாக இருந்தால், படம் தவறான இடத்தில் இருந்தால், பாடலை மாற்ற வேண்டும் என்றால் — வாட்ஸ்அப்பில் சொல்லுங்கள், சரி செய்து தருகிறோம்.',
    faq_4_q: 'பணம் எப்படி செலுத்துவது?',
    faq_4_a: 'வாட்ஸ்அப்பில் உங்கள் புக்கிங்கை உறுதி செய்து பணம் செலுத்தும் விவரங்களை அனுப்புவோம். பாதி தொகை வேலை தொடங்கும் முன், மீதி படம் தயாரானதும்.',
    faq_5_q: 'எனது புகைப்படங்கள் பாதுகாப்பானதா?',
    faq_5_a: 'ஆம். உங்கள் புகைப்படங்கள் உங்கள் படத்திற்கு மட்டுமே பயன்படுத்தப்படும். உங்கள் அனுமதி இல்லாமல் எங்கும் வெளியிட மாட்டோம்.',
    faq_6_q: 'எனக்கு அவசரமாக வேண்டும். முடியுமா?',
    faq_6_a: 'பெரும்பாலும் முடியும். எந்த தேதிக்குள் வேண்டும் என்று வாட்ஸ்அப்பில் சொல்லுங்கள், முடியுமா முடியாதா என்பதை உடனே சொல்லிவிடுவோம். உங்கள் நாளைத் தவறவிடுவதை விட முடியாது என்று சொல்வதே நேர்மை.',

    footer_tagline: 'தமிழ்நாட்டில் உருவாகும் நினைவு படங்கள்.',
    footer_instagram: 'இன்ஸ்டாகிராம்',
    footer_whatsapp: 'வாட்ஸ்அப்',
    footer_privacy: 'உங்கள் பெயரும் எண்ணும் உங்கள் புக்கிங் தொடர்பாக மட்டுமே பயன்படுத்தப்படும். உங்கள் விவரங்களை விற்கவோ பங்கிடவோ மாட்டோம்.',
    footer_privacy_link: 'தனியுரிமைக் கொள்கை',
    footer_terms_link: 'விதிமுறைகள்',
    footer_refunds_link: 'பணத்திருப்பம் & ரத்து',
    footer_contact_link: 'எங்களை தொடர்பு கொள்ள',
    footer_rights: '© {year} Timetoshoot. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.'
  }
};

export type Lang = 'en' | 'ta';
export type StringKey = keyof typeof STRINGS.en;

export const LANGS: Lang[] = ['en', 'ta'];
export { STRINGS };

/** Looks a string up, fills {placeholders}, and never throws on a missing key. */
export function translate(
  lang: Lang,
  key: StringKey,
  vars?: Record<string, string | number>,
): string {
  const table = STRINGS[lang] ?? STRINGS.en;
  const raw = (table as Record<string, string>)[key] ?? (STRINGS.en as Record<string, string>)[key] ?? '';
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m,
  );
}

export function makeT(lang: Lang) {
  return (key: StringKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
}
export type T = ReturnType<typeof makeT>;
