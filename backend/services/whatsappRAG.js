const { model } = require('../config/gemini');
const supabase = require('../config/supabase');

const SCHOOL_NAME    = process.env.SCHOOL_NAME    || 'School Mitra';
const SCHOOL_PHONE   = process.env.SCHOOL_PHONE   || 'school office';
const SCHOOL_TIMINGS = process.env.SCHOOL_TIMINGS || '8:00 AM – 2:30 PM';

// ─────────────────────────────────────────
// Fetch student context from DB
// ─────────────────────────────────────────
async function fetchStudentContext(studentId, studentClass) {
  const [studentRes, feesRes, attRes, examsRes, noticesRes, hwRes] = await Promise.allSettled([
    supabase.from('students').select('*').eq('id', studentId).single(),
    supabase.from('fees').select('*').eq('student_id', studentId).order('due_date', { ascending: false }).limit(20),
    supabase.from('attendance').select('*').eq('student_id', studentId).order('date', { ascending: false }).limit(60),
    supabase.from('exams').select('*').eq('class', studentClass).order('date', { ascending: true }).limit(15),
    supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('homework').select('*').eq('class', studentClass).order('due_date', { ascending: false }).limit(10),
  ]);

  const student    = studentRes.status  === 'fulfilled' ? studentRes.value.data  : null;
  const fees       = feesRes.status     === 'fulfilled' ? (feesRes.value.data    || []) : [];
  const attendance = attRes.status      === 'fulfilled' ? (attRes.value.data     || []) : [];
  const exams      = examsRes.status    === 'fulfilled' ? (examsRes.value.data   || []) : [];
  const notices    = noticesRes.status  === 'fulfilled' ? (noticesRes.value.data || []) : [];
  const homework   = hwRes.status       === 'fulfilled' ? (hwRes.value.data      || []) : [];

  return { student, fees, attendance, exams, notices, homework };
}

// ─────────────────────────────────────────
// Format context for AI (compact for WhatsApp)
// ─────────────────────────────────────────
function formatContext(ctx) {
  const { student, fees, attendance, exams, notices, homework } = ctx;
  const parts = [];

  if (student) {
    parts.push(`STUDENT: ${student.name} | Class ${student.class}${student.section ? '-' + student.section : ''} | Roll ${student.roll_no || '—'} | Parent: ${student.parent_name}${student.blood_group ? ' | Blood: ' + student.blood_group : ''}${student.allergies && student.allergies !== 'None' ? ' | Allergy: ' + student.allergies : ''}`);
  }

  // Fees summary
  const totalDue  = fees.filter(f => !f.paid).reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const totalPaid = fees.filter(f => f.paid).reduce((s, f) => s + (Number(f.amount) || 0), 0);
  parts.push(`\nFEES: Total Paid=₹${totalPaid} | Total Due=₹${totalDue}`);
  fees.forEach(f => {
    const due = f.due_date ? f.due_date.substring(0, 10) : '—';
    parts.push(`  • ${f.description || 'Fee'} | ₹${f.amount || 0} | ${f.paid ? '✅ PAID' + (f.paid_date ? ' on ' + f.paid_date.substring(0, 10) : '') : '❌ UNPAID | Due: ' + due}`);
  });

  // Attendance summary
  const total   = attendance.length;
  const present = attendance.filter(a => a.status === 'present').length;
  const absent  = attendance.filter(a => a.status === 'absent').length;
  const late    = attendance.filter(a => a.status === 'late').length;
  const pct     = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
  parts.push(`\nATTENDANCE: ${pct}% (${present} Present / ${absent} Absent / ${late} Late of ${total} total days)`);
  // Last 5 records
  attendance.slice(0, 5).forEach(a => {
    parts.push(`  • ${a.date} — ${a.status}`);
  });

  // Exams
  if (exams.length) {
    parts.push('\nEXAM SCHEDULE:');
    exams.forEach(e => parts.push(`  • ${e.subject || e.name} | ${e.date || '—'} | ${e.time || '—'} | Room ${e.room || '—'}`));
  } else {
    parts.push('\nEXAM SCHEDULE: No upcoming exams found.');
  }

  // Notices
  if (notices.length) {
    parts.push('\nSCHOOL NOTICES:');
    notices.forEach(n => parts.push(`  • [${(n.created_at || '').substring(0, 10)}] ${n.title}: ${n.body || ''}`));
  } else {
    parts.push('\nNOTICES: No notices currently.');
  }

  // Homework
  if (homework.length) {
    parts.push('\nHOMEWORK:');
    homework.forEach(h => parts.push(`  • ${h.subject} | ${h.title} | Due: ${h.due_date || '—'}`));
  } else {
    parts.push('\nHOMEWORK: No homework assigned.');
  }

  return parts.join('\n');
}

// ─────────────────────────────────────────
// Language-specific system prompts
// ─────────────────────────────────────────
const LANG_INSTRUCTIONS = {
  en: {
    label: 'ENGLISH',
    instruction: 'Respond ONLY in clear English. Keep it brief (3-5 lines max for WhatsApp).',
    notFound: `This information is not available. Please contact school administration at ${SCHOOL_PHONE}.`,
    offTopic: `I am School Mitra, your school assistant. I can only help with school-related queries like fees, attendance, exams and notices.`
  },
  hi: {
    label: 'HINDI',
    instruction: 'केवल हिंदी में जवाब दें। WhatsApp के लिए छोटा और स्पष्ट जवाब दें (3-5 lines)।',
    notFound: `यह जानकारी उपलब्ध नहीं है। कृपया school office से संपर्क करें: ${SCHOOL_PHONE}`,
    offTopic: `मैं School Mitra हूं — आपका school assistant। मैं केवल school से जुड़े सवालों का जवाब देता हूं।`
  },
  hinglish: {
    label: 'HINGLISH',
    instruction: 'Hinglish mein jawab do (Roman script Hindi + English mix). WhatsApp ke liye short rakho (3-5 lines).',
    notFound: `Yeh information available nahi hai. School office se contact karein: ${SCHOOL_PHONE}`,
    offTopic: `Main School Mitra hoon — sirf school se related sawaalon ka jawab de sakta hoon.`
  }
};

// ─────────────────────────────────────────
// Build RAG response for WhatsApp
// ─────────────────────────────────────────
async function buildWhatsAppResponse(userMessage, studentId, studentClass, lang = 'en') {
  const L = LANG_INSTRUCTIONS[lang] || LANG_INSTRUCTIONS.en;

  // Fetch live context
  const ctx = await fetchStudentContext(studentId, studentClass);
  const dbContext = formatContext(ctx);

  const prompt = `You are "School Mitra" — official WhatsApp AI assistant for ${SCHOOL_NAME}.
School Timings: ${SCHOOL_TIMINGS}

━━━━ ABSOLUTE RULES ━━━━
1. Answer ONLY from the DATABASE below. NEVER guess or make up data.
2. If specific information is not in the database → say: "${L.notFound}"
3. If question is NOT school-related → say: "${L.offTopic}"
4. Keep response SHORT — this is WhatsApp (max 5 lines, use emojis).
5. Use *bold* for important numbers/dates (WhatsApp markdown).
6. Language: ${L.instruction}
━━━━━━━━━━━━━━━━━━━━━━━━

LIVE SCHOOL DATABASE:
${dbContext}

Parent's WhatsApp message: "${userMessage}"

Reply (${L.label}, WhatsApp format, brief, grounded only):`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

module.exports = { buildWhatsAppResponse, fetchStudentContext };
