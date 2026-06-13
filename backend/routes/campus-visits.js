const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwtMiddleware = require('../middleware/jwtMiddleware');

router.use(jwtMiddleware);

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('campus_visits').select('*').order('visit_date', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { parent_name, phone, student_name, class_interested, visit_date, visit_time, assigned_counsellor, notes, lead_id } = req.body;
    if (!parent_name || !phone || !visit_date || !visit_time)
      return res.status(400).json({ success: false, error: 'Parent name, phone, date and time are required.' });
    const { data, error } = await supabase.from('campus_visits').insert([{
      lead_id: lead_id || null, parent_name, phone, student_name, class_interested, visit_date, visit_time, assigned_counsellor, notes
    }]).select();
    if (error) throw error;
    // Update lead status if lead_id given
    if (lead_id) {
      await supabase.from('leads').update({ status: 'Visit Booked', updated_at: new Date().toISOString() }).eq('id', lead_id);
    }
    res.json({ success: true, data: data[0], message: 'Campus visit booked!' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('campus_visits').update(req.body).eq('id', req.params.id).select();
    if (error) throw error;
    res.json({ success: true, data: data[0], message: 'Visit updated!' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('campus_visits').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Visit deleted.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
