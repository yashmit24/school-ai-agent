const express = require('express');
const router = express.Router();
const { model } = require('../config/gemini');
const supabase = require('../config/supabase');

// ─── In-memory sessions ───────────────────────────────────
// Tracks: parentName, studentName, phone, classInterested, city,
//         timeline, askedFees, askedVisit, askedDocs,
//         turnCount, leadSaved, leadSavedId, _lastBotAsk, _ts
const sessions = {};

// ─── Keywords ─────────────────────────────────────────────
const CALLBACK_TRIGGERS = [
  'call me', 'call karo', 'phone karo', 'counsellor se baat',
  'counselor se baat', 'principal se baat', 'human se baat',
  'real person', 'agent se baat', 'baat karni hai', 'callback chahiye',
  'call back', 'call chahiye', 'mujhe call karo', 'please call'
];

const PHONE_REQUEST_TRIGGERS = [
  'apna number', 'phone number', 'contact karo', 'contact number'
];

// ─── Fetch Knowledge Base ─────────────────────────────────
async function fetchKB() {
  try {
    const { data } = await supabase.from('knowledge_base').select('*').limit(1).single();
    return data || null;
  } catch (e) { return null; }
}

// ─── Format KB as context ────────────────────────────────
function formatKB(kb) {
  if (!kb) return 'Knowledge base not configured yet.';
  const parts = [];
  if (kb.school_name)        parts.push(`SCHOOL: ${kb.school_name}`);
  if (kb.admission_open !== undefined) parts.push(`ADMISSION STATUS: ${kb.admission_open ? 'OPEN ✅' : 'CLOSED ❌'}`);
  if (!kb.admission_open && kb.admission_closed_msg) parts.push(`CLOSED MESSAGE: ${kb.admission_closed_msg}`);
  if (kb.classes_available)  parts.push(`CLASSES OFFERED: ${kb.classes_available}`);
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
  if (kb.contact_phone)      parts.push(`CONTACT PHONE: ${kb.contact_phone}`);
  if (kb.contact_email)      parts.push(`EMAIL: ${kb.contact_email}`);
  if (kb.principal_message)  parts.push(`PRINCIPAL MESSAGE: ${kb.principal_message}`);
  return parts.join('\n\n');
}

// ─── Save lead to Supabase ────────────────────────────────
async function saveLead(session, lastMessage) {
  if (!session.phone || session.leadSaved) return;
  try {
    let score = 20;
    if (session.parentName)    score += 8;
    if (session.studentName)   score += 8;
    if (session.classInterested) score += 8;
    if (session.city)          score += 4;
    if (session.timeline === 'within_7_days')   score += 30;
    else if (session.timeline === 'within_30_days') score += 15;
    if (session.askedFees)     score += 10;
    if (session.askedVisit)    score += 10;
    if (session.askedDocs)     score += 5;
    score = Math.min(score, 100);
    const category = score >= 80 ? 'Hot' : score >= 50 ? 'Warm' : 'Cold';

    await supabase.from('leads').insert([{
      parent_name:       session.parentName || 'Website Visitor',
      student_name:      session.studentName || '',
      class_interested:  session.classInterested || '',
      phone:             session.phone,
      city:              session.city || '',
      admission_timeline: session.timeline || '',
      source:            'Chatbot',
      last_message:      lastMessage || '',
      lead_score:        score,
      lead_category:     category
    }]);
    session.leadSaved = true;
    console.log(`✅ Lead saved: ${session.parentName} (${session.phone}) — ${category} [${score}]`);
  } catch (e) {
    console.error('Lead save error:', e.message);
  }
}

// ─── Update existing lead ─────────────────────────────────
async function updateLead(session, lastMessage) {
  if (!session.phone || !session.leadSaved) return;
  try {
    let score = 20;
    if (session.parentName)    score += 8;
    if (session.studentName)   score += 8;
    if (session.classInterested) score += 8;
    if (session.city)          score += 4;
    if (session.timeline === 'within_7_days')   score += 30;
    else if (session.timeline === 'within_30_days') score += 15;
    if (session.askedFees)     score += 10;
    if (session.askedVisit)    score += 10;
    if (session.askedDocs)     score += 5;
    score = Math.min(score, 100);
    const category = score >= 80 ? 'Hot' : score >= 50 ? 'Warm' : 'Cold';

    await supabase.from('leads')
      .update({ parent_name: session.parentName || 'Website Visitor', student_name: session.studentName || '',
                class_interested: session.classInterested || '', city: session.city || '',
                admission_timeline: session.timeline || '', last_message: lastMessage,
                lead_score: score, lead_category: category })
      .eq('phone', session.phone)
      .eq('source', 'Chatbot');
  } catch (e) { /* silent */ }
}

// ─── Decide what to naturally ask next ───────────────────
// Returns null if it's too early or nothing useful to ask
function getNextQuestion(session, turnCount) {
  // Turn 1: Never ask for personal info — just answer
  if (turnCount <= 1) return null;

  // Turn 2: Ask class if not known yet (very natural)
  if (turnCount === 2 && !session.classInterested) return 'class';

  // Turn 3: Ask student name if class is known
  if (turnCount === 3 && session.classInterested && !session.studentName) return 'student_name';

  // Turn 3+: Ask parent name if student name known
  if (turnCount >= 3 && session.studentName && !session.parentName) return 'parent_name';

  // Turn 4+: Ask phone only after meaningful engagement (class + at least one name)
  if (turnCount >= 4 && session.classInterested && (session.studentName || session.parentName) && !session.phone) return 'phone';

  // Turn 5+: Ask city if all else collected
  if (turnCount >= 5 && session.phone && !session.city) return 'city';

  return null;
}

const QUESTION_PROMPTS = {
  class:        'Kis class mein admission chahiye aapko?',
  student_name: 'Aur aapke bachche ka naam kya hai?',
  parent_name:  'Aur aap ka naam kya hai? (Parent/Guardian)',
  phone:        'Kya aap apna phone number share kar sakte hain? Hamare counsellor aapko personally assist karenge. 😊',
  city:         'Aap kahan se hain? (City/Area)'
};

// ─────────────────────────────────────────────────────────
// POST /api/chat — Main handler
// ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { message, userId, language } = req.body;
    if (!message || !message.trim())
      return res.status(400).json({ success: false, error: 'Message cannot be empty' });

    const sessionId = userId || 'web-user';
    if (!sessions[sessionId]) sessions[sessionId] = { turnCount: 0 };
    const session = sessions[sessionId];
    session.turnCount = (session.turnCount || 0) + 1;
    session._ts = Date.now();

    const msg = message.toLowerCase().trim();
    const lang = language === 'hi' ? 'Hindi' : language === 'hinglish' ? 'Hinglish' : 'Hinglish';

    // ── STEP 1: Extract info from message passively ───────
    // Phone number
    const phoneMatch = message.match(/\b[6-9]\d{9}\b/);
    if (phoneMatch && !session.phone) {
      session.phone = phoneMatch[0];
      await saveLead(session, message);
    }

    // Class
    const classMatch = message.match(/\b(nursery|lkg|ukg|pp1|pp2|class\s*\d+|grade\s*\d+|\d{1,2}(?:th|st|nd|rd))\b/i);
    if (classMatch && !session.classInterested) session.classInterested = classMatch[0];

    // Timeline signals
    if (msg.match(/\b(7 day|this week|urgent|abhi|jaldi|immediately)\b/)) session.timeline = 'within_7_days';
    else if (msg.match(/\b(month|30 day|mahine|soon)\b/)) session.timeline = 'within_30_days';
    else if (msg.match(/\b(next year|next session|agli|later)\b/)) session.timeline = 'next_session';

    // Intent signals
    if (msg.match(/\b(fee|fees|kitni|charges|cost|tuition)\b/)) session.askedFees = true;
    if (msg.match(/\b(visit|campus|aana|see school|dekhna)\b/)) session.askedVisit = true;
    if (msg.match(/\b(document|certificate|marksheet|tc|birth)\b/)) session.askedDocs = true;

    // Name extraction: if last bot asked for student name and this looks like a name
    const looksLikeName = message.trim().split(/\s+/).length <= 4 && !/\d/.test(message) && message.trim().length > 1;
    if (looksLikeName) {
      if (session._lastBotAsk === 'student_name' && !session.studentName) session.studentName = message.trim();
      if (session._lastBotAsk === 'parent_name' && !session.parentName)   session.parentName  = message.trim();
      if (session._lastBotAsk === 'city' && !session.city)                session.city        = message.trim();
      if (session._lastBotAsk === 'class' && !session.classInterested)    session.classInterested = message.trim();
    }

    // Update lead with new info
    if (session.leadSaved) await updateLead(session, message);

    // ── STEP 2: Callback trigger ──────────────────────────
    const wantsCallback = CALLBACK_TRIGGERS.some(t => msg.includes(t));
    if (wantsCallback) {
      if (session.phone) {
        await supabase.from('callback_requests').insert([{
          parent_name: session.parentName || 'Website Visitor',
          phone: session.phone,
          message: message,
          urgency: 'Urgent'
        }]).catch(() => {});
        return res.json({
          success: true,
          message: `📞 Bilkul! Maine aapki callback request register kar li hai.\n\nHamare admission counsellor jald hi **${session.phone}** pe aapse contact karenge. 🙏\n\nKoi aur sawaal ho toh batayein!`,
          isCallback: true,
          timestamp: new Date().toISOString()
        });
      } else {
        session._lastBotAsk = 'phone';
        return res.json({
          success: true,
          message: `📞 Bilkul! Hum aapko callback arrange kar denge.\n\nKya aap apna phone number share kar sakte hain? 😊`,
          isCallback: false,
          timestamp: new Date().toISOString()
        });
      }
    }

    // ── STEP 3: Fetch KB ──────────────────────────────────
    const kb = await fetchKB();

    // ── STEP 4: Admission closed check ───────────────────
    if (kb && kb.admission_open === false) {
      const closedMsg = kb.admission_closed_msg ||
        'Abhi hamare school mein admission band hai. Agli admission cycle ke liye please contact karein.';
      const prompt = `You are a helpful admission assistant for ${kb.school_name || 'our school'}.

⚠️ IMPORTANT: Admissions are currently CLOSED.

Always start your reply with this exact message:
"${closedMsg}"

After that, you may answer general school questions from the knowledge base. But ALWAYS make it clear admissions are closed.

SCHOOL KNOWLEDGE BASE:
${formatKB(kb)}

Parent's question: "${message}"

Reply in ${lang}. Keep it warm and brief (3-5 lines).`;
      const result = await model.generateContent(prompt);
      return res.json({ success: true, message: result.response.text(), admissionClosed: true, timestamp: new Date().toISOString() });
    }

    // ── STEP 5: Decide next natural question ─────────────
    const nextQ = getNextQuestion(session, session.turnCount);
    session._lastBotAsk = nextQ;

    // Build session summary for AI context
    const sessionInfo = [];
    if (session.classInterested) sessionInfo.push(`Class interested: ${session.classInterested}`);
    if (session.studentName)     sessionInfo.push(`Student name: ${session.studentName}`);
    if (session.parentName)      sessionInfo.push(`Parent name: ${session.parentName}`);
    if (session.phone)           sessionInfo.push(`Phone: ${session.phone} ✅`);
    if (session.city)            sessionInfo.push(`City: ${session.city}`);

    // ── STEP 6: Generate AI response ─────────────────────
    const prompt = `You are SchoolMitra AI — the warm, helpful admission assistant for ${kb?.school_name || 'our school'}.

CONVERSATION RULES (STRICT):
1. ALWAYS answer the parent's question FIRST using the Knowledge Base.
2. NEVER ask for personal details in the very first response.
3. Be conversational — like a helpful admission counsellor, NOT a lead form.
4. After answering, ask ONE natural follow-up question (provided below). Keep it casual.
5. If the question cannot be answered from the KB, say you'll arrange a callback — but do NOT ask for phone unless it's turn 4+.
6. NEVER make up fees, dates, or policies not in the KB.
7. Language: ${lang} — warm, friendly, Indian school tone.
8. Length: 3-6 lines max. Use 1-2 emojis naturally.
9. Do NOT start with "I" — start with the answer directly.

KNOWLEDGE BASE:
${formatKB(kb)}

CONVERSATION CONTEXT (turn ${session.turnCount}):
${sessionInfo.length > 0 ? sessionInfo.join('\n') : 'Fresh conversation — no details collected yet.'}

${nextQ ? `FOLLOW-UP TO ASK NATURALLY AT END (blend it in, don't make it feel like a form):
"${QUESTION_PROMPTS[nextQ]}"` : 'No follow-up needed — just answer helpfully.'}

Parent's message: "${message}"

Your reply:`;

    const result = await model.generateContent(prompt);
    let reply = result.response.text().trim();

    res.json({ success: true, message: reply, timestamp: new Date().toISOString() });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ success: false, error: 'Server error. Please try again.' });
  }
});

// ─── Health check ─────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Admission Chat service running ✅' });
});

// ─── Clean old sessions every hour ───────────────────────
setInterval(() => {
  const cutoff = Date.now() - 3600000;
  Object.keys(sessions).forEach(k => {
    if ((sessions[k]._ts || 0) < cutoff) delete sessions[k];
  });
}, 3600000);

module.exports = router;
