const { model } = require('../config/gemini');

// ─────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────
function buildSystemPrompt() {
  return `You are "School Mitra" — an intelligent AI assistant for ${process.env.SCHOOL_NAME || 'Sunshine Public School'}.
You help students, parents, and staff with school-related queries.

School Information:
- Name: ${process.env.SCHOOL_NAME || 'Sunshine Public School'}
- Address: ${process.env.SCHOOL_ADDRESS || '123 Education Street'}
- Phone: ${process.env.SCHOOL_PHONE || '+91-9876543210'}
- Email: ${process.env.SCHOOL_EMAIL || 'info@school.com'}
- Timings: ${process.env.SCHOOL_TIMINGS || '8:00 AM to 2:30 PM'}

CRITICAL RULES:
1. You have DIRECT ACCESS to the school database provided below. Use it!
2. NEVER say you cannot access records — you have the full data.
3. Answer with SPECIFIC details: names, amounts, dates, room numbers, phone numbers.
4. If a student is not found in the database, say "Record not found."
5. Keep answers short and accurate. Do NOT make up information.
6. Be polite and friendly.`;
}

// ─────────────────────────────────────────
// LANGUAGE INSTRUCTIONS
// ─────────────────────────────────────────
const LANG_INSTRUCTIONS = {
  en: 'Respond in clear English.',
  hi: 'केवल हिंदी में उत्तर दें।',
  hinglish: 'Respond in Hinglish (Roman script Hindi + English mix). Example: "Aapki fees 5000 rupaye hai!"'
};

// ─────────────────────────────────────────
// CONVERSATION HISTORY
// ─────────────────────────────────────────
const conversationHistory = {};

// ─────────────────────────────────────────
// Helper: Trim context data to avoid token limit errors
// Only send relevant fields, not full nested objects
// ─────────────────────────────────────────
function trimContext(contextData) {
  if (!contextData) return null;
  return {
    students: (contextData.students || []).slice(0, 30).map(s => ({
      id: s.id, name: s.name, class: s.class, roll_no: s.roll_no,
      parent_name: s.parent_name, phone: s.phone
    })),
    fees: (contextData.fees || []).slice(0, 30).map(f => ({
      student_id: f.student_id,
      student_name: f.students?.name || f.student_name,
      amount: f.amount, due_date: f.due_date, paid: f.paid, month: f.month
    })),
    attendance: (contextData.attendance || []).slice(0, 30).map(a => ({
      student_id: a.student_id,
      student_name: a.students?.name || a.student_name,
      date: a.date, status: a.status
    })),
    exams: (contextData.exams || []).slice(0, 20).map(e => ({
      name: e.name, subject: e.subject, class: e.class,
      date: e.date, time: e.time, room: e.room
    })),
    staff: (contextData.staff || []).slice(0, 20).map(s => ({
      name: s.name, role: s.role, subject: s.subject, phone: s.phone, email: s.email
    })),
    transport: (contextData.transport || []).slice(0, 15).map(t => ({
      route_name: t.route_name, stops: t.stops,
      driver_name: t.driver_name, driver_phone: t.driver_phone, bus_number: t.bus_number
    })),
    timetable: (contextData.timetable || []).slice(0, 20).map(t => ({
      class: t.class, day: t.day, period: t.period,
      subject: t.subject, teacher: t.teacher, time: t.time
    }))
  };
}

// ─────────────────────────────────────────
// MAIN: Generate AI Response
// ─────────────────────────────────────────
async function generateResponse(userMessage, userId = 'default', contextData = null, language = 'en') {
  try {
    if (!conversationHistory[userId]) {
      conversationHistory[userId] = [];
    }

    // Trim context to avoid token overflow
    const trimmed = trimContext(contextData);
    const dbContext = trimmed
      ? `\n\nSCHOOL DATABASE:\n${JSON.stringify(trimmed, null, 1)}`
      : '';

    const langInstruction = LANG_INSTRUCTIONS[language] || LANG_INSTRUCTIONS['en'];

    // Full message sent to Gemini — includes system prompt + DB + user question
    const fullMessage = `${buildSystemPrompt()}

LANGUAGE: ${langInstruction}
${dbContext}

Question: ${userMessage}
Answer:`;

    // Use last 4 history items for context (2 exchanges)
    const historyForChat = conversationHistory[userId].slice(-4);

    const chat = model.startChat({ history: historyForChat });

    const result = await chat.sendMessage(fullMessage);
    const response = result.response.text();

    // Save clean Q&A to history
    conversationHistory[userId].push({ role: 'user', parts: [{ text: userMessage }] });
    conversationHistory[userId].push({ role: 'model', parts: [{ text: response }] });

    if (conversationHistory[userId].length > 16) {
      conversationHistory[userId] = conversationHistory[userId].slice(-16);
    }

    return response;

  } catch (error) {
    console.error('Gemini Error:', error.message);
    if (error.message.includes('API_KEY')) {
      return '⚠️ AI service is not configured. Please contact the school office.';
    }
    if (error.message.includes('quota') || error.message.includes('limit')) {
      return '⚠️ AI usage limit reached. Please try again after a minute.';
    }
    return '🙏 School Mitra abhi available nahi hai. Thodi der baad try karein.';
  }
}

function clearHistory(userId) {
  delete conversationHistory[userId];
}

module.exports = { generateResponse, clearHistory };
