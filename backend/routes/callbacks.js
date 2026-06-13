const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwtMiddleware = require('../middleware/jwtMiddleware');

router.use(jwtMiddleware);

router.get('/', async (req, res) => {
  try {
    let q = supabase.from('callback_requests').select('*').order('created_at', { ascending: false });
    if (req.query.status) q = q.eq('status', req.query.status);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { parent_name, phone } = req.body;
    if (!parent_name || !phone) return res.status(400).json({ success: false, error: 'Name and phone required.' });
    const { data, error } = await supabase.from('callback_requests').insert([{
      ...req.body, urgency: req.body.urgency || 'Normal'
    }]).select();
    if (error) throw error;
    // Also mark lead as callback_requested
    if (req.body.lead_id) {
      await supabase.from('leads').update({ callback_requested: true, updated_at: new Date().toISOString() }).eq('id', req.body.lead_id);
    }
    res.json({ success: true, data: data[0], message: 'Callback request created!' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('callback_requests').update(req.body).eq('id', req.params.id).select();
    if (error) throw error;
    res.json({ success: true, data: data[0], message: 'Callback updated!' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('callback_requests').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
