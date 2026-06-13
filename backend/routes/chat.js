const express = require('express');
const router = express.Router();
const { model } = require('../config/gemini');
const supabase = require('../config/supabase');

// In-memory lead capture sessions: { sessionId: { parentName, studentName, phone, classInterested, city, timeline, askedFees, askedVisit, askedDocs } }
const sessions = {};

// ─── Callback trigger keywords ───────────────────────────
const CALLBACK_TRIGGERS = ['call me', 'call karo', 'phone karo', 'counsellor', 'counselor',
  'principal', 'human', 'real person', 'agent', 'baat karni hai', 'callback', 'call back'];

// ─── Fetch Knowledge Base ─────────────────────────────────
async function fetchKB() {
  const { data } = await supabase.from('knowledge_base').select('*').limit(1).single();
  return data || null;
}

// ─── Format KB as context string ─────────────────────────
function formatKB(kb) {
  if (!kb) return 'Knowledge base not configured yet.';
  const parts = [];
  if (kb.school_name)        parts.push(`SCHOOL: ${kb.school_name}`);
  if (kb.admission_open !== undefined) parts.push(`ADMISSION STATUS: ${kb.admission_open ? 'OPEN ✅' : 'CLOSED ❌'}`);
  if (!kb.admission_open && kb.admission_closed_msg) parts.push(`CLOSED MESSAGE: ${kb.admission_closed_msg}`);
  if (kb.classes_available)  parts.push(`CLASSES: ${kb.classes_available}`);
  if (kb.fee_structure)      parts.push(`FEE STRUCTURE:\n${kb.fee_structure}`);
  if (kb.required_documents) parts.push(`REQUIRED DOCUMENTS: ${kb.required_documents}`);
  if (kb.age_criteria)       parts.push(`AGE CRITERIA: ${kb.age_criteria}`);
  if (kb.admission_process)  parts.push(`ADMISSION PROCESS: ${kb.admission_process}`);
  if (kb.transport_routes)   parts.push(`TRANSPORT: ${kb.transport_routes}`);
  if (kb.facilities)         parts.push(`FACILITIES: ${kb.facilities}`);
  if (kb.school_timings)     parts.push(`SCHOOL TIMINGS: ${kb.school_timings}`);
  if (kb.campus_visit_slots) parts.push(`CAMPUS VISIT SLOTS: ${kb.campus_visit_slots}`);
  if (kb.scholarship_info)   parts.push(`SCHOLARSHIP: ${kb.scholarship_info}`);
  if (kb.faqs)               parts.push(`FAQs: ${kb.faqs}`);
  if (kb.contact_phone)      parts.push(`CONTACT: ${kb.contact_phone}`);
  if (kb.contact_email)      parts.push(`EMAIL: ${kb.contact_email}`);
  if (kb.principal_message)  parts.push(`PRINCIPAL'S MESSAGE: ${kb.principal_message}`);
  return parts.join('\n\n');
}

// ─── Auto-save lead from session ─────────────────────────
async function saveLead(session, lastMessage) {
  if (!session.phone || session.leadSaved) return;
  try {
    // Inline scoring to avoid circular require
    let score = 20; // phone present
    if (session.parentName) score += 8;
    if (session.studentName) score += 8;
    if (session.classInterested) score += 8;
    if (session.city) score += 4;
    if (session.timeline === 'within_7_days') score += 30;
    else if (session.timeline === 'within_30_days') score += 15;
    if (session.askedFees) score += 10;
    if (session.askedVisit) score += 10;
    if (session.askedDocs) score += 5;
    score = Math.min(score, 100);
    const category = score >= 80 ? 'Hot' : score >= 50 ? 'Warm' : 'Cold';
    const leadData = {
      parent_name: session.parentName || 'Website Visitor',
      student_name: session.studentName || '',
      class_interested: session.classInterested || '',
      phone: session.phone,
      city: session.city || '',
      admission_timeline: session.timeline || '',
      source: 'Chatbot',
      last_message: lastMessage || '',
      lead_score: score,
      lead_category: category
    };
    await supabase.from('leads').insert([leadData]);
    session.leadSaved = true;
    console.log(`✅ Lead auto-saved: ${session.parentName} (${session.phone}) — ${category}`);
  } catch (e) {
    console.error('Lead save error:', e.message);
  }
}

// ─────────────────────────────────────────
// POST /api/chat
// ─────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { message, userId, language } = req.body;
    if (!message || !message.trim())
      return res.status(400).json({ success: false, error: 'Message cannot be empty' });

    const sessionId = userId || 'web-user';
    if (!sessions[sessionId]) sessions[sessionId] = {};
    const session = sessions[sessionId];

    const msg = message.toLowerCase();

    // ── 1. Callback trigger detection
    const isCallback = CALLBACK_TRIGGERS.some(t => msg.includes(t));
    if (isCallback) {
      // Save callback request if we have phone
      if (session.phone) {
        await supabase.from('callback_requests').insert([{
          parent_name: session.parentName || 'Website Visitor',
          phone: session.phone,
          message: message,
          urgency: 'Urgent'
        }]).catch(() => {});
      }
      const callbackReply = language === 'hi'
        ? '📞 बिल्कुल! मैंने आपकी callback request दर्ज कर ली है। हमारा admission counsellor जल्द ही आपसे संपर्क करेंगे। क्या आप अपना नाम और phone number बता सकते हैं?'
        : '📞 Bilkul! Maine aapki callback request darj kar li hai. Hamara admission counsellor jald hi aapse contact karega. 😊\n\nKya aap apna naam aur phone number bata sakte hain?';
      return res.json({ success: true, message: callbackReply, isCallback: true, timestamp: new Date().toISOString() });
    }

    // ── 2. Fetch KB + check admission status
    let kb = null;
    try { kb = await fetchKB(); } catch (e) {}

    // ── 3. ADMISSION CLOSED CHECK
    if (kb && kb.admission_open === false) {
      const closedMsg = kb.admission_closed_msg ||
        'Abhi hamare school mein admission band hai. Agli admission cycle ke liye please school office se contact karein ya apna number chhod dein, hum aapko inform karenge.';

      // Still answer KB questions but prepend closed notice
      const prompt = `You are an admission assistant for ${kb.school_name || 'our school'}.

⚠️ IMPORTANT: Admissions are currently CLOSED.

CLOSED MESSAGE TO ALWAYS START WITH:
"${closedMsg}"

After showing the closed message, you may still answer general questions about the school from the knowledge below. But ALWAYS make it clear admissions are closed.

SCHOOL KNOWLEDGE BASE:
${formatKB(kb)}

Parent question: "${message}"

Reply in ${language === 'hi' ? 'Hindi' : language === 'hinglish' ? 'Hinglish' : 'friendly Hinglish'}. Keep it brief and helpful.`;

      const result = await model.generateContent(prompt);
      return res.json({ success: true, message: result.response.text(), admissionClosed: true, timestamp: new Date().toISOString() });
    }

    // ── 4. Track intent signals for lead scoring
    if (msg.includes('fee') || msg.includes('fees') || msg.includes('kitni')) session.askedFees = true;
    if (msg.includes('visit') || msg.includes('campus') || msg.includes('aana')) session.askedVisit = true;
    if (msg.includes('document') || msg.includes('certificate') || msg.includes('marksheet')) session.askedDocs = true;

    // ── 5. Extract lead info from message
    const phoneMatch = message.match(/\b[6-9]\d{9}\b/);
    if (phoneMatch && !session.phone) {
      session.phone = phoneMatch[0];
      await saveLead(session, message);
    }

    // Class detection
    const classMatch = message.match(/\b(nursery|lkg|ukg|class\s*\d+|grade\s*\d+|\d+th|\d+st|\d+nd|\d+rd)\b/i);
    if (classMatch) session.classInterested = classMatch[0];

    // Timeline detection
    if (msg.includes('7 day') || msg.includes('this week') || msg.includes('urgent') || msg.includes('jaldi'))
      session.timeline = 'within_7_days';
    else if (msg.includes('month') || msg.includes('30 day') || msg.includes('mahine'))
      session.timeline = 'within_30_days';
    else if (msg.includes('next year') || msg.includes('next session') || msg.includes('agli'))
      session.timeline = 'next_session';

    // ── 6. Build lead capture context
    const collected = [];
    if (session.parentName) collected.push('parent_name');
    if (session.studentName) collected.push('student_name');
    if (session.phone) collected.push('phone');
    if (session.classInterested) collected.push('class_interested');
    if (session.city) collected.push('city');

    const missing = ['parent_name','student_name','phone','class_interested','city'].filter(f => !collected.includes(f));
    const askNext = missing.length > 0 && !session.phone ? missing[0] : null;

    const askPrompts = {
      parent_name: 'Aur aapka naam kya hai? (Parent/Guardian name)',
      student_name: 'Aur aapke bachche ka naam kya hai?',
      phone: '📱 Kya aap apna phone number share kar sakte hain? Hum aapko admission details bhejenge.',
      class_interested: 'Kis class mein admission chahiye?',
      city: 'Aap kahan se hain? (City/Area)'
    };

    // ── 7. Generate AI response grounded in KB
    const kbContext = formatKB(kb);
    const prompt = `You are SchoolMitra AI — the official 24/7 admission assistant for ${kb?.school_name || 'our school'}.

STRICT RULES:
1. Answer ONLY from the KNOWLEDGE BASE below
2. If answer not in KB → say: "Is information ke liye main admission counsellor se callback arrange kar sakta hoon. Kya aap apna number denge?"
3. NEVER make up fees, dates, or policies
4. Be warm, helpful, Indian school friendly tone
5. Language: ${language === 'hi' ? 'Hindi only' : language === 'hinglish' ? 'Hinglish (Hindi words in Roman script + English)' : 'friendly Hinglish'}
6. Keep responses concise (4-6 lines max)
7. Use 1-2 emojis naturally

KNOWLEDGE BASE:
${kbContext}

COLLECTED LEAD INFO SO FAR:
${collected.length > 0 ? collected.map(c => `✅ ${c}`).join(', ') : 'None yet'}

NEXT INFO TO COLLECT (ask naturally at end of reply if relevant):
${askNext ? askPrompts[askNext] : 'All key info collected!'}

Parent's question: "${message}"

Reply:`;

    const result = await model.generateContent(prompt);
    let reply = result.response.text();

    // Append natural lead capture question if needed
    if (askNext && !session.phone && !reply.toLowerCase().includes('number') && !reply.toLowerCase().includes('naam')) {
      reply += `\n\n${askPrompts[askNext]}`;
    }

    // Update session with extracted name if we got a simple name reply
    if (!session.parentName && message.trim().split(' ').length <= 3 && !/[0-9]/.test(message) &&
        sessions[sessionId]._lastBotAsk === 'parent_name') {
      session.parentName = message.trim();
    }
    sessions[sessionId]._lastBotAsk = askNext;

    res.json({ success: true, message: reply, timestamp: new Date().toISOString() });

  } catch (error) {
    console.error('Chat route error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Admission Chat service running ✅' });
});

// Clean sessions every hour
setInterval(() => {
  const cutoff = Date.now() - 3600000;
  Object.keys(sessions).forEach(k => { if ((sessions[k]._ts || 0) < cutoff) delete sessions[k]; });
}, 3600000);

module.exports = router;
