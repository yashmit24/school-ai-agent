const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET all students
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('students').select('*').order('name');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single student by ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('students').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST add new student
router.post('/', async (req, res) => {
  try {
    const { name, class: studentClass, roll_no, parent_name, phone, email, telegram_id } = req.body;
    const { data, error } = await supabase.from('students').insert([
      { name, class: studentClass, roll_no, parent_name, phone, email, telegram_id }
    ]).select();
    if (error) throw error;
    res.json({ success: true, data: data[0], message: 'Student added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update student
router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('students').update(req.body).eq('id', req.params.id).select();
    if (error) throw error;
    res.json({ success: true, data: data[0], message: 'Student updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE student
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('students').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
