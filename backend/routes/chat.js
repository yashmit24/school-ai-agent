const express = require('express');
const router = express.Router();
const { generateResponse } = require('../services/geminiService');
const { detectIntent } = require('../services/intentDetector');
const supabase = require('../config/supabase');

// POST /api/chat — main chatbot endpoint
router.post('/', async (req, res) => {
  try {
    const { message, userId, language } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, error: 'Message cannot be empty' });
    }

    // Detect what the user is asking about
    const intent = detectIntent(message);
    let contextData = null;

    // Fetch relevant data from database in parallel to provide full context
    try {
      const [studentsRes, feesRes, attendanceRes, examsRes, staffRes, transportRes, timetableRes] = await Promise.all([
        supabase.from('students').select('*').limit(50),
        supabase.from('fees').select('*, students(*)').limit(50),
        supabase.from('attendance').select('*, students(*)').limit(50),
        supabase.from('exams').select('*').order('date', { ascending: true }).limit(50),
        supabase.from('staff').select('*').limit(50),
        supabase.from('transport').select('*').limit(50),
        supabase.from('timetable').select('*').limit(50)
      ]);

      contextData = {
        students: studentsRes.data || [],
        fees: feesRes.data || [],
        attendance: attendanceRes.data || [],
        exams: examsRes.data || [],
        staff: staffRes.data || [],
        transport: transportRes.data || [],
        timetable: timetableRes.data || []
      };
    } catch (dbError) {
      // DB not configured yet — continue without context
      console.log('DB context fetch skipped:', dbError.message);
    }

    // Pass language preference to AI (en / hi / hinglish)
    const aiResponse = await generateResponse(message, userId || 'web-user', contextData, language || 'en');

    res.json({
      success: true,
      message: aiResponse,
      intent: intent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat route error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/chat/health — check if AI is working
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Chat service is running ✅' });
});

module.exports = router;
