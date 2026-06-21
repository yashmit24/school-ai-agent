const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwtMiddleware = require('../middleware/jwtMiddleware');

router.use(jwtMiddleware);

// GET /api/leads/stats — PUBLIC (no auth needed for dashboard)
// NOTE: Must be before jwtMiddleware for token-free access
// This is handled below after auth middleware intentionally — just ensure token is passed

// ─── Lead Scoring Logic ─────────────────────────────────
function calcScore(lead) {
  let score = 0;
  if (lead.phone) score += 20;
  if (lead.email) score += 5;
  if (lead.student_name) score += 8;
  if (lead.class_interested) score += 8;
  if (lead.city) score += 4;
  if (lead.whatsapp) score += 5;
  if (lead.admission_timeline === 'within_7_days') score += 30;
  else if (lead.admission_timeline === 'within_30_days') score += 15;
  else if (lead.admission_timeline === 'next_session') score += 5;
  const msg = (lead.last_message || '').toLowerCase();
  if (msg.includes('fee') || msg.includes('fees')) score += 10;
  if (msg.includes('visit') || msg.includes('campus')) score += 10;
  if (msg.includes('document') || msg.includes('cert')) score += 5;
  const category = score >= 80 ? 'Hot' : score >= 50 ? 'Warm' : 'Cold';
  return { score: Math.min(score, 100), category };
}

// GET /api/leads  — list with filters
router.get('/', async (req, res) => {
  try {
    let q = supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (req.query.category) q = q.eq('lead_category', req.query.category);
    if (req.query.status)   q = q.eq('status', req.query.status);
    if (req.query.source)   q = q.eq('source', req.query.source);
    const { data, error } = await q;
    if (error) throw error;
    let result = data || [];
    if (req.query.search) {
      const s = req.query.search.toLowerCase();
      result = result.filter(l =>
        (l.parent_name||'').toLowerCase().includes(s) ||
        (l.student_name||'').toLowerCase().includes(s) ||
        (l.phone||'').includes(s)
      );
    }
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/leads/stats
router.get('/stats', async (req, res) => {
  try {
    const { data, error } = await supabase.from('leads').select('lead_category, status, source, created_at');
    if (error) throw error;
    const leads = data || [];
    const today = new Date().toISOString().split('T')[0];
    const stats = {
      total: leads.length,
      hot: leads.filter(l => l.lead_category === 'Hot').length,
      warm: leads.filter(l => l.lead_category === 'Warm').length,
      cold: leads.filter(l => l.lead_category === 'Cold').length,
      today: leads.filter(l => (l.created_at||'').startsWith(today)).length,
      converted: leads.filter(l => l.status === 'Converted').length,
      byStatus: {},
      bySource: {}
    };
    leads.forEach(l => {
      if (l.status)  stats.byStatus[l.status]  = (stats.byStatus[l.status]  || 0) + 1;
      if (l.source)  stats.bySource[l.source]  = (stats.bySource[l.source]  || 0) + 1;
    });
    res.json({ success: true, data: stats });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/leads
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    if (!body.parent_name || !body.phone)
      return res.status(400).json({ success: false, error: 'Parent name and phone are required.' });
    const { score, category } = calcScore(body);
    const { data, error } = await supabase.from('leads').insert([{
      ...body, lead_score: score, lead_category: category, updated_at: new Date().toISOString()
    }]).select();
    if (error) throw error;
    res.json({ success: true, data: data[0], message: 'Lead added!' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PUT /api/leads/:id
router.put('/:id', async (req, res) => {
  try {
    const body = req.body;
    const { score, category } = calcScore(body);
    const { data, error } = await supabase.from('leads').update({
      ...body, lead_score: score, lead_category: category, updated_at: new Date().toISOString()
    }).eq('id', req.params.id).select();
    if (error) throw error;
    res.json({ success: true, data: data[0], message: 'Lead updated!' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('leads').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Lead deleted.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;

