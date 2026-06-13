const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwtMiddleware = require('../middleware/jwtMiddleware');

router.use(jwtMiddleware);

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('admission_fees').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { student_name, class: cls } = req.body;
    if (!student_name || !cls) return res.status(400).json({ success: false, error: 'Student name and class required.' });
    const { data, error } = await supabase.from('admission_fees').insert([req.body]).select();
    if (error) throw error;
    res.json({ success: true, data: data[0], message: 'Fee record added!' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('admission_fees').update(req.body).eq('id', req.params.id).select();
    if (error) throw error;
    res.json({ success: true, data: data[0], message: 'Fee record updated!' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('admission_fees').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Record deleted.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
