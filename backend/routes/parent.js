const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'school-mitra-super-secret-jwt-2024';

// ── Parent JWT middleware
function parentAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ success: false, error: 'Not authenticated' });
  try {
    req.parent = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    if (req.parent.role !== 'parent') throw new Error('Not a parent token');
    next();
  } catch(e) {
    res.status(401).json({ success: false, error: 'Session expired. Please login again.' });
  }
}

// ─────────────────────────────────────────
// POST /api/parent/login
// Login with Roll No + Phone
// ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { roll_no, phone } = req.body;
    if (!roll_no || !phone) {
      return res.status(400).json({ success: false, error: 'Roll number and phone number are required.' });
    }

    // Fetch all students with this roll number (could be multiple classes)
    const { data, error } = await supabase.from('students').select('*').eq('roll_no', roll_no);
    if (error) throw error;
    if (!data || !data.length) {
      return res.status(401).json({ success: false, error: 'No student found with this roll number.' });
    }

    // Normalize phone for flexible matching (last 10 digits)
    const inputPhone = phone.toString().replace(/\D/g, '').slice(-10);

    const student = data.find(s => {
      const sp = (s.phone || '').replace(/\D/g, '').slice(-10);
      return sp === inputPhone;
    });

    if (!student) {
      return res.status(401).json({ success: false, error: 'Phone number does not match our records.' });
    }

    const token = jwt.sign(
      { studentId: student.id, role: 'parent', studentClass: student.class, studentSection: student.section },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      student: {
        id: student.id,
        name: student.name,
        class: student.class,
        section: student.section,
        roll_no: student.roll_no,
        parent_name: student.parent_name,
        blood_group: student.blood_group,
        admission_no: student.admission_no,
        allergies: student.allergies
      }
    });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────
// GET /api/parent/me
// ─────────────────────────────────────────
router.get('/me', parentAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('students').select('*').eq('id', req.parent.studentId).single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────
// GET /api/parent/attendance
// ─────────────────────────────────────────
router.get('/attendance', parentAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('attendance')
      .select('*')
      .eq('student_id', req.parent.studentId)
      .order('date', { ascending: false })
      .limit(90);
    if (error) throw error;

    const total = data.length;
    const present = data.filter(r => r.status === 'present').length;
    const absent  = data.filter(r => r.status === 'absent').length;
    const late    = data.filter(r => r.status === 'late').length;
    const pct     = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    res.json({ success: true, data, summary: { total, present, absent, late, percentage: pct + '%' } });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────
// GET /api/parent/fees
// ─────────────────────────────────────────
router.get('/fees', parentAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('fees')
      .select('*')
      .eq('student_id', req.parent.studentId)
      .order('due_date', { ascending: false });
    if (error) throw error;

    const totalPaid = data.filter(f => f.paid).reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const totalDue  = data.filter(f => !f.paid).reduce((s, f) => s + (Number(f.amount) || 0), 0);

    res.json({ success: true, data, summary: { totalPaid, totalDue } });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────
// GET /api/parent/homework
// ─────────────────────────────────────────
router.get('/homework', parentAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('homework')
      .select('*')
      .eq('class', req.parent.studentClass)
      .order('due_date', { ascending: false })
      .limit(30);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────
// GET /api/parent/notices
// ─────────────────────────────────────────
router.get('/notices', parentAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('notices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────
// GET /api/parent/exams
// ─────────────────────────────────────────
router.get('/exams', parentAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('exams')
      .select('*')
      .eq('class', req.parent.studentClass)
      .order('date', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
