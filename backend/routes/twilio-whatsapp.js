const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const supabase = require('../config/supabase');
const { buildWhatsAppResponse } = require('../services/whatsappRAG');

// ── In-memory session & rate limiter store
const sessions    = {};
const rateLimiter = {};
const msgSeen     = new Set();

// ─────────────────────────────────────────
// Twilio signature validation (optional but recommended)
// ─────────────────────────────────────────
function validateTwilio(req, res, next) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return next(); // skip in dev if not set

  const signature = req.headers['x-twilio-signature'];
  const url       = process.env.BACKEND_URL
    ? process.env.BACKEND_URL + '/api/twilio-whatsapp/webhook'
    : req.protocol + '://' + req.get('host') + req.originalUrl;

  const valid = twilio.validateRequest(authToken, signature, url, req.body);
  if (!valid) {
    console.warn('⚠️  Invalid Twilio signature');
    return res.status(403).send('Forbidden');
  }
  next();
}

// ─────────────────────────────────────────
// Rate limiter helper
// ─────────────────────────────────────────
function checkRate(phone) {
  const now = Date.now();
  if (!rateLimiter[phone] || rateLimiter[phone].resetAt < now) {
    rateLimiter[phone] = { count: 1, resetAt: now + 60000 };
    return true;
  }
  rateLimiter[phone].count++;
  return rateLimiter[phone].count <= 8;
}

// ─────────────────────────────────────────
// Auto language detection
// ─────────────────────────────────────────
function detectLang(text) {
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  const hinglishWords = ['kya','hai','meri','mere','bache','fees','kitni','kab','batao',
    'chahiye','hua','hoga','nahi','kaisi','aur','mera'];
  const lower = text.toLowerCase();
  const count = hinglishWords.filter(w => lower.includes(w)).length;
  if (count >= 2) return 'hinglish';
  return 'en';
}

// ─────────────────────────────────────────
// Build TwiML text reply
// ─────────────────────────────────────────
function twimlReply(res, message) {
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(message);
  res.type('text/xml');
  res.send(twiml.toString());
}

// ─────────────────────────────────────────
// POST /api/twilio-whatsapp/webhook
// ─────────────────────────────────────────
router.post('/webhook', validateTwilio, async (req, res) => {
  const body   = req.body;
  const from   = (body.From || '').replace('whatsapp:', '');  // e.g. +919876543210
  const text   = (body.Body || '').trim();
  const msgId  = body.MessageSid || (from + text);

  if (!from || !text) return res.sendStatus(200);

  // Deduplicate
  if (msgSeen.has(msgId)) return res.sendStatus(200);
  msgSeen.add(msgId);
  setTimeout(() => msgSeen.delete(msgId), 300000);

  // Rate limit
  if (!checkRate(from)) {
    return twimlReply(res, '⏳ Aap bahut jaldi messages bhej rahe hain. 1 minute baad try karein.');
  }

  const session    = sessions[from] || {};
  const detectedLang = detectLang(text);
  const lowerText  = text.toLowerCase().trim();

  // ── Language switch
  if (['hindi', 'hindi mein', 'हिंदी'].includes(lowerText)) {
    sessions[from] = { ...session, lang: 'hi', lastSeen: Date.now() };
    return twimlReply(res, '✅ अब मैं हिंदी में जवाब दूंगा! 🙏\nApna sawaal poochein।');
  }
  if (['english', 'in english'].includes(lowerText)) {
    sessions[from] = { ...session, lang: 'en', lastSeen: Date.now() };
    return twimlReply(res, '✅ I will now respond in English!\nPlease ask your question.');
  }
  if (lowerText === 'hinglish') {
    sessions[from] = { ...session, lang: 'hinglish', lastSeen: Date.now() };
    return twimlReply(res, '✅ Ab main Hinglish mein reply karunga! 😊');
  }

  // ── Welcome / help
  if (['hi', 'hello', 'help', 'start', 'नमस्ते', 'हेलो', 'hey'].includes(lowerText)) {
    const lang = session.lang || detectedLang;
    return twimlReply(res, buildWelcome(lang));
  }

  // ── Multi-child selection
  if (session.state === 'selecting_child' && session.children?.length) {
    const choice = parseInt(text.trim());
    if (!isNaN(choice) && choice >= 1 && choice <= session.children.length) {
      const chosen = session.children[choice - 1];
      sessions[from] = {
        ...session, state: 'active',
        studentId: chosen.id, studentName: chosen.name,
        studentClass: chosen.class, lastSeen: Date.now()
      };
      const lang = session.lang || detectedLang;
      const msg = lang === 'hi'
        ? `✅ ${chosen.name} (Class ${chosen.class}) select hua।\nAb fees, attendance, exams pooch sakte hain।`
        : `✅ Selected: *${chosen.name}* (Class ${chosen.class})\nAsk about fees, attendance, exams or notices.`;
      return twimlReply(res, msg);
    }
  }

  // ── Authenticate parent by WhatsApp number
  let { studentId, studentClass } = session;
  const lang = session.lang || detectedLang;

  if (!studentId) {
    const last10 = from.replace(/\D/g, '').slice(-10);
    try {
      const { data: students } = await supabase
        .from('students')
        .select('id, name, class, section, roll_no, parent_name, phone')
        .like('phone', '%' + last10);

      if (!students || students.length === 0) {
        return twimlReply(res, buildNotFound(lang));
      }

      if (students.length === 1) {
        studentId    = students[0].id;
        studentClass = students[0].class;
        sessions[from] = {
          state: 'active', studentId, studentClass,
          studentName: students[0].name,
          parentName: students[0].parent_name,
          lang, lastSeen: Date.now()
        };
      } else {
        // Multiple children
        sessions[from] = {
          state: 'selecting_child', children: students,
          lang, lastSeen: Date.now()
        };
        const list = students.map((s, i) =>
          `${i + 1}. ${s.name} — Class ${s.class}${s.section ? '-' + s.section : ''}`
        ).join('\n');
        const msg = lang === 'hi'
          ? `👨‍👩‍👧 *${students.length} bachche registered hain:*\n\n${list}\n\nKisi ek ka number reply karein (1, 2...)`
          : `👨‍👩‍👧 *${students.length} children registered:*\n\n${list}\n\nReply with number to select.`;
        return twimlReply(res, msg);
      }
    } catch (err) {
      console.error('DB lookup error:', err.message);
      return twimlReply(res, '⚠️ Database error. Please contact school office.');
    }
  }

  // Update session
  sessions[from] = { ...sessions[from], lastSeen: Date.now() };

  // ── Generate RAG response
  try {
    const reply = await buildWhatsAppResponse(text, studentId, studentClass, lang);
    return twimlReply(res, reply);
  } catch (err) {
    console.error('RAG error:', err.message);
    const errMsg = lang === 'hi'
      ? '⚠️ Abhi jawab nahi de pa raha। School office se contact karein।'
      : '⚠️ Unable to fetch info right now. Please contact school office.';
    return twimlReply(res, errMsg);
  }
});

// ── Welcome messages
function buildWelcome(lang) {
  const school = process.env.SCHOOL_NAME || 'School Mitra';
  if (lang === 'hi') {
    return `🏫 *${school}* में आपका स्वागत है!\n\nमैं School Mitra AI हूं। आप पूछ सकते हैं:\n\n📅 *Attendance* — "attendance kaisi hai?"\n💰 *Fees* — "fees kitni baki hai?"\n📝 *Exam* — "exam kab hai?"\n📢 *Notice* — "koi notice hai?"\n📚 *Homework* — "homework kya hai?"\n\n_भाषा: English / Hindi / Hinglish_`;
  }
  if (lang === 'hinglish') {
    return `🏫 *${school}* mein aapka swagat hai!\n\nMain School Mitra AI hoon। Aap pooch sakte hain:\n\n📅 *Attendance* — "attendance kaisi hai?"\n💰 *Fees* — "fees kitni baki hai?"\n📝 *Exam* — "exam kab hai?"\n📢 *Notice* — "koi notice hai?"\n\n_Language: English / Hindi / Hinglish_`;
  }
  return `🏫 Welcome to *${school}*!\n\nI'm School Mitra AI. You can ask:\n\n📅 *Attendance* — "What's the attendance?"\n💰 *Fees* — "Are fees paid?"\n📝 *Exams* — "When are the exams?"\n📢 *Notices* — "Any school notices?"\n📚 *Homework* — "What's the homework?"\n\n_Switch language: Hindi / Hinglish_`;
}

function buildNotFound(lang) {
  const phone = process.env.SCHOOL_PHONE || 'school office';
  if (lang === 'hi') return `❌ आपका नंबर school records में नहीं मिला।\n\nकृपया school office से संपर्क करें:\n📞 ${phone}`;
  if (lang === 'hinglish') return `❌ Aapka number school records mein nahi mila।\n\nPlease school office se contact karein:\n📞 ${phone}`;
  return `❌ Your number is not registered in school records.\n\nPlease contact school office:\n📞 ${phone}`;
}

// Clean old sessions hourly
setInterval(() => {
  const cutoff = Date.now() - 3600000;
  Object.keys(sessions).forEach(k => {
    if ((sessions[k].lastSeen || 0) < cutoff) delete sessions[k];
  });
}, 3600000);

module.exports = router;
