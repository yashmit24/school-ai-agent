const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// ─────────────────────────────────────────
// GET /api/branding — Get school branding (PUBLIC — used by all pages)
// ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('school_branding')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Return defaults if no branding set yet
    const branding = data || {
      school_name: process.env.SCHOOL_NAME || 'Sunshine Public School',
      tagline: 'Educating for a Better Tomorrow',
      principal_name: '',
      address: process.env.SCHOOL_ADDRESS || '',
      phone: process.env.SCHOOL_PHONE || '',
      email: process.env.SCHOOL_EMAIL || '',
      logo_url: '',
      primary_color: '#6c63ff',
      secondary_color: '#48cfad',
      accent_color: '#f7c948',
      dark_mode: true
    };

    res.json({ success: true, data: branding });
  } catch (err) {
    console.error('Branding GET error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────
// PUT /api/branding — Update school branding (ADMIN only)
// ─────────────────────────────────────────
router.put('/', async (req, res) => {
  try {
    const {
      school_name, tagline, principal_name,
      address, phone, email, logo_url,
      primary_color, secondary_color, accent_color, dark_mode
    } = req.body;

    // Check if a record already exists
    const { data: existing } = await supabase
      .from('school_branding')
      .select('id')
      .limit(1)
      .single();

    let result;
    if (existing?.id) {
      // Update existing
      result = await supabase
        .from('school_branding')
        .update({
          school_name, tagline, principal_name,
          address, phone, email, logo_url,
          primary_color, secondary_color, accent_color, dark_mode,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select();
    } else {
      // Insert new
      result = await supabase
        .from('school_branding')
        .insert([{
          school_name, tagline, principal_name,
          address, phone, email, logo_url,
          primary_color, secondary_color, accent_color, dark_mode
        }])
        .select();
    }

    if (result.error) throw result.error;
    res.json({ success: true, data: result.data[0], message: 'Branding updated successfully!' });
  } catch (err) {
    console.error('Branding PUT error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
