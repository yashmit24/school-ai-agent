const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// GET — public (chatbot needs this without auth)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('knowledge_base').select('*').limit(1).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ success: true, data: data || null });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PUT — admin only
router.put('/', jwtMiddleware, async (req, res) => {
  try {
    const { data: existing } = await supabase.from('knowledge_base').select('id').limit(1).single();
    let result;
    if (existing) {
      const { data, error } = await supabase.from('knowledge_base')
        .update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', existing.id).select();
      if (error) throw error;
      result = data[0];
    } else {
      const { data, error } = await supabase.from('knowledge_base').insert([req.body]).select();
      if (error) throw error;
      result = data[0];
    }
    res.json({ success: true, data: result, message: 'Knowledge base updated!' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
