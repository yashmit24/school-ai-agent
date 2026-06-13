const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwtMiddleware = require('../middleware/jwtMiddleware');

router.use(jwtMiddleware);

// ─────────────────────────────────────────
// GET /api/analytics/overview
// KPI cards + all chart data in one call
// ─────────────────────────────────────────
router.get('/overview', async (req, res) => {
  try {
    const [studentsRes, feesRes, attendanceRes, examsRes, scoresRes] = await Promise.allSettled([
      supabase.from('students').select('id, class, gender, created_at'),
      supabase.from('fees').select('amount, paid, due_date, created_at, student_id'),
      supabase.from('attendance').select('date, status, student_id'),
      supabase.from('exams').select('*').order('date', { ascending: true }),
      supabase.from('scores').select('marks_obtained, total_marks, subject, exam_name, created_at'),
    ]);

    const students   = studentsRes.status   === 'fulfilled' ? (studentsRes.value.data   || []) : [];
    const fees       = feesRes.status       === 'fulfilled' ? (feesRes.value.data        || []) : [];
    const attendance = attendanceRes.status === 'fulfilled' ? (attendanceRes.value.data  || []) : [];
    const exams      = examsRes.status      === 'fulfilled' ? (examsRes.value.data       || []) : [];
    const scores     = scoresRes.status     === 'fulfilled' ? (scoresRes.value.data      || []) : [];

    // ── KPI: Students
    const totalStudents = students.length;
    const newThisMonth  = students.filter(s => {
      const d = new Date(s.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    // ── KPI: Fees
    const totalFeeAmount = fees.reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const totalCollected = fees.filter(f => f.paid).reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const totalPending   = fees.filter(f => !f.paid).reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const collectionPct  = totalFeeAmount > 0 ? ((totalCollected / totalFeeAmount) * 100).toFixed(1) : 0;

    // ── KPI: Attendance
    const totalAtt  = attendance.length;
    const presentAtt = attendance.filter(a => a.status === 'present').length;
    const avgAttPct  = totalAtt > 0 ? ((presentAtt / totalAtt) * 100).toFixed(1) : 0;
    const belowThreshold = (() => {
      const byStudent = {};
      attendance.forEach(a => {
        if (!byStudent[a.student_id]) byStudent[a.student_id] = { total: 0, present: 0 };
        byStudent[a.student_id].total++;
        if (a.status === 'present') byStudent[a.student_id].present++;
      });
      return Object.values(byStudent).filter(s => s.total > 0 && (s.present / s.total) < 0.75).length;
    })();

    // ── KPI: Exams
    const today = new Date(); today.setHours(0,0,0,0);
    const upcomingExams = exams.filter(e => e.date && new Date(e.date) >= today).length;
    const completedExams = exams.filter(e => e.date && new Date(e.date) < today).length;

    // ── CHART 1: Fee collection by month (last 6 months)
    const feeByMonth = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      feeByMonth[key] = { collected: 0, pending: 0 };
    }
    fees.forEach(f => {
      const d = new Date(f.due_date || f.created_at);
      const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      if (feeByMonth[key] !== undefined) {
        if (f.paid) feeByMonth[key].collected += Number(f.amount) || 0;
        else        feeByMonth[key].pending   += Number(f.amount) || 0;
      }
    });

    // ── CHART 2: Attendance trend (last 14 days)
    const last14 = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      const dateStr = d.toISOString().split('T')[0];
      const dayRecs = attendance.filter(a => a.date === dateStr);
      const pct = dayRecs.length > 0
        ? Math.round((dayRecs.filter(a => a.status === 'present').length / dayRecs.length) * 100)
        : null;
      last14.push({
        date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        pct
      });
    }

    // ── CHART 3: Students by class
    const byClass = {};
    students.forEach(s => {
      const cls = s.class || 'Unknown';
      byClass[cls] = (byClass[cls] || 0) + 1;
    });
    const classSorted = Object.entries(byClass)
      .sort((a, b) => {
        const na = parseInt(a[0]) || 0;
        const nb = parseInt(b[0]) || 0;
        return na - nb;
      });

    // ── CHART 4: Gender distribution
    const genderCount = { Male: 0, Female: 0, Other: 0 };
    students.forEach(s => {
      const g = s.gender || 'Other';
      if (g === 'Male') genderCount.Male++;
      else if (g === 'Female') genderCount.Female++;
      else genderCount.Other++;
    });

    // ── CHART 5: Exam score avg by subject
    const scoresBySubject = {};
    scores.forEach(s => {
      const subj = s.subject || 'General';
      if (!scoresBySubject[subj]) scoresBySubject[subj] = { total: 0, count: 0 };
      if (s.marks_obtained !== null && s.total_marks > 0) {
        scoresBySubject[subj].total += (Number(s.marks_obtained) / Number(s.total_marks)) * 100;
        scoresBySubject[subj].count++;
      }
    });
    const subjectAvg = Object.entries(scoresBySubject).map(([subj, data]) => ({
      subject: subj,
      avg: data.count > 0 ? (data.total / data.count).toFixed(1) : 0
    })).sort((a, b) => b.avg - a.avg).slice(0, 8);

    // ── CHART 6: Attendance by status breakdown
    const absenceByClass = {};
    attendance.forEach(a => {
      if (a.status === 'absent') {
        const student = students.find(s => s.id === a.student_id);
        const cls = student?.class || 'Unknown';
        absenceByClass[cls] = (absenceByClass[cls] || 0) + 1;
      }
    });

    res.json({
      success: true,
      kpis: {
        totalStudents, newThisMonth,
        totalCollected, totalPending, collectionPct,
        avgAttPct, belowThreshold,
        upcomingExams, completedExams
      },
      charts: {
        feeByMonth,
        attendanceTrend: last14,
        studentsByClass: classSorted,
        genderDistribution: genderCount,
        subjectAvgScores: subjectAvg,
        absenceByClass
      }
    });
  } catch (err) {
    console.error('Analytics error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
