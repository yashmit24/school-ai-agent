const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { sendWhatsAppMessage, markRead, sendTypingIndicator } = require('../services/whatsappService');
const { buildWhatsAppResponse } = require('../services/whatsappRAG');

// ─── In-memory session store (replace with Redis in production)
const sessions = {};    // { phone: { studentId, parentName, childrenList, lang, lastSeen } }
const msgIdSeen = new Set(); // Prevent duplicate processing
const rateLimiter = {};  // { phone: { count, resetAt } }

// ─────────────────────────────────────────
// Rate limiter helper
// ─────────────────────────────────────────
function checkRateLimit(phone) {
  const now = Date.now();
  if (!rateLimiter[phone] || rateLimiter[phone].resetAt < now) {
    rateLimiter[phone] = { count: 1, resetAt: now + 60000 };
    return true;
  }
  rateLimiter[phone].count++;
  return rateLimiter[phone].count <= 8; // 8 messages per minute
}

// ─────────────────────────────────────────
// Webhook signature verification
// ─────────────────────────────────────────
function verifySignature(req, res, next) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return next(); // Skip in sandbox mode

  const sig = req.headers['x-hub-signature-256'];
  if (!sig) return res.status(401).json({ error: 'No signature' });

  const expected = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  next();
}

// ─────────────────────────────────────────
// Auto-detect language from message
// ─────────────────────────────────────────
function detectLanguage(text) {
  // Check for Devanagari (Hindi) script
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  // Check for common Hinglish words
  const hinglishWords = ['kya','hai','meri','mere','bache','fees','kitni','kab','batao','chahiye','hua','hoga','nahi','ho'];
  const lower = text.toLowerCase();
  const found = hinglishWords.filter(w => lower.includes(w)).length;
  if (found >= 2) return 'hinglish';
  return 'en';
}

// ─────────────────────────────────────────
// GET /api/whatsapp/webhook — Meta verification
// ─────────────────────────────────────────
router.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified!');
    return res.status(200).send(challenge);
  }
  console.log('❌ WhatsApp webhook verification failed');
  res.status(403).send('Forbidden');
});

// ─────────────────────────────────────────
// POST /api/whatsapp/webhook — Receive messages
// ─────────────────────────────────────────
router.post('/webhook', verifySignature, async (req, res) => {
  // Always ACK immediately (Meta requires < 5s response)
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body   = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const entry  = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value  = change?.value;
    if (!value?.messages?.length) return;

    const message = value.messages[0];
    const from    = message.from;       // e.g. "919876543210"
    const msgId   = message.id;

    // Prevent duplicate processing
    if (msgIdSeen.has(msgId)) return;
    msgIdSeen.add(msgId);
    setTimeout(() => msgIdSeen.delete(msgId), 300000); // Cleanup after 5 min

    // Only handle text messages (for now)
    if (message.type !== 'text') {
      await sendWhatsAppMessage(from, '🤖 School Mitra sirf text messages samajh sakta hai. Apna sawaal text mein likhein.');
      return;
    }

    const text = (message.text?.body || '').trim();
    if (!text) return;

    // Rate limit
    if (!checkRateLimit(from)) {
      await sendWhatsAppMessage(from, '⏳ Aap bahut jaldi messages bhej rahe hain. 1 minute baad try karein.');
      return;
    }

    // Mark as read + typing indicator
    await markRead(msgId, from);
    await sendTypingIndicator(from);

    // Process and reply
    await handleMessage(from, text, message);

  } catch (err) {
    console.error('WhatsApp webhook error:', err.message);
  }
});

// ─────────────────────────────────────────
// Main message handler
// ─────────────────────────────────────────
async function handleMessage(from, text, rawMessage) {
  const session   = sessions[from] || {};
  const detectedLang = detectLanguage(text);

  // Language switch commands
  const lowerText = text.toLowerCase().trim();
  if (lowerText === 'hindi' || lowerText === 'hindi mein' || lowerText === 'हिंदी') {
    sessions[from] = { ...session, lang: 'hi', lastSeen: Date.now() };
    return sendWhatsAppMessage(from, '✅ अब मैं हिंदी में जवाब दूंगा! 🙏\nApna sawaal poochein.');
  }
  if (lowerText === 'english' || lowerText === 'in english') {
    sessions[from] = { ...session, lang: 'en', lastSeen: Date.now() };
    return sendWhatsAppMessage(from, '✅ I will now respond in English!\nPlease ask your question.');
  }
  if (lowerText === 'hinglish') {
    sessions[from] = { ...session, lang: 'hinglish', lastSeen: Date.now() };
    return sendWhatsAppMessage(from, '✅ Ab main Hinglish mein reply karunga! 😊\nApna sawaal poochein.');
  }

  // Help command
  if (['hi','hello','help','start','नमस्ते','हेलो'].includes(lowerText)) {
    const lang = session.lang || detectedLang;
    return sendWhatsAppMessage(from, buildWelcomeMsg(lang));
  }

  // Child selection (if multiple children)
  if (session.state === 'selecting_child' && session.children?.length) {
    const choice = parseInt(text.trim());
    if (!isNaN(choice) && choice >= 1 && choice <= session.children.length) {
      const chosen = session.children[choice - 1];
      sessions[from] = {
        ...session,
        state: 'active',
        studentId: chosen.id,
        studentName: chosen.name,
        studentClass: chosen.class,
        lastSeen: Date.now()
      };
      const lang = session.lang || detectedLang;
      const msg = lang === 'hi'
        ? `✅ ${chosen.name} (Class ${chosen.class}) select kiya gaya.\n\nAb aap fees, attendance, exam schedule pooch sakte hain.`
        : `✅ Selected: ${chosen.name} (Class ${chosen.class})\n\nYou can now ask about fees, attendance, exams and notices.`;
      return sendWhatsAppMessage(from, msg);
    }
  }

  // Authenticate parent via phone number
  let studentId = session.studentId;
  let studentLang = session.lang || detectedLang;

  if (!studentId) {
    // Lookup parent by WhatsApp phone number
    const last10 = from.replace(/\D/g, '').slice(-10);
    const { data: students } = await supabase
      .from('students')
      .select('id, name, class, section, roll_no, parent_name, phone')
      .like('phone', '%' + last10);

    if (!students || students.length === 0) {
      return sendWhatsAppMessage(from, buildNotFoundMsg(studentLang));
    }

    if (students.length === 1) {
      // Single child — auto-login
      studentId = students[0].id;
      sessions[from] = {
        state: 'active',
        studentId: students[0].id,
        studentName: students[0].name,
        studentClass: students[0].class,
        parentName: students[0].parent_name,
        lang: studentLang,
        lastSeen: Date.now()
      };
    } else {
      // Multiple children — ask to select
      sessions[from] = {
        state: 'selecting_child',
        children: students,
        lang: studentLang,
        lastSeen: Date.now()
      };
      const list = students.map((s, i) => `${i + 1}. ${s.name} — Class ${s.class}${s.section ? '-' + s.section : ''}`).join('\n');
      const msg = studentLang === 'hi'
        ? `👨‍👩‍👧 *Aapke ${students.length} bachche registered hain:*\n\n${list}\n\nKisi ek ka number reply karein (1, 2...)`
        : `👨‍👩‍👧 *You have ${students.length} children registered:*\n\n${list}\n\nReply with the number to select.`;
      return sendWhatsAppMessage(from, msg);
    }
  }

  // Update last seen
  sessions[from] = { ...sessions[from], lastSeen: Date.now() };

  // Fetch student context and generate RAG response
  try {
    const reply = await buildWhatsAppResponse(
      text,
      studentId,
      sessions[from].studentClass,
      studentLang
    );
    await sendWhatsAppMessage(from, reply);
  } catch (err) {
    console.error('WhatsApp RAG error:', err.message);
    const errMsg = studentLang === 'hi'
      ? '⚠️ Abhi jawab nahi de pa raha. School office se contact karein.'
      : '⚠️ Unable to fetch information right now. Please contact school office.';
    await sendWhatsAppMessage(from, errMsg);
  }
}

// ─────────────────────────────────────────
// Welcome message (multilingual)
// ─────────────────────────────────────────
function buildWelcomeMsg(lang) {
  const school = process.env.SCHOOL_NAME || 'School Mitra';
  if (lang === 'hi') {
    return `🏫 *${school}* में आपका स्वागत है!\n\nमैं School Mitra हूं — आपका AI school assistant.\n\n*आप पूछ सकते हैं:*\n📅 Attendance — "attendance kya hai?"\n💰 Fees — "fees kitni baki hai?"\n📝 Exam — "exam kab hai?"\n📢 Notice — "koi notice hai?"\n\n_भाषा बदलने के लिए टाइप करें: English / Hinglish / Hindi_`;
  }
  if (lang === 'hinglish') {
    return `🏫 *${school}* mein aapka swagat hai!\n\nMain School Mitra hoon — aapka AI school assistant.\n\n*Aap pooch sakte hain:*\n📅 Attendance — "attendance kaisi hai?"\n💰 Fees — "fees kitni baki hai?"\n📝 Exam — "exam kab hai?"\n📢 Notice — "koi notice hai?"\n\n_Language change karne ke liye type karein: English / Hindi_`;
  }
  return `🏫 Welcome to *${school}*!\n\nI'm School Mitra — your AI school assistant.\n\n*You can ask:*\n📅 Attendance — "What is my child's attendance?"\n💰 Fees — "Are fees paid?"\n📝 Exams — "When are the exams?"\n📢 Notices — "Any school notices?"\n\n_Switch language: Hindi / Hinglish_`;
}

// ─────────────────────────────────────────
// Not found message
// ─────────────────────────────────────────
function buildNotFoundMsg(lang) {
  if (lang === 'hi') return '❌ आपका नंबर school records में नहीं मिला।\n\nकृपया school office से संपर्क करें:\n📞 ' + (process.env.SCHOOL_PHONE || 'School office');
  if (lang === 'hinglish') return '❌ Aapka number school records mein nahi mila.\n\nPlease school office se contact karein:\n📞 ' + (process.env.SCHOOL_PHONE || 'School office');
  return '❌ Your phone number is not registered in our school records.\n\nPlease contact school office:\n📞 ' + (process.env.SCHOOL_PHONE || 'School office');
}

// ─────────────────────────────────────────
// Clean stale sessions every hour
// ─────────────────────────────────────────
setInterval(() => {
  const cutoff = Date.now() - 3600000; // 1 hour
  Object.keys(sessions).forEach(k => {
    if ((sessions[k].lastSeen || 0) < cutoff) delete sessions[k];
  });
}, 3600000);

module.exports = router;
