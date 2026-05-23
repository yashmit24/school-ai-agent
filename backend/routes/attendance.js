const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET all attendance records
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('attendance').select('*, students(name, class, roll_no)').order('date', { ascending: false }).limit(100);
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET attendance for a student
router.get('/student/:studentId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('attendance').select('*').eq('student_id', req.params.studentId).order('date', { ascending: false });
    if (error) throw error;
    const total = data.length;
    const present = data.filter(r => r.status === 'present').length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
    res.json({ success: true, data, summary: { total, present, absent: total - present, percentage: `${percentage}%` } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST mark attendance
router.post('/', async (req, res) => {
  try {
    const { student_id, date, status } = req.body;
    const { data, error } = await supabase.from('attendance').insert([{ student_id, date, status }]).select();
    if (error) throw error;
    res.json({ success: true, data: data[0], message: 'Attendance marked' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
