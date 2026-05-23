const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET all exams
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('exams').select('*').order('date', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET exams by class
router.get('/class/:class', async (req, res) => {
  try {
    const { data, error } = await supabase.from('exams').select('*').eq('class', req.params.class).order('date');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST add exam
router.post('/', async (req, res) => {
  try {
    const { name, subject, class: examClass, date, time, room } = req.body;
    const { data, error } = await supabase.from('exams').insert([{ name, subject, class: examClass, date, time, room }]).select();
    if (error) throw error;
    res.json({ success: true, data: data[0], message: 'Exam added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE exam
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('exams').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Exam deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
