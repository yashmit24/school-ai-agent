const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/admin/dashboard — Summary stats for admin panel
router.get('/dashboard', async (req, res) => {
  try {
    const [students, exams, unpaidFees, staff] = await Promise.all([
      supabase.from('students').select('id', { count: 'exact' }),
      supabase.from('exams').select('id', { count: 'exact' }),
      supabase.from('fees').select('id', { count: 'exact' }).eq('paid', false),
      supabase.from('staff').select('id', { count: 'exact' })
    ]);

    res.json({
      success: true,
      data: {
        totalStudents: students.count || 0,
        totalExams: exams.count || 0,
        unpaidFees: unpaidFees.count || 0,
        totalStaff: staff.count || 0,
        schoolName: process.env.SCHOOL_NAME || 'Sunshine Public School',
        serverTime: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/staff — All staff
router.get('/staff', async (req, res) => {
  try {
    const { data, error } = await supabase.from('staff').select('*').order('name');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/staff — Add staff member
router.post('/staff', async (req, res) => {
  try {
    const { name, role, subject, phone, email } = req.body;
    const { data, error } = await supabase.from('staff').insert([{ name, role, subject, phone, email }]).select();
    if (error) throw error;
    res.json({ success: true, data: data[0], message: 'Staff member added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/staff/:id
router.delete('/staff/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('staff').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Staff member removed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/timetable/:class — Get timetable for class
router.get('/timetable/:class', async (req, res) => {
  try {
    const { data, error } = await supabase.from('timetable').select('*').eq('class', req.params.class).order('day');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/timetable — Add/update timetable entry
router.post('/timetable', async (req, res) => {
  try {
    const { class: cls, day, period_1, period_2, period_3, period_4, period_5, period_6 } = req.body;
    const { data, error } = await supabase
      .from('timetable')
      .upsert([{ class: cls, day, period_1, period_2, period_3, period_4, period_5, period_6 }])
      .select();
    if (error) throw error;
    res.json({ success: true, data: data[0], message: 'Timetable updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
