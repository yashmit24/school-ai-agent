const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET all students (with optional search)
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('students').select('*').order('class').order('roll_no');
    const { search, class: cls } = req.query;
    if (cls) query = query.eq('class', cls);
    const { data, error } = await query;
    if (error) throw error;

    // Client-side search fallback
    let result = data;
    if (search) {
      const q = search.toLowerCase();
      result = data.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q) ||
        (s.parent_name || '').toLowerCase().includes(q)
      );
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single student
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
    const {
      name, class: studentClass, section, roll_no, admission_no, gender, dob,
      blood_group, address, parent_name, phone, email, emergency_contact,
      telegram_id, allergies, medical_notes
    } = req.body;

    if (!name || !studentClass || !parent_name || !phone) {
      return res.status(400).json({ success: false, error: 'Name, Class, Parent Name and Phone are required.' });
    }

    const { data, error } = await supabase.from('students').insert([{
      name, class: studentClass, section, roll_no: roll_no || null,
      admission_no, gender, dob: dob || null, blood_group, address,
      parent_name, phone, email, emergency_contact, telegram_id,
      allergies, medical_notes
    }]).select();

    if (error) throw error;
    res.json({ success: true, data: data[0], message: 'Student added successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update student
router.put('/:id', async (req, res) => {
  try {
    const {
      name, class: studentClass, section, roll_no, admission_no, gender, dob,
      blood_group, address, parent_name, phone, email, emergency_contact,
      telegram_id, allergies, medical_notes
    } = req.body;

    const { data, error } = await supabase.from('students').update({
      name, class: studentClass, section, roll_no: roll_no || null,
      admission_no, gender, dob: dob || null, blood_group, address,
      parent_name, phone, email, emergency_contact, telegram_id,
      allergies, medical_notes,
      updated_at: new Date().toISOString()
    }).eq('id', req.params.id).select();

    if (error) throw error;
    res.json({ success: true, data: data[0], message: 'Student updated!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE student
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('students').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Student deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
