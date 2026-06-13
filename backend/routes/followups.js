const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwtMiddleware = require('../middleware/jwtMiddleware');
const { model } = require('../config/gemini');

router.use(jwtMiddleware);

// Auto-mark overdue followups
async function markOverdue() {
  const today = new Date().toISOString().split('T')[0];
  await supabase.from('followups').update({ status: 'Overdue' })
    .lt('followup_date', today).eq('status', 'Pending');
}

router.get('/', async (req, res) => {
  try {
    await markOverdue();
    let q = supabase.from('followups').select('*').order('followup_date', { ascending: true });
    if (req.query.status) q = q.eq('status', req.query.status);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { lead_name, phone, followup_date, followup_type, notes, lead_id } = req.body;
    if (!lead_name || !phone || !followup_date || !followup_type)
      return res.status(400).json({ success: false, error: 'Lead name, phone, date and type are required.' });

    // AI generate WhatsApp message
    let ai_message = '';
    try {
      const prompt = `Generate a short, friendly WhatsApp follow-up message in Hinglish for an Indian school admission team.
Lead: ${lead_name}
Follow-up type: ${followup_type}
Context: ${notes || 'General follow-up'}
Keep it: polite, brief (3-4 lines max), use 1-2 emojis, end with school contact offer.`;
      const result = await model.generateContent(prompt);
      ai_message = result.response.text();
    } catch (e) { ai_message = `Namaste ${lead_name} ji! School Mitra ki taraf se aapko ${followup_type} ke liye contact kar rahe hain. Kya aapko koi madad chahiye? 🙏`; }

    const { data, error } = await supabase.from('followups').insert([{
      lead_id: lead_id || null, lead_name, phone, followup_date, followup_type, notes, ai_message
    }]).select();
    if (error) throw error;
    // Update lead followup_date
    if (lead_id) {
      await supabase.from('leads').update({ followup_date, updated_at: new Date().toISOString() }).eq('id', lead_id);
    }
    res.json({ success: true, data: data[0], message: 'Follow-up created!' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('followups').update(req.body).eq('id', req.params.id).select();
    if (error) throw error;
    res.json({ success: true, data: data[0], message: 'Follow-up updated!' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('followups').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Follow-up deleted.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
