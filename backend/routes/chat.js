const express = require('express');
const router = express.Router();
const { generateRAGResponse } = require('../services/geminiService');
const supabase = require('../config/supabase');

// ─────────────────────────────────────────
// Smart context fetcher — fetches only relevant data
// ─────────────────────────────────────────
async function fetchSchoolContext(message) {
  const msg = (message || '').toLowerCase();
  const context = {};

  // Run all DB queries in parallel
  const [
    studentsRes, feesRes, attendanceRes,
    examsRes, noticesRes, homeworkRes, scoresRes
  ] = await Promise.allSettled([
    supabase.from('students').select('id, name, class, section, roll_no, parent_name, phone, email, blood_group, allergies, admission_no').limit(80),
    supabase.from('fees').select('*, students(name, class, roll_no)').order('due_date', { ascending: false }).limit(80),
    supabase.from('attendance').select('*, students(name, class, roll_no)').order('date', { ascending: false }).limit(80),
    supabase.from('exams').select('*').order('date', { ascending: true }).limit(50),
    supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('homework').select('*').order('due_date', { ascending: false }).limit(30),
    supabase.from('scores').select('*, students(name, class, roll_no)').order('created_at', { ascending: false }).limit(60),
  ]);

  context.students   = studentsRes.status === 'fulfilled'  ? (studentsRes.value.data   || []) : [];
  context.fees       = feesRes.status === 'fulfilled'      ? (feesRes.value.data        || []) : [];
  context.attendance = attendanceRes.status === 'fulfilled' ? (attendanceRes.value.data  || []) : [];
  context.exams      = examsRes.status === 'fulfilled'     ? (examsRes.value.data        || []) : [];
  context.notices    = noticesRes.status === 'fulfilled'   ? (noticesRes.value.data      || []) : [];
  context.homework   = homeworkRes.status === 'fulfilled'  ? (homeworkRes.value.data     || []) : [];
  context.scores     = scoresRes.status === 'fulfilled'    ? (scoresRes.value.data       || []) : [];

  // ── Smart filtering: if student name mentioned, filter to their records
  const studentNames = context.students.map(s => s.name?.toLowerCase()).filter(Boolean);
  const mentionedStudent = studentNames.find(n => n.split(' ').some(word => msg.includes(word) && word.length > 3));

  if (mentionedStudent) {
    const student = context.students.find(s => s.name?.toLowerCase() === mentionedStudent);
    if (student) {
      context.fees       = context.fees.filter(f => f.student_id === student.id);
      context.attendance = context.attendance.filter(a => a.student_id === student.id);
      context.scores     = context.scores.filter(s => s.student_id === student.id);
    }
  }

  // ── Filter exams/homework by class if student found
  if (mentionedStudent) {
    const student = context.students.find(s => s.name?.toLowerCase() === mentionedStudent);
    if (student?.class) {
      context.exams    = context.exams.filter(e => !e.class || e.class === student.class);
      context.homework = context.homework.filter(h => !h.class || h.class === student.class);
    }
  }

  return context;
}

// ─────────────────────────────────────────
// POST /api/chat
// ─────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { message, userId, language } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, error: 'Message cannot be empty' });
    }

    // Fetch live school context from DB
    let context = null;
    try {
      context = await fetchSchoolContext(message);
    } catch (dbErr) {
      console.log('DB fetch skipped:', dbErr.message);
    }

    const response = await generateRAGResponse(
      message,
      userId || 'web-user',
      context,
      language || 'en'
    );

    res.json({
      success: true,
      message: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat route error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'RAG Chat service is running ✅' });
});

module.exports = router;
