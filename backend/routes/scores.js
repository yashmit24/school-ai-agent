const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/scores — All scores with student info
router.get('/', async (req, res) => {
  try {
    const { class: cls, period, exam_id } = req.query;
    let query = supabase.from('scores').select('*, students(name, class, roll_no)').order('marks_obtained', { ascending: false });
    if (cls) query = query.eq('students.class', cls);
    if (period) query = query.eq('period', period);
    if (exam_id) query = query.eq('exam_id', exam_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/scores/leaderboard — Class leaderboard with rankings
router.get('/leaderboard', async (req, res) => {
  try {
    const { class: cls, period } = req.query;

    let query = supabase
      .from('scores')
      .select('student_id, marks_obtained, total_marks, period, students(name, class, roll_no)');

    if (period) query = query.eq('period', period);

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate scores per student
    const studentMap = {};
    for (const row of data || []) {
      const sid = row.student_id;
      if (!studentMap[sid]) {
        studentMap[sid] = {
          student_id: sid,
          name: row.students?.name || 'Unknown',
          class: row.students?.class || '',
          roll_no: row.students?.roll_no || '',
          total_obtained: 0,
          total_possible: 0,
          subjects: 0
        };
      }
      studentMap[sid].total_obtained += row.marks_obtained || 0;
      studentMap[sid].total_possible += row.total_marks || 100;
      studentMap[sid].subjects += 1;
    }

    // Filter by class if requested
    let leaderboard = Object.values(studentMap);
    if (cls) leaderboard = leaderboard.filter(s => s.class === cls);

    // Calculate percentage and sort
    leaderboard = leaderboard.map(s => ({
      ...s,
      percentage: s.total_possible > 0
        ? ((s.total_obtained / s.total_possible) * 100).toFixed(1)
        : '0.0'
    })).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));

    // Add rank
    leaderboard = leaderboard.map((s, i) => ({ ...s, rank: i + 1 }));

    res.json({ success: true, data: leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/scores — Add a score entry
router.post('/', async (req, res) => {
  try {
    const { student_id, exam_id, subject, marks_obtained, total_marks, exam_date, period } = req.body;
    if (!student_id || marks_obtained === undefined) {
      return res.status(400).json({ success: false, error: 'student_id and marks_obtained required' });
    }
    const { data, error } = await supabase.from('scores').insert([{
      student_id, exam_id, subject, marks_obtained,
      total_marks: total_marks || 100,
      exam_date: exam_date || new Date().toISOString().split('T')[0],
      period: period || 'monthly'
    }]).select();
    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/scores/:id — Delete a score
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('scores').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Score deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
