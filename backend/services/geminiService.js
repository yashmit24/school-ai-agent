const { model } = require('../config/gemini');

const SCHOOL_NAME = process.env.SCHOOL_NAME || 'Sunshine Public School';
const SCHOOL_ADDRESS = process.env.SCHOOL_ADDRESS || 'Contact school for address';
const SCHOOL_PHONE = process.env.SCHOOL_PHONE || 'Contact school office';
const SCHOOL_TIMINGS = process.env.SCHOOL_TIMINGS || '8:00 AM – 2:30 PM';

// ─────────────────────────────────────────
// STRICT RAG SYSTEM PROMPT
// ─────────────────────────────────────────
function buildRAGSystemPrompt(dbContext) {
  return `You are "School Mitra" — the official AI assistant for ${SCHOOL_NAME}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCHOOL INFORMATION:
• Name: ${SCHOOL_NAME}
• Address: ${SCHOOL_ADDRESS}
• Phone: ${SCHOOL_PHONE}
• Timings: ${SCHOOL_TIMINGS}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ABSOLUTE RULES — NEVER BREAK THESE:

RULE 1 — GROUNDED ONLY:
You MUST answer ONLY from the school database provided below.
Do NOT use any general knowledge, assumptions, or outside information.

RULE 2 — NO HALLUCINATION:
If a specific piece of information (student name, fee amount, date, attendance, exam, notice) is NOT present in the database below, you MUST say:
"This information is not available. Please contact school administration."
NEVER guess, infer, or make up any data.

RULE 3 — STUDENT PRIVACY:
Only share information that is relevant to the query.
Do not volunteer private data (phone, email, address) unless specifically asked and the data is in the database.

RULE 4 — SCOPE:
You only answer school-related questions.
If someone asks about topics unrelated to school (news, cricket, recipes, etc.), say:
"I am School Mitra, your school assistant. I can only help with school-related queries."

RULE 5 — FORMAT:
Keep answers concise, clear, and formatted with emojis where helpful.
Use bullet points for lists. Use ₹ for amounts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIVE SCHOOL DATABASE:
${dbContext}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Remember: If any specific information is not in the database above — say "Please contact school administration." — NEVER make it up.`;
}

// ─────────────────────────────────────────
// LANGUAGE INSTRUCTIONS
// ─────────────────────────────────────────
const LANG = {
  en:       'Respond in clear, simple English.',
  hi:       'केवल हिंदी में उत्तर दें। Simple और clear भाषा में।',
  hinglish: 'Respond in Hinglish (mix of Hindi words in English script). Example: "Aapke bache ki fees ₹5000 baki hai."'
};

// ─────────────────────────────────────────
// Conversation History Store (in-memory)
// ─────────────────────────────────────────
const chatHistory = {};

// ─────────────────────────────────────────
// Format DB context for AI (structured, readable)
// ─────────────────────────────────────────
function formatContext(ctx) {
  if (!ctx) return 'No database connection. Direct queries to school office.';

  const parts = [];

  // Students
  if (ctx.students?.length) {
    parts.push('STUDENTS (' + ctx.students.length + ' records):');
    ctx.students.slice(0, 50).forEach(s => {
      parts.push(`  • ${s.name} | Class ${s.class}${s.section ? '-' + s.section : ''} | Roll ${s.roll_no || '—'} | Parent: ${s.parent_name || '—'} | Phone: ${s.phone || '—'}${s.blood_group ? ' | Blood: ' + s.blood_group : ''}${s.allergies && s.allergies !== 'None' ? ' | Allergy: ' + s.allergies : ''}`);
    });
  } else {
    parts.push('STUDENTS: No student records found.');
  }

  // Fees
  if (ctx.fees?.length) {
    parts.push('\nFEE RECORDS (' + ctx.fees.length + ' records):');
    ctx.fees.slice(0, 50).forEach(f => {
      const name = f.students?.name || 'Unknown';
      const status = f.paid ? '✅ PAID' : '❌ UNPAID';
      const due = f.due_date ? 'Due: ' + f.due_date : '';
      const paid_on = f.paid && f.paid_date ? 'Paid on: ' + f.paid_date : '';
      parts.push(`  • ${name} (Class ${f.students?.class || '?'}) | ${f.description || 'Fee'} | ₹${f.amount || 0} | ${status} | ${due} ${paid_on}`);
    });
  } else {
    parts.push('\nFEE RECORDS: No fee records found.');
  }

  // Attendance
  if (ctx.attendance?.length) {
    // Group attendance by student
    const grouped = {};
    ctx.attendance.forEach(a => {
      const key = a.students?.name || a.student_id;
      if (!grouped[key]) grouped[key] = { name: key, class: a.students?.class, total: 0, present: 0, absent: 0, late: 0, recent: [] };
      grouped[key].total++;
      if (a.status === 'present') grouped[key].present++;
      else if (a.status === 'absent') grouped[key].absent++;
      else if (a.status === 'late') grouped[key].late++;
      if (grouped[key].recent.length < 5) grouped[key].recent.push(a.date + ':' + a.status);
    });

    parts.push('\nATTENDANCE SUMMARY:');
    Object.values(grouped).forEach(g => {
      const pct = g.total > 0 ? ((g.present / g.total) * 100).toFixed(1) : 0;
      parts.push(`  • ${g.name} (Class ${g.class || '?'}) | ${pct}% (${g.present}P/${g.absent}A/${g.late}L of ${g.total} days) | Recent: ${g.recent.join(', ')}`);
    });
  } else {
    parts.push('\nATTENDANCE: No attendance records found.');
  }

  // Exams
  if (ctx.exams?.length) {
    parts.push('\nEXAM SCHEDULE:');
    ctx.exams.forEach(e => {
      parts.push(`  • ${e.subject || e.name} | Class ${e.class || 'All'} | Date: ${e.date || '—'} | Time: ${e.time || '—'} | Room: ${e.room || '—'}`);
    });
  } else {
    parts.push('\nEXAM SCHEDULE: No exams scheduled.');
  }

  // Notices
  if (ctx.notices?.length) {
    parts.push('\nSCHOOL NOTICES:');
    ctx.notices.forEach(n => {
      parts.push(`  • [${n.created_at ? n.created_at.substring(0,10) : 'Date?'}] ${n.title || 'Notice'}: ${n.body || n.content || '—'}`);
    });
  } else {
    parts.push('\nNOTICES: No notices found.');
  }

  // Homework
  if (ctx.homework?.length) {
    parts.push('\nHOMEWORK:');
    ctx.homework.forEach(h => {
      parts.push(`  • Class ${h.class || '?'} | ${h.subject} | ${h.title} | Due: ${h.due_date || '—'}${h.description ? ' | ' + h.description : ''}`);
    });
  } else {
    parts.push('\nHOMEWORK: No homework records found.');
  }

  // Scores
  if (ctx.scores?.length) {
    parts.push('\nEXAM SCORES:');
    ctx.scores.slice(0, 40).forEach(s => {
      const name = s.students?.name || 'Unknown';
      parts.push(`  • ${name} (Class ${s.students?.class || '?'}) | ${s.exam_name || 'Exam'} | ${s.subject || ''} | Score: ${s.marks_obtained || '—'}/${s.total_marks || '—'} | ${s.grade || ''}`);
    });
  }

  return parts.join('\n');
}

// ─────────────────────────────────────────
// MAIN: Generate RAG Response
// ─────────────────────────────────────────
async function generateRAGResponse(userMessage, userId = 'default', contextData = null, language = 'en') {
  try {
    if (!chatHistory[userId]) chatHistory[userId] = [];

    const dbContext = formatContext(contextData);
    const systemPrompt = buildRAGSystemPrompt(dbContext);
    const langInstruction = LANG[language] || LANG.en;

    // Build the full grounded prompt
    const fullPrompt = `${systemPrompt}

LANGUAGE INSTRUCTION: ${langInstruction}

USER QUESTION: ${userMessage}

ANSWER (only from school database above, no hallucinations):`;

    // Use last 3 Q&A pairs for conversation context
    const recentHistory = chatHistory[userId].slice(-6);

    const chat = model.startChat({ history: recentHistory });
    const result = await chat.sendMessage(fullPrompt);
    const response = result.response.text();

    // Store clean history
    chatHistory[userId].push({ role: 'user', parts: [{ text: userMessage }] });
    chatHistory[userId].push({ role: 'model', parts: [{ text: response }] });

    // Keep last 10 exchanges only
    if (chatHistory[userId].length > 20) {
      chatHistory[userId] = chatHistory[userId].slice(-20);
    }

    return response;

  } catch (error) {
    console.error('Gemini RAG Error:', error.message);

    if (error.message?.includes('API_KEY') || error.message?.includes('api_key')) {
      return '⚠️ AI service is not configured. Please contact the school office.';
    }
    if (error.message?.includes('quota') || error.message?.includes('limit') || error.message?.includes('429')) {
      return '⚠️ AI usage limit reached. Please try again in a minute.';
    }
    if (error.message?.includes('SAFETY')) {
      return '⚠️ Your message could not be processed. Please rephrase your question.';
    }
    return '🙏 School Mitra is temporarily unavailable. Please try again shortly or contact the school office.';
  }
}

// ─────────────────────────────────────────
// Legacy export wrapper (backward compat)
// ─────────────────────────────────────────
async function generateResponse(userMessage, userId, contextData, language) {
  return generateRAGResponse(userMessage, userId, contextData, language);
}

function clearHistory(userId) {
  delete chatHistory[userId];
}

module.exports = { generateResponse, generateRAGResponse, clearHistory };
