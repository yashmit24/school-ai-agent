const express = require('express');
const router = express.Router();
const { model } = require('../config/gemini');
const supabase = require('../config/supabase');

// ─── Session store ────────────────────────────────────────
// mode: 'normal' | 'admission_form' | 'enquiry_form' | 'visit_booking' | 'callback_form'
const sessions = {};

// ─── Triggers ─────────────────────────────────────────────
const TRIGGERS = {
  admission_form: [
    'admission form', 'apply now', 'apply karna', 'application form',
    'admission apply', 'form bharo', 'apply', 'application chahiye',
    'admission lena', 'register karna', 'enrollment', 'enroll'
  ],
  enquiry_form: [
    'enquiry', 'enquiry form', 'admission enquiry', 'jankari chahiye',
    'information chahiye', 'puchna tha', 'details chahiye', 'inquiry'
  ],
  visit_booking: [
    'school visit', 'campus visit', 'visit karna', 'tour', 'dekhne aana',
    'school dekhna', 'visit book', 'campus tour', 'aana chahta', 'aana chahti'
  ],
  callback_form: [
    'call me', 'call karo', 'callback', 'counsellor', 'counselor',
    'principal', 'baat karni', 'phone karo', 'call chahiye',
    'admission officer', 'human', 'agent', 'call back'
  ]
};

// ─── Application ID generator ─────────────────────────────
function generateAppId() {
  const year = new Date().getFullYear();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `SPS-${year}-${num}`;
}

// ─── Fetch KB ─────────────────────────────────────────────
async function fetchKB() {
  try {
    const { data } = await supabase.from('knowledge_base').select('*').limit(1).single();
    return data || null;
  } catch { return null; }
}

function formatKB(kb) {
  if (!kb) return 'Knowledge base not configured.';
  const p = [];
  if (kb.school_name)        p.push(`SCHOOL: ${kb.school_name}`);
  if (kb.admission_open !== undefined) p.push(`ADMISSION: ${kb.admission_open ? 'OPEN ✅' : 'CLOSED ❌'}`);
  if (kb.classes_available)  p.push(`CLASSES: ${kb.classes_available}`);
  if (kb.fee_structure)      p.push(`FEES: ${kb.fee_structure}`);
  if (kb.required_documents) p.push(`DOCUMENTS: ${kb.required_documents}`);
  if (kb.age_criteria)       p.push(`AGE CRITERIA: ${kb.age_criteria}`);
  if (kb.admission_process)  p.push(`PROCESS: ${kb.admission_process}`);
  if (kb.transport_routes)   p.push(`TRANSPORT: ${kb.transport_routes}`);
  if (kb.facilities)         p.push(`FACILITIES: ${kb.facilities}`);
  if (kb.school_timings)     p.push(`TIMINGS: ${kb.school_timings}`);
  if (kb.campus_visit_slots) p.push(`VISIT SLOTS: ${kb.campus_visit_slots}`);
  if (kb.scholarship_info)   p.push(`SCHOLARSHIP: ${kb.scholarship_info}`);
  if (kb.faqs)               p.push(`FAQs: ${kb.faqs}`);
  if (kb.contact_phone)      p.push(`PHONE: ${kb.contact_phone}`);
  if (kb.contact_email)      p.push(`EMAIL: ${kb.contact_email}`);
  return p.join('\n\n');
}

// ─── Save lead ────────────────────────────────────────────
async function saveLead(data, source = 'Chatbot') {
  try {
    let score = 20;
    if (data.parent_name)    score += 8;
    if (data.student_name)   score += 8;
    if (data.class_interested) score += 8;
    if (data.city)           score += 4;
    if (data.phone)          score += 15;
    if (data.email)          score += 10;
    if (data.dob)            score += 5;
    score = Math.min(score, 100);
    const category = score >= 70 ? 'Hot' : score >= 45 ? 'Warm' : 'Cold';

    const { data: lead, error } = await supabase.from('leads').insert([{
      parent_name: data.parent_name || 'Unknown',
      student_name: data.student_name || '',
      class_interested: data.class_interested || '',
      phone: data.phone || '',
      city: data.city || '',
      source,
      lead_score: score,
      lead_category: category,
      status: source === 'Admission Form' ? 'Application Submitted' : 'New',
      notes: data.notes || ''
    }]).select();
    if (error) console.error('Lead save error:', error.message);
    return lead ? lead[0] : null;
  } catch (e) { console.error('saveLead:', e.message); return null; }
}

// ─────────────────────────────────────────────────────────
// FORM HANDLERS
// ─────────────────────────────────────────────────────────

// ── Admission Form Steps ──────────────────────────────────
const ADMISSION_STEPS = [
  { key: 'student_name',   ask: '📝 **Admission Form Started!**\n\nStep 1/9 — Student ka poora naam kya hai?' },
  { key: 'dob',            ask: '📅 Step 2/9 — Date of Birth kya hai? (DD/MM/YYYY)' },
  { key: 'gender',         ask: '👤 Step 3/9 — Gender kya hai? (Boy / Girl / Other)' },
  { key: 'class_interested', ask: '🏫 Step 4/9 — Kis class mein admission chahiye? (e.g. Class 1, LKG, Class 9)' },
  { key: 'parent_name',    ask: '👨‍👩‍👧 Step 5/9 — Parent/Guardian ka naam kya hai?' },
  { key: 'phone',          ask: '📱 Step 6/9 — Mobile number kya hai? (10 digit)' },
  { key: 'email',          ask: '📧 Step 7/9 — Email address kya hai? (skip karna ho toh "skip" type karo)' },
  { key: 'address',        ask: '🏠 Step 8/9 — Ghar ka address kya hai? (Area/City)' },
  { key: 'prev_school',    ask: '🎒 Step 9/9 — Pichle school ka naam kya tha? (skip karna ho toh "skip" type karo)' }
];

async function handleAdmissionForm(session, message) {
  const step = session.step || 0;
  const msg = message.trim();

  // Save current step answer
  if (step > 0) {
    const field = ADMISSION_STEPS[step - 1].key;
    session.formData[field] = msg.toLowerCase() === 'skip' ? '' : msg;
  }

  // Phone validation
  if (step === 6) {
    const phone = msg.replace(/\D/g, '');
    if (phone.length !== 10) {
      return { reply: '❌ Phone number 10 digit ka hona chahiye. Dobara enter karo:', step: 5 };
    }
    session.formData.phone = phone;
  }

  // All steps done → save
  if (step >= ADMISSION_STEPS.length) {
    const appId = generateAppId();
    const fd = session.formData;
    const notes = `Application ID: ${appId} | DOB: ${fd.dob || 'N/A'} | Gender: ${fd.gender || 'N/A'} | Email: ${fd.email || 'N/A'} | Address: ${fd.address || 'N/A'} | Previous School: ${fd.prev_school || 'N/A'}`;

    const lead = await saveLead({
      student_name: fd.student_name,
      parent_name: fd.parent_name,
      class_interested: fd.class_interested,
      phone: fd.phone,
      city: fd.address,
      email: fd.email,
      dob: fd.dob,
      notes
    }, 'Admission Form');

    session.mode = 'normal';
    session.step = 0;
    session.formData = {};
    session.leadSaved = true;

    return {
      reply: `🎉 **Application Submitted Successfully!**\n\n` +
        `📋 **Application ID: ${appId}**\n\n` +
        `✅ Student: ${fd.student_name}\n` +
        `✅ Class: ${fd.class_interested}\n` +
        `✅ Parent: ${fd.parent_name}\n` +
        `✅ Phone: ${fd.phone}\n\n` +
        `📌 Yeh Application ID save kar lijiye. Hamare admission team 24 ghante mein aapse contact karenge.\n\n` +
        `Koi aur sawaal ho toh puchein! 😊`,
      mode: 'success'
    };
  }

  const nextStep = ADMISSION_STEPS[step];
  session.step = step + 1;
  return { reply: nextStep.ask, mode: 'form', step: step + 1 };
}

// ── Enquiry Form Steps ────────────────────────────────────
const ENQUIRY_STEPS = [
  { key: 'parent_name',     ask: '👤 **Enquiry Form**\n\nStep 1/5 — Aapka naam kya hai? (Parent/Guardian)' },
  { key: 'student_name',    ask: '📝 Step 2/5 — Bachche ka naam kya hai?' },
  { key: 'class_interested', ask: '🏫 Step 3/5 — Kis class mein admission chahiye?' },
  { key: 'phone',           ask: '📱 Step 4/5 — Aapka mobile number kya hai?' },
  { key: 'city',            ask: '📍 Step 5/5 — Aap kahan se hain? (City/Area)' }
];

async function handleEnquiryForm(session, message) {
  const step = session.step || 0;
  const msg = message.trim();

  if (step > 0) {
    const field = ENQUIRY_STEPS[step - 1].key;
    session.formData[field] = msg;
  }

  if (step >= ENQUIRY_STEPS.length) {
    const fd = session.formData;
    await saveLead(fd, 'Chatbot Enquiry');

    session.mode = 'normal';
    session.step = 0;
    session.formData = {};

    return {
      reply: `✅ **Enquiry Registered!**\n\n` +
        `Naam: ${fd.parent_name}\n` +
        `Student: ${fd.student_name}\n` +
        `Class: ${fd.class_interested}\n` +
        `Phone: ${fd.phone}\n` +
        `City: ${fd.city}\n\n` +
        `📞 Hamare counsellor aapko jald hi call karenge!\n\n` +
        `Koi sawaal ho toh puchein 😊`,
      mode: 'success'
    };
  }

  const nextStep = ENQUIRY_STEPS[step];
  session.step = step + 1;
  return { reply: nextStep.ask, mode: 'form', step: step + 1 };
}

// ── Visit Booking Steps ───────────────────────────────────
async function handleVisitBooking(session, message, kb) {
  const step = session.step || 0;
  const msg = message.trim();

  if (step === 0) {
    const slots = kb?.campus_visit_slots || 'Mon/Wed/Fri: 10am-12pm | Saturday: 10am-1pm';
    session.step = 1;
    return {
      reply: `🏫 **Campus Visit Booking**\n\n📅 Available Slots:\n${slots}\n\nStep 1/3 — Aap kab aana chahte hain? (Date batayein: DD/MM/YYYY ya weekday)`,
      mode: 'form'
    };
  }

  if (step === 1) { session.formData.visit_date = msg; session.step = 2; return { reply: '👤 Step 2/3 — Aapka naam kya hai?', mode: 'form' }; }
  if (step === 2) { session.formData.parent_name = msg; session.step = 3; return { reply: '📱 Step 3/3 — Mobile number kya hai?', mode: 'form' }; }

  if (step === 3) {
    session.formData.phone = msg.replace(/\D/g, '');
    const fd = session.formData;

    // Parse date
    let visitDate = new Date();
    visitDate.setDate(visitDate.getDate() + 1);
    const dateStr = visitDate.toISOString().split('T')[0];

    await supabase.from('campus_visits').insert([{
      parent_name: fd.parent_name,
      phone: fd.phone,
      visit_date: dateStr,
      visit_time: '10:00 AM',
      class_interested: session.classInterested || 'Not specified',
      status: 'Confirmed',
      notes: `Booked via chatbot. Requested date: ${fd.visit_date}`
    }]).catch(e => console.error('Visit save:', e.message));

    // Also save as lead
    await saveLead({ parent_name: fd.parent_name, phone: fd.phone, class_interested: session.classInterested }, 'Campus Visit Booking');

    session.mode = 'normal';
    session.step = 0;
    session.formData = {};

    return {
      reply: `✅ **Campus Visit Confirmed!**\n\n` +
        `👤 Name: ${fd.parent_name}\n` +
        `📅 Date: ${fd.visit_date}\n` +
        `⏰ Time: 10:00 AM – 12:00 PM\n` +
        `📍 Sunshine Public School\n\n` +
        `📞 Confirm ke liye +91-9876543210 pe call karein.\n\nMilte hain! 😊`,
      mode: 'success'
    };
  }
}

// ── Callback Form Steps ───────────────────────────────────
async function handleCallbackForm(session, message) {
  const step = session.step || 0;
  const msg = message.trim();

  if (step === 0) { session.step = 1; return { reply: '📞 **Callback Request**\n\nStep 1/3 — Aapka naam kya hai?', mode: 'form' }; }
  if (step === 1) { session.formData.parent_name = msg; session.step = 2; return { reply: '📱 Step 2/3 — Aapka mobile number?', mode: 'form' }; }
  if (step === 2) { session.formData.phone = msg.replace(/\D/g,''); session.step = 3; return { reply: '⏰ Step 3/3 — Aap kab call receive karna chahte hain? (e.g. Kal subah 10 baje, Aaj shaam 5 baje)', mode: 'form' }; }

  if (step === 3) {
    session.formData.preferred_time = msg;
    const fd = session.formData;

    await supabase.from('callback_requests').insert([{
      parent_name: fd.parent_name,
      phone: fd.phone,
      message: `Preferred time: ${fd.preferred_time}`,
      urgency: 'Normal',
      status: 'Pending'
    }]).catch(e => console.error('Callback save:', e.message));

    await saveLead({ parent_name: fd.parent_name, phone: fd.phone }, 'Callback Request');

    session.mode = 'normal';
    session.step = 0;
    session.formData = {};

    return {
      reply: `✅ **Callback Registered!**\n\n` +
        `👤 ${fd.parent_name}\n` +
        `📱 ${fd.phone}\n` +
        `⏰ Preferred: ${fd.preferred_time}\n\n` +
        `Hamare counsellor aapke preferred time pe call karenge! 📞\n\nKoi aur sawaal? 😊`,
      mode: 'success'
    };
  }
}

// ─────────────────────────────────────────────────────────
// DETECT INTENT
// ─────────────────────────────────────────────────────────
function detectIntent(msg) {
  const m = msg.toLowerCase();
  for (const [intent, keywords] of Object.entries(TRIGGERS)) {
    if (keywords.some(k => m.includes(k))) return intent;
  }
  return null;
}

// ─────────────────────────────────────────────────────────
// MAIN ROUTE
// ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { message, userId, language } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, error: 'Empty message' });

    const sessionId = userId || 'web-user';
    if (!sessions[sessionId]) sessions[sessionId] = { mode: 'normal', step: 0, formData: {}, turnCount: 0 };
    const session = sessions[sessionId];
    session.turnCount++;
    session._ts = Date.now();

    const msg = message.toLowerCase().trim();
    const lang = language === 'hi' ? 'Hindi' : 'Hinglish';

    // ── Cancel / Exit form ─────────────────────────────
    if (['cancel', 'exit', 'stop', 'band karo', 'chodo'].some(k => msg.includes(k)) && session.mode !== 'normal') {
      session.mode = 'normal'; session.step = 0; session.formData = {};
      return res.json({ success: true, message: '↩️ Form cancel kar diya. Koi aur sawaal ho toh puchein!', mode: 'normal', timestamp: new Date().toISOString() });
    }

    // ── Handle active form modes ───────────────────────
    if (session.mode === 'admission_form') {
      const result = await handleAdmissionForm(session, message);
      return res.json({ success: true, message: result.reply, mode: result.mode || 'form', timestamp: new Date().toISOString() });
    }
    if (session.mode === 'enquiry_form') {
      const result = await handleEnquiryForm(session, message);
      return res.json({ success: true, message: result.reply, mode: result.mode || 'form', timestamp: new Date().toISOString() });
    }
    if (session.mode === 'visit_booking') {
      const kb = await fetchKB();
      const result = await handleVisitBooking(session, message, kb);
      return res.json({ success: true, message: result.reply, mode: result.mode || 'form', timestamp: new Date().toISOString() });
    }
    if (session.mode === 'callback_form') {
      const result = await handleCallbackForm(session, message);
      return res.json({ success: true, message: result.reply, mode: result.mode || 'form', timestamp: new Date().toISOString() });
    }

    // ── Detect intent to start a new form/action ───────
    const intent = detectIntent(msg);

    if (intent === 'admission_form') {
      session.mode = 'admission_form'; session.step = 0; session.formData = {};
      const result = await handleAdmissionForm(session, message);
      return res.json({ success: true, message: result.reply, mode: 'form', timestamp: new Date().toISOString() });
    }
    if (intent === 'enquiry_form') {
      session.mode = 'enquiry_form'; session.step = 0; session.formData = {};
      const result = await handleEnquiryForm(session, message);
      return res.json({ success: true, message: result.reply, mode: 'form', timestamp: new Date().toISOString() });
    }
    if (intent === 'visit_booking') {
      session.mode = 'visit_booking'; session.step = 0; session.formData = {};
      const kb = await fetchKB();
      const result = await handleVisitBooking(session, message, kb);
      return res.json({ success: true, message: result.reply, mode: 'form', timestamp: new Date().toISOString() });
    }
    if (intent === 'callback_form') {
      session.mode = 'callback_form'; session.step = 0; session.formData = {};
      const result = await handleCallbackForm(session, message);
      return res.json({ success: true, message: result.reply, mode: 'form', timestamp: new Date().toISOString() });
    }

    // ── Passive extraction in normal mode ─────────────
    const classMatch = message.match(/\b(nursery|lkg|ukg|class\s*\d+|grade\s*\d+|\d{1,2}(?:th|st|nd|rd))\b/i);
    if (classMatch) session.classInterested = classMatch[0];

    const phoneMatch = message.match(/\b[6-9]\d{9}\b/);
    if (phoneMatch && !session.phone) session.phone = phoneMatch[0];

    // ── KB-grounded AI answer ──────────────────────────
    const kb = await fetchKB();

    if (kb && kb.admission_open === false) {
      const closedMsg = kb.admission_closed_msg || 'Abhi admissions band hain.';
      const prompt = `You are an admission assistant. Admissions are CLOSED. Always start with: "${closedMsg}". Then answer from KB. KB: ${formatKB(kb)}. Question: "${message}". Reply in ${lang}, 3-5 lines.`;
      const result = await model.generateContent(prompt);
      return res.json({ success: true, message: result.response.text(), admissionClosed: true, mode: 'normal', timestamp: new Date().toISOString() });
    }

    // Decide follow-up
    let followUp = '';
    if (session.turnCount === 1) followUp = '';
    else if (!session.classInterested && session.turnCount <= 3) followUp = '\n\nAur batayein — kis class mein admission chahiye?';
    else if (session.classInterested && !session.phone && session.turnCount >= 3) followUp = '\n\nKya aap apna number share karenge? Main form fill karne mein help karunga. 😊';

    const kbCtx = formatKB(kb);
    const prompt = `You are SchoolMitra AI — a proactive admission officer for ${kb?.school_name || 'our school'}.

BEHAVIOR:
- Answer question directly from KB
- Act like a real admission counsellor — complete tasks, don't just give info
- If user asks anything actionable, tell them you can help do it right here in chat:
  * "Main aapka admission form yahan bhar sakta hoon — bas 'apply' type karo"
  * "Campus visit book karne ke liye 'visit' type karo"
  * "Enquiry register karne ke liye 'enquiry' type karo"
- Language: ${lang}, warm, helpful
- Length: 4-6 lines max, 1-2 emojis
- NEVER say "school aao" — always offer to help in chat

KNOWLEDGE BASE:
${kbCtx}

Parent's message: "${message}"

Reply:`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text().trim() + followUp;

    res.json({ success: true, message: reply, mode: 'normal', timestamp: new Date().toISOString() });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ success: false, error: 'Server error. Please try again.' });
  }
});

// ─── Health ───────────────────────────────────────────────
router.get('/health', (_, res) => res.json({ success: true, message: 'Admission Agent running ✅' }));

// ─── Clean sessions ───────────────────────────────────────
setInterval(() => {
  const cutoff = Date.now() - 3600000;
  Object.keys(sessions).forEach(k => { if ((sessions[k]._ts || 0) < cutoff) delete sessions[k]; });
}, 3600000);

module.exports = router;
