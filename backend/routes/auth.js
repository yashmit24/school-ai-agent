const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { sendWhatsAppMessage } = require('../services/twilioService');

const JWT_SECRET = process.env.JWT_SECRET || 'school-mitra-super-secret-jwt-2024';
const JWT_EXPIRES = '24h';
const RESET_EXPIRES_MS = 60 * 60 * 1000; // 1 hour

// ─────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: 'Email and password required' });

    const { data: user, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user)
      return res.status(401).json({ success: false, error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ success: false, error: 'Invalid email or password' });

    // Update last login
    await supabase.from('admin_users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      success: true,
      token,
      admin: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────
// GET /api/auth/me — Verify token
// ─────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer '))
      return res.status(401).json({ success: false, error: 'No token' });

    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    res.json({ success: true, admin: decoded });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
});

// ─────────────────────────────────────────
// POST /api/auth/logout — Client-side token deletion; server-side log
// ─────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// ─────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email required' });

    const { data: user } = await supabase
      .from('admin_users').select('*').eq('email', email.toLowerCase().trim()).single();

    // Always return success to prevent email enumeration
    if (!user) return res.json({ success: true, message: 'If this email exists, a reset link was sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + RESET_EXPIRES_MS).toISOString();

    await supabase.from('admin_users').update({
      reset_token: token,
      reset_token_expires: expires
    }).eq('id', user.id);

    const frontendUrl = process.env.FRONTEND_URL || 'https://school-ai-agent-eynr.onrender.com';
    const resetLink = `${frontendUrl}/reset-password.html?token=${token}`;
    const resetMsg = `🔐 School Mitra Password Reset\n\nHi ${user.name},\n\nClick this link to reset your password (valid 1 hour):\n${resetLink}\n\nIf you didn't request this, ignore this message.`;

    // Send via WhatsApp if phone exists, else log
    if (user.phone) {
      await sendWhatsAppMessage(user.phone, resetMsg);
    }
    console.log(`🔑 Reset link for ${email}:`, resetLink);

    res.json({ success: true, message: 'Reset link sent to your registered WhatsApp number.', ...(process.env.NODE_ENV !== 'production' && { resetLink }) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, error: 'Token and password required' });
    if (password.length < 8) return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });

    const { data: user } = await supabase
      .from('admin_users')
      .select('*')
      .eq('reset_token', token)
      .single();

    if (!user) return res.status(400).json({ success: false, error: 'Invalid or expired reset link' });
    if (new Date(user.reset_token_expires) < new Date())
      return res.status(400).json({ success: false, error: 'Reset link has expired. Please request a new one.' });

    const hash = await bcrypt.hash(password, 12);
    await supabase.from('admin_users').update({
      password_hash: hash,
      reset_token: null,
      reset_token_expires: null
    }).eq('id', user.id);

    res.json({ success: true, message: 'Password reset successfully! You can now login.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────
// POST /api/auth/setup — Create FIRST admin (only if no admins exist)
// ─────────────────────────────────────────
router.post('/setup', async (req, res) => {
  try {
    const { data: existing } = await supabase.from('admin_users').select('id').limit(1);
    if (existing && existing.length > 0)
      return res.status(403).json({ success: false, error: 'Admin already exists. Use login page.' });

    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, error: 'Name, email, password required' });
    if (password.length < 8) return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });

    const hash = await bcrypt.hash(password, 12);
    const { data, error } = await supabase.from('admin_users').insert([{
      name, email: email.toLowerCase().trim(), password_hash: hash, phone: phone || null, role: 'superadmin'
    }]).select();

    if (error) throw error;
    res.json({ success: true, message: `Admin "${name}" created! You can now login.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
