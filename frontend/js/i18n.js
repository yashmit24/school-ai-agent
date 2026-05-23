// =============================================
// 🌐 LANGUAGE / i18n MODULE
// Supports: English (en), Hindi (hi), Hinglish (hinglish)
// =============================================

const TRANSLATIONS = {
  en: {
    // Chatbot
    bot_name: 'School AI Assistant',
    bot_status: 'Online 24×7',
    clear_btn: 'Clear',
    placeholder: 'Ask anything about school...',
    disclaimer: 'AI answers may sometimes be inaccurate. Always confirm with school for critical info.',
    welcome_title: "Hello! I'm your School AI Assistant",
    welcome_sub: 'Ask me anything about exams, fees, timetables, transport, attendance, staff contacts, and more!',
    chip_timings: '⏰ School Timings',
    chip_timings_msg: 'What are the school timings?',
    chip_exams: '📝 Exam Dates',
    chip_exams_msg: 'Show upcoming exam dates',
    chip_fees: '💰 Fee Info',
    chip_fees_msg: 'What are the fee details?',
    chip_transport: '🚌 Bus Routes',
    chip_transport_msg: 'Show transport routes',
    chip_staff: '📞 Staff Contacts',
    chip_staff_msg: 'Give me staff contacts',
    chip_attendance: '📊 Attendance',
    chip_attendance_msg: 'What is my attendance?',
    lang_instruction: '(Please respond in clear, fluent English.)',

    // Admin
    nav_dashboard: 'Dashboard',
    nav_students: 'Students',
    nav_exams: 'Exams',
    nav_fees: 'Fees',
    nav_staff: 'Staff',
    nav_attendance: 'Attendance',
    nav_view_website: 'View Website',
    nav_open_chatbot: 'Open Chatbot',
    connecting: 'Connecting...',
    stat_students: 'Total Students',
    stat_unpaid_fees: 'Unpaid Fees',
    stat_exams: 'Total Exams',
    stat_staff: 'Staff Members',
    quick_links: 'Quick Links',
    open_chatbot: 'Open AI Chatbot',
    view_homepage: 'View Homepage',
    system_status: 'System Status',
    status_active: 'Active',
    status_checking: 'Checking...',
    status_connected: 'Connected',
    status_disconnected: 'Disconnected',
    status_online: '✅ Server Online',
    status_offline: '❌ Server Offline',
    status_running: 'Running',
    cron_jobs: 'Cron Jobs',
    all_students: 'All Students',
    exam_schedule: 'Exam Schedule',
    fee_records: 'Fee Records',
    staff_directory: 'Staff Directory',
    attendance_records: 'Attendance Records',
    refresh: 'Refresh',
    loading: 'Loading...',
    th_name: 'Name',
    th_class: 'Class',
    th_roll: 'Roll No',
    th_parent: 'Parent',
    th_phone: 'Phone',
    th_exam_name: 'Exam Name',
    th_subject: 'Subject',
    th_date: 'Date',
    th_time: 'Time',
    th_room: 'Room',
    th_student: 'Student',
    th_amount: 'Amount',
    th_due_date: 'Due Date',
    th_status: 'Status',
    th_role: 'Role',
    th_email: 'Email',
  },

  hi: {
    // Chatbot
    bot_name: 'स्कूल AI सहायक',
    bot_status: '24×7 उपलब्ध',
    clear_btn: 'साफ करें',
    placeholder: 'स्कूल के बारे में कुछ भी पूछें...',
    disclaimer: 'AI के उत्तर कभी-कभी गलत हो सकते हैं। महत्वपूर्ण जानकारी स्कूल से ज़रूर पुष्टि करें।',
    welcome_title: 'नमस्ते! मैं आपका स्कूल AI सहायक हूँ',
    welcome_sub: 'परीक्षा, फीस, समय-सारणी, परिवहन, उपस्थिति, स्टाफ संपर्क आदि के बारे में कुछ भी पूछें!',
    chip_timings: '⏰ स्कूल समय',
    chip_timings_msg: 'स्कूल का समय क्या है?',
    chip_exams: '📝 परीक्षा तारीखें',
    chip_exams_msg: 'आने वाली परीक्षाओं की तारीखें बताएं',
    chip_fees: '💰 फीस जानकारी',
    chip_fees_msg: 'फीस की जानकारी दें',
    chip_transport: '🚌 बस रूट',
    chip_transport_msg: 'परिवहन मार्ग दिखाएं',
    chip_staff: '📞 स्टाफ संपर्क',
    chip_staff_msg: 'स्टाफ की संपर्क जानकारी दें',
    chip_attendance: '📊 उपस्थिति',
    chip_attendance_msg: 'मेरी उपस्थिति क्या है?',
    lang_instruction: '(कृपया इस प्रश्न का उत्तर स्पष्ट और शुद्ध हिंदी में दें।)',

    // Admin
    nav_dashboard: 'डैशबोर्ड',
    nav_students: 'छात्र',
    nav_exams: 'परीक्षाएं',
    nav_fees: 'फीस',
    nav_staff: 'स्टाफ',
    nav_attendance: 'उपस्थिति',
    nav_view_website: 'वेबसाइट देखें',
    nav_open_chatbot: 'चैटबॉट खोलें',
    connecting: 'जोड़ा जा रहा है...',
    stat_students: 'कुल छात्र',
    stat_unpaid_fees: 'बकाया फीस',
    stat_exams: 'कुल परीक्षाएं',
    stat_staff: 'स्टाफ सदस्य',
    quick_links: 'त्वरित लिंक',
    open_chatbot: 'AI चैटबॉट खोलें',
    view_homepage: 'होमपेज देखें',
    system_status: 'सिस्टम स्थिति',
    status_active: 'सक्रिय',
    status_checking: 'जाँच हो रही है...',
    status_connected: 'जुड़ा हुआ',
    status_disconnected: 'असंबद्ध',
    status_online: '✅ सर्वर ऑनलाइन',
    status_offline: '❌ सर्वर ऑफलाइन',
    status_running: 'चल रहा है',
    cron_jobs: 'क्रॉन जॉब्स',
    all_students: 'सभी छात्र',
    exam_schedule: 'परीक्षा कार्यक्रम',
    fee_records: 'फीस रिकॉर्ड',
    staff_directory: 'स्टाफ निर्देशिका',
    attendance_records: 'उपस्थिति रिकॉर्ड',
    refresh: 'ताज़ा करें',
    loading: 'लोड हो रहा है...',
    th_name: 'नाम',
    th_class: 'कक्षा',
    th_roll: 'रोल नं.',
    th_parent: 'अभिभावक',
    th_phone: 'फोन',
    th_exam_name: 'परीक्षा का नाम',
    th_subject: 'विषय',
    th_date: 'तारीख',
    th_time: 'समय',
    th_room: 'कमरा',
    th_student: 'छात्र',
    th_amount: 'राशि',
    th_due_date: 'देय तारीख',
    th_status: 'स्थिति',
    th_role: 'पद',
    th_email: 'ईमेल',
  },

  hinglish: {
    // Chatbot
    bot_name: 'School AI Assistant',
    bot_status: '24×7 Available',
    clear_btn: 'Clear Karo',
    placeholder: 'School ke baare mein kuch bhi pucho...',
    disclaimer: 'AI ke answers kabhi kabhi galat ho sakte hain. Important info school se zaroor confirm karo.',
    welcome_title: 'Hello! Main hoon aapka School AI Assistant 🏫',
    welcome_sub: 'Exams, fees, timetable, transport, attendance, staff contacts — sab kuch puch sakte ho!',
    chip_timings: '⏰ School Timings',
    chip_timings_msg: 'School ka time kya hai?',
    chip_exams: '📝 Exam Dates',
    chip_exams_msg: 'Aane wale exams ki dates batao',
    chip_fees: '💰 Fee Info',
    chip_fees_msg: 'Fee ki jankaari do',
    chip_transport: '🚌 Bus Routes',
    chip_transport_msg: 'Transport routes dikhao',
    chip_staff: '📞 Staff Contacts',
    chip_staff_msg: 'Staff ka contact info do',
    chip_attendance: '📊 Attendance',
    chip_attendance_msg: 'Meri attendance kya hai?',
    lang_instruction: '(Please respond in fun, natural Hinglish — a friendly mix of Hindi and English using Roman script.)',

    // Admin
    nav_dashboard: 'Dashboard',
    nav_students: 'Students',
    nav_exams: 'Exams',
    nav_fees: 'Fees',
    nav_staff: 'Staff',
    nav_attendance: 'Attendance',
    nav_view_website: 'Website Dekho',
    nav_open_chatbot: 'Chatbot Kholo',
    connecting: 'Connect ho raha hai...',
    stat_students: 'Total Students',
    stat_unpaid_fees: 'Baki Fees',
    stat_exams: 'Total Exams',
    stat_staff: 'Staff Members',
    quick_links: 'Quick Links',
    open_chatbot: 'AI Chatbot Kholo',
    view_homepage: 'Homepage Dekho',
    system_status: 'System Status',
    status_active: 'Active',
    status_checking: 'Check ho raha hai...',
    status_connected: 'Connected',
    status_disconnected: 'Disconnected',
    status_online: '✅ Server Online',
    status_offline: '❌ Server Offline',
    status_running: 'Running',
    cron_jobs: 'Cron Jobs',
    all_students: 'Saare Students',
    exam_schedule: 'Exam Schedule',
    fee_records: 'Fee Records',
    staff_directory: 'Staff Directory',
    attendance_records: 'Attendance Records',
    refresh: 'Refresh Karo',
    loading: 'Load ho raha hai...',
    th_name: 'Naam',
    th_class: 'Class',
    th_roll: 'Roll No',
    th_parent: 'Parent',
    th_phone: 'Phone',
    th_exam_name: 'Exam Name',
    th_subject: 'Subject',
    th_date: 'Date',
    th_time: 'Time',
    th_room: 'Room',
    th_student: 'Student',
    th_amount: 'Amount',
    th_due_date: 'Due Date',
    th_status: 'Status',
    th_role: 'Role',
    th_email: 'Email',
  }
};

// ─────────────────────────────────────────
// CORE: Get current language
// ─────────────────────────────────────────
function getLang() {
  return localStorage.getItem('schoolLang') || 'en';
}

// ─────────────────────────────────────────
// CORE: Set language and apply translations
// ─────────────────────────────────────────
function setLang(lang) {
  localStorage.setItem('schoolLang', lang);
  applyTranslations(lang);
  updateLangButtons(lang);
}

// ─────────────────────────────────────────
// CORE: Apply all [data-i18n] elements
// ─────────────────────────────────────────
function applyTranslations(lang) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS['en'];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.textContent = t[key];
  });
}

// ─────────────────────────────────────────
// CORE: Highlight active language button
// ─────────────────────────────────────────
function updateLangButtons(lang) {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

// ─────────────────────────────────────────
// CORE: Get translated string by key
// ─────────────────────────────────────────
function t(key) {
  const lang = getLang();
  return (TRANSLATIONS[lang] || TRANSLATIONS['en'])[key] || key;
}

// ─────────────────────────────────────────
// CORE: Init — attach click handlers
// ─────────────────────────────────────────
function initLangSwitcher() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
  // Apply saved language on page load
  const saved = getLang();
  applyTranslations(saved);
  updateLangButtons(saved);
}
