const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET all fees records
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('fees').select('*, students(name, class, roll_no)').order('due_date');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET unpaid fees (for reminders)
router.get('/unpaid', async (req, res) => {
  try {
    const { data, error } = await supabase.from('fees').select('*, students(name, class, phone, telegram_id)').eq('paid', false);
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET fees for specific student
router.get('/student/:studentId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('fees').select('*').eq('student_id', req.params.studentId);
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST add fee record
router.post('/', async (req, res) => {
  try {
    const { student_id, amount, due_date, description } = req.body;
    const { data, error } = await supabase.from('fees').insert([{ student_id, amount, due_date, description, paid: false }]).select();
    if (error) throw error;
    res.json({ success: true, data: data[0], message: 'Fee record added' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT mark fee as paid
router.put('/:id/pay', async (req, res) => {
  try {
    const { data, error } = await supabase.from('fees').update({ paid: true, paid_date: new Date().toISOString().split('T')[0] }).eq('id', req.params.id).select();
    if (error) throw error;
    res.json({ success: true, data: data[0], message: 'Fee marked as paid ✅' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
