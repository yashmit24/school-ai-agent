const axios = require('axios');

const BASE_URL = 'https://graph.facebook.com/v19.0';
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const TOKEN    = process.env.WHATSAPP_TOKEN;

// ─────────────────────────────────────────
// Send text message
// ─────────────────────────────────────────
async function sendWhatsAppMessage(to, text) {
  if (!PHONE_ID || !TOKEN) {
    console.log(`[WA SANDBOX] To: ${to}\nMessage: ${text}\n`);
    return; // Log only in dev mode
  }

  try {
    await axios.post(
      `${BASE_URL}/${PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text, preview_url: false }
      },
      { headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('WhatsApp send error:', err.response?.data || err.message);
  }
}

// ─────────────────────────────────────────
// Mark message as read (shows blue ticks)
// ─────────────────────────────────────────
async function markRead(messageId, to) {
  if (!PHONE_ID || !TOKEN) return;
  try {
    await axios.post(
      `${BASE_URL}/${PHONE_ID}/messages`,
      { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
      { headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    // Non-critical
  }
}

// ─────────────────────────────────────────
// Send typing indicator (WhatsApp doesn't have native typing, so we delay)
// ─────────────────────────────────────────
async function sendTypingIndicator(to) {
  // WhatsApp Cloud API doesn't support typing bubbles — just add a small delay
  await new Promise(r => setTimeout(r, 500));
}

// ─────────────────────────────────────────
// Send template message (for proactive alerts)
// ─────────────────────────────────────────
async function sendTemplate(to, templateName, languageCode = 'en', components = []) {
  if (!PHONE_ID || !TOKEN) {
    console.log(`[WA TEMPLATE] To: ${to}, Template: ${templateName}`);
    return;
  }
  try {
    await axios.post(
      `${BASE_URL}/${PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: { name: templateName, language: { code: languageCode }, components }
      },
      { headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('WhatsApp template error:', err.response?.data || err.message);
  }
}

module.exports = { sendWhatsAppMessage, markRead, sendTypingIndicator, sendTemplate };
