const express = require('express');
const router = express.Router();
const { generateResponse } = require('../services/geminiService');
const { detectIntent } = require('../services/intentDetector');
const supabase = require('../config/supabase');

// POST /api/chat — main chatbot endpoint
router.post('/', async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, error: 'Message cannot be empty' });
    }

    // Detect what the user is asking about
    const intent = detectIntent(message);
    let contextData = null;

    // Fetch relevant data from database based on intent
    try {
      if (intent === 'exam') {
        const { data } = await supabase.from('exams').select('*').order('date', { ascending: true }).limit(20);
        contextData = data;
      } else if (intent === 'fees') {
        const { data } = await supabase.from('fees').select('*, students(*)').limit(50);
        contextData = data;
      } else if (intent === 'staff') {
        const { data } = await supabase.from('staff').select('*').limit(50);
        contextData = data;
      } else if (intent === 'transport') {
        const { data } = await supabase.from('transport').select('*').limit(20);
        contextData = data;
      } else if (intent === 'attendance') {
        const { data } = await supabase.from('attendance').select('*, students(*)').limit(50);
        contextData = data;
      } else if (intent === 'timetable') {
        const { data } = await supabase.from('timetable').select('*').limit(50);
        contextData = data;
      } else if (intent === 'students') {
        const { data } = await supabase.from('students').select('*').limit(50);
        contextData = data;
      }
    } catch (dbError) {
      // DB not configured yet — continue without context
      console.log('DB context fetch skipped:', dbError.message);
    }

    const aiResponse = await generateResponse(message, userId || 'web-user', contextData);

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
