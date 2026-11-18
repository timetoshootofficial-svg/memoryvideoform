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
    nav_cta: 'Check availability',
    sticky_cta: 'Check availability and book',
    lang_label: 'Language',

    /* ---- hero ---- */
    hero_tagline: 'Memories fade. We give them life again.',
    hero_h1_1: 'Your photos are',
    hero_h1_2: 'still breathing.',
    hero_sub: 'Send us your photos. We turn them into a short film your family will watch again and again.',
    hero_badge: '{count} families trusted us',
    hero_point_1: 'Real dates',
    hero_point_2: 'Price upfront',
    hero_point_3: 'No call needed',

    /* ---- samples ---- */
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
    form_sub: 'About a minute. You see the price and the free dates before anything is confirmed.',
    step_of: 'Step {n} of {total}',
    back: 'Back',
    next: 'Continue',
    start_cta: 'Check availability and book',

    /* ---- step 1 ---- */
    s1_title: 'Who is this film for?',
    s1_sub: 'Two things to start.',
    label_name: 'Your name',
    ph_name: 'e.g. Priya',
    label_phone: 'WhatsApp number',
    ph_phone: '98765 43210',
    phone_hint: 'We confirm your booking on WhatsApp.',
    consent: 'I agree to be contacted on WhatsApp.',
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
    label_event_date: 'When is the occasion?',
    label_event_date_tribute: 'Is there a date you would like to remember? (optional)',
    event_date_hint: 'We will make sure your film is ready before this date.',
    event_date_hint_tribute: 'You can leave this empty. We will take our time and treat it gently.',
    tribute_note: 'We handle these films with care and in private. Take your time.',
    err_occasion: 'Please choose an occasion.',
    err_event_date: 'Please choose the date of the occasion.',
    err_event_past: 'That date has already passed. Please pick a future date.',
    skip_date: 'Skip this',

    /* ---- step 3 ---- */
    s3_title: 'How long should it be?',
    s3_sub: 'Longer films hold more moments.',
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
    follower_check: 'I follow @{handle}',
    your_film: 'Your film: {length}',
    discount_applied: '(₹{amount} off applied)',
    total_label: 'Total',

    /* ---- step 4 ---- */
    s4_title: 'Pick your date and time',
    s4_sub: 'Choose a day, then a time. These are the slots still open.',
    s4_sub_event: 'Choose a day before {date}, then a time. Highlighted days are the sweet spot.',
    time_title: 'Times on {date}',
    time_taken: 'Taken',
    mini_sum: '{length} · {date}, {time}',
    reserve_cta: 'Reserve my slot',
    reserve_note: 'We hold it for {hours} hours. Nothing is confirmed until we talk on WhatsApp.',
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
    privacy_inline: 'Your name and number are used only to contact you about this booking.',

    /* ---- result ---- */
    success_title: 'Slot reserved',
    success_body: 'Your reference is {id}. Send us the message and we will confirm the final date with you.',
    success_note: 'We hold this slot for {hours} hours.',
    open_whatsapp: 'Continue on WhatsApp',
    err_slot_taken: 'That slot was just taken. Please pick another time.',
    err_rate_limit: 'You have reached today’s booking limit. Please message us on WhatsApp.',
    err_duplicate: 'You already have this booking. We will confirm on WhatsApp.',
    err_generic: 'Something went wrong. Please try again, or message us on WhatsApp.',
    err_offline: 'You look offline. Please check your connection and try again.',

    /* ---- whatsapp message ---- */
    wa_message: 'Hi Timetoshoot! I’m {name}. I’ve reserved a slot for {date} at {time} — a {length} film for {occasion}. Reference {id}, total ₹{amount}. Please share the further details.',
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
    faq_2_q: 'How long does it take?',
    faq_2_a: '{delivery} You pick the date on the calendar, and we only show days we are genuinely free.',
    faq_3_q: 'Can I ask for changes?',
    faq_3_a: '{revisions}',
    faq_3_a_default: 'Yes. We will tell you exactly how many rounds of changes are included when we confirm your booking on WhatsApp.',
    faq_4_q: 'How do I pay?',
    faq_4_a: 'After you reserve a slot we confirm on WhatsApp and share payment details there. Nothing is charged on this page.',
    faq_5_q: 'Are my photos private?',
    faq_5_a: 'Yes. Your photos are used only to make your film. We never post them without asking you first.',
    faq_6_q: 'What if my date is full?',
    faq_6_a: 'Then it really is full. We would rather show an honest calendar than take a booking we cannot deliver. Message us and we will look for a rush slot.',

    /* ---- footer ---- */
    footer_tagline: 'Memory films, made in Tamil Nadu.',
    footer_instagram: 'Instagram',
    footer_whatsapp: 'WhatsApp',
    footer_privacy: 'Your name and number are used only to contact you about your booking. We do not sell or share your details.',
    footer_privacy_link: 'Read our Privacy Policy',
    footer_rights: '© {year} Timetoshoot. All rights reserved.'
  },

  ta: {
    brand: 'TIMETOSHOOT',
    nav_cta: 'தேதி பார்க்க',
    sticky_cta: 'தேதி பார்த்து புக் செய்யுங்கள்',
    lang_label: 'மொழி',

    hero_tagline: 'நினைவுகள் மறையும். நாங்கள் அவற்றை மீண்டும் உயிர்ப்பிக்கிறோம்.',
    hero_h1_1: 'உங்கள் புகைப்படங்கள்',
    hero_h1_2: 'இன்னும் மூச்சு விடுகின்றன.',
    hero_sub: 'உங்கள் புகைப்படங்களை அனுப்புங்கள். உங்கள் குடும்பம் மீண்டும் மீண்டும் பார்க்கும் ஒரு சிறிய படமாக மாற்றுகிறோம்.',
    hero_badge: '{count} குடும்பங்கள் நம்பினார்கள்',
    hero_point_1: 'உண்மையான தேதிகள்',
    hero_point_2: 'விலை முன்பே',
    hero_point_3: 'அழைப்பு தேவையில்லை',

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
    form_sub: 'ஒரு நிமிடம். உறுதி செய்யும் முன்பே விலையும் காலி தேதிகளும் தெரியும்.',
    step_of: 'படி {n} / {total}',
    back: 'பின்னால்',
    next: 'தொடரவும்',
    start_cta: 'தேதி பார்த்து புக் செய்யுங்கள்',

    s1_title: 'இந்த படம் யாருக்காக?',
    s1_sub: 'தொடங்க இரண்டு விவரங்கள்.',
    label_name: 'உங்கள் பெயர்',
    ph_name: 'உதா. பிரியா',
    label_phone: 'வாட்ஸ்அப் எண்',
    ph_phone: '98765 43210',
    phone_hint: 'வாட்ஸ்அப்பில் உங்கள் புக்கிங்கை உறுதி செய்வோம்.',
    consent: 'வாட்ஸ்அப்பில் என்னை தொடர்பு கொள்ள சம்மதிக்கிறேன்.',
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
    label_event_date: 'நிகழ்வு எப்போது?',
    label_event_date_tribute: 'நினைவில் வைக்க விரும்பும் தேதி உள்ளதா? (விருப்பம்)',
    event_date_hint: 'இந்த தேதிக்கு முன்பே உங்கள் படம் தயாராக இருக்கும்.',
    event_date_hint_tribute: 'இதை காலியாக விடலாம். நிதானமாக, மரியாதையுடன் செய்வோம்.',
    tribute_note: 'இத்தகைய படங்களை கவனமாகவும் தனிப்பட்ட முறையிலும் கையாளுகிறோம். நிதானமாக இருங்கள்.',
    err_occasion: 'ஒரு நிகழ்வை தேர்வு செய்யுங்கள்.',
    err_event_date: 'நிகழ்வின் தேதியை தேர்வு செய்யுங்கள்.',
    err_event_past: 'அந்த தேதி முடிந்துவிட்டது. வருங்கால தேதியை தேர்வு செய்யுங்கள்.',
    skip_date: 'தேவையில்லை',

    s3_title: 'எவ்வளவு நீளம் வேண்டும்?',
    s3_sub: 'நீளமான படங்களில் அதிக தருணங்கள் இடம்பெறும்.',
    len_30s: '30 வினாடி',
    len_1m: '1 நிமிடம்',
    len_2m: '2 நிமிடம்',
    len_3m: '3 நிமிடம்',
    len_4m: '4 நிமிடம்',
    len_5m: '5 நிமிடம்',
    len_30s_short: '30 விநாடி',
    len_1m_short: '1 நிமிடம்',
    len_2m_short: '2 நிமிடம்',
    len_3m_short: '3 நிமிடம்',
    len_4m_short: '4 நிமிடம்',
    len_5m_short: '5 நிமிடம்',
    follower_check: 'நான் @{handle} பின்தொடர்கிறேன்',
    your_film: 'உங்கள் படம்: {length}',
    discount_applied: '(₹{amount} தள்ளுபடி)',
    total_label: 'மொத்தம்',

    s4_title: 'தேதியையும் நேரத்தையும் தேர்ந்தெடுங்கள்',
    s4_sub: 'முதலில் நாள், பிறகு நேரம் தேர்வு செய்யுங்கள். இவை இன்னும் காலியாக உள்ள இடங்கள்.',
    time_title: '{date} அன்று உள்ள நேரங்கள்',
    time_taken: 'பிடிபட்டது',
    mini_sum: '{length} · {date}, {time}',
    reserve_cta: 'எனது இடத்தை பிடிக்கவும்',
    reserve_note: '{hours} மணி நேரம் பிடித்து வைக்கிறோம். வாட்ஸ்அப்பில் பேசும் வரை எதுவும் உறுதியாகாது.',
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
    privacy_inline: 'உங்கள் பெயரும் எண்ணும் இந்த புக்கிங் தொடர்பாக மட்டுமே பயன்படுத்தப்படும்.',

    success_title: 'இடம் பிடிக்கப்பட்டது',
    success_body: 'உங்கள் குறிப்பு எண் {id}. செய்தியை அனுப்புங்கள், இறுதி தேதியை உறுதி செய்வோம்.',
    success_note: '{hours} மணி நேரம் இந்த இடம் பிடித்து வைக்கப்படும்.',
    open_whatsapp: 'வாட்ஸ்அப்பில் தொடரவும்',
    err_slot_taken: 'அந்த இடம் இப்போதே பிடிக்கப்பட்டது. வேறு நேரத்தை தேர்வு செய்யுங்கள்.',
    err_rate_limit: 'இன்றைய புக்கிங் வரம்பை எட்டிவிட்டீர்கள். வாட்ஸ்அப்பில் செய்தி அனுப்புங்கள்.',
    err_duplicate: 'இந்த புக்கிங் ஏற்கனவே உள்ளது. வாட்ஸ்அப்பில் உறுதி செய்வோம்.',
    err_generic: 'ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும் அல்லது வாட்ஸ்அப்பில் செய்தி அனுப்பவும்.',
    err_offline: 'இணையம் இல்லை எனத் தெரிகிறது. இணைப்பை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',

    wa_message: 'வணக்கம் Timetoshoot! நான் {name}. {date} அன்று {time} நேரத்திற்கு ஒரு இடத்தை பிடித்துள்ளேன் — {occasion} க்கான {length} படம். குறிப்பு {id}, மொத்தம் ₹{amount}. மேல் விவரங்களை பகிரவும்.',
    wa_rush: 'வணக்கம் Timetoshoot! நான் {name}. {date}-க்கு முன் {length} படம் தேவை. அவசர வசதி சாத்தியமா?',
    wa_plain: 'வணக்கம் Timetoshoot! நினைவு படம் பற்றி தெரிந்து கொள்ள விரும்புகிறேன்.',

    testi_title: 'குடும்பங்கள் சொல்வது',
    testi_sub: 'எங்கள் வாட்ஸ்அப்பில் இருந்து அப்படியே.',
    testi_open: 'இந்த கருத்தை திறக்க',

    faq_title: 'கேள்விகளுக்கு நேர்மையான பதில்கள்',
    faq_1_q: 'நான் என்ன அனுப்ப வேண்டும்?',
    faq_1_a: 'படத்தில் வரும் ஒவ்வொருவருக்கும் ஒரு தெளிவான புகைப்படம், வாட்ஸ்அப்பில். ஐம்பது மங்கலான படங்களை விட பத்து நல்ல படங்கள் சிறந்தது. பாடல் மனதில் இருந்தால் அதையும் அனுப்புங்கள்.',
    faq_2_q: 'எவ்வளவு நேரம் ஆகும்?',
    faq_2_a: '{delivery} நீங்கள் காலெண்டரில் தேர்வு செய்யும் தேதியே உங்கள் டெலிவரி தேதி, மேலும் உண்மையில் காலியாக உள்ள நாட்களை மட்டுமே காட்டுகிறோம்.',
    faq_3_q: 'மாற்றங்கள் கேட்க முடியுமா?',
    faq_3_a: '{revisions}',
    faq_3_a_default: 'முடியும். எத்தனை முறை மாற்றங்கள் உள்ளடங்கும் என்பதை வாட்ஸ்அப்பில் உறுதி செய்யும்போது தெளிவாக சொல்வோம்.',
    faq_4_q: 'பணம் எப்படி செலுத்துவது?',
    faq_4_a: 'இடத்தை பிடித்த பிறகு வாட்ஸ்அப்பில் உறுதி செய்து பணம் செலுத்தும் விவரங்களை அனுப்புவோம். இந்த பக்கத்தில் எந்த கட்டணமும் இல்லை.',
    faq_5_q: 'எனது புகைப்படங்கள் பாதுகாப்பானதா?',
    faq_5_a: 'ஆம். உங்கள் புகைப்படங்கள் உங்கள் படத்திற்கு மட்டுமே பயன்படுத்தப்படும். உங்கள் அனுமதி இல்லாமல் எங்கும் வெளியிட மாட்டோம்.',
    faq_6_q: 'எனது தேதி நிரம்பியிருந்தால்?',
    faq_6_a: 'அப்படியானால் அது உண்மையிலேயே நிரம்பியிருக்கிறது. செய்து தர முடியாத புக்கிங்கை ஏற்பதை விட நேர்மையான காலெண்டரை காட்டுவதே சரி. எங்களுக்கு செய்தி அனுப்புங்கள், அவசர இடம் உள்ளதா பார்ப்போம்.',

    footer_tagline: 'தமிழ்நாட்டில் உருவாகும் நினைவு படங்கள்.',
    footer_instagram: 'இன்ஸ்டாகிராம்',
    footer_whatsapp: 'வாட்ஸ்அப்',
    footer_privacy: 'உங்கள் பெயரும் எண்ணும் உங்கள் புக்கிங் தொடர்பாக மட்டுமே பயன்படுத்தப்படும். உங்கள் விவரங்களை விற்கவோ பங்கிடவோ மாட்டோம்.',
    footer_privacy_link: 'தனியுரிமைக் கொள்கையைப் படிக்க',
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
