const twilio = require('twilio');
require('dotenv').config();

// ─────────────────────────────────────────
// TWILIO CLIENT SETUP
// ─────────────────────────────────────────
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const fromPhone  = process.env.TWILIO_PHONE_NUMBER;       // e.g. +1xxxxxxxxxx
const whatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // sandbox default

let client = null;
function getClient() {
  if (!client && accountSid && authToken) {
    client = twilio(accountSid, authToken);
  }
  return client;
}

// ─────────────────────────────────────────
// SEND WHATSAPP MESSAGE
// ─────────────────────────────────────────
async function sendWhatsAppMessage(toPhone, message) {
  const c = getClient();
  if (!c) {
    console.log('⚠️  Twilio not configured — WhatsApp skipped.');
    return false;
  }
  try {
    // Normalize phone number to E.164 Indian format
    const normalized = normalizePhone(toPhone);
    if (!normalized) return false;

    await c.messages.create({
      from: whatsappFrom,
      to: `whatsapp:${normalized}`,
      body: message
    });
    console.log(`✅ WhatsApp sent to ${normalized}`);
    return true;
  } catch (err) {
    console.error(`❌ WhatsApp Error (${toPhone}):`, err.message);
    return false;
  }
}

// ─────────────────────────────────────────
// MAKE AUTOMATED VOICE CALL (TTS)
// ─────────────────────────────────────────
async function makeVoiceCall(toPhone, message) {
  const c = getClient();
  if (!c || !fromPhone) {
    console.log('⚠️  Twilio not configured — Voice call skipped.');
    return false;
  }
  try {
    const normalized = normalizePhone(toPhone);
    if (!normalized) return false;

    // Convert message to TwiML — robot will speak this
    const twiml = `<Response>
      <Say language="hi-IN" voice="Polly.Aditi">${message}</Say>
      <Pause length="1"/>
      <Say language="hi-IN" voice="Polly.Aditi">${message}</Say>
    </Response>`;

    await c.calls.create({
      from: fromPhone,
      to: normalized,
      twiml: twiml
    });
    console.log(`✅ Voice call made to ${normalized}`);
    return true;
  } catch (err) {
    console.error(`❌ Voice Call Error (${toPhone}):`, err.message);
    return false;
  }
}

// ─────────────────────────────────────────
// SEND SMS (fallback)
// ─────────────────────────────────────────
async function sendSMS(toPhone, message) {
  const c = getClient();
  if (!c || !fromPhone) {
    console.log('⚠️  Twilio not configured — SMS skipped.');
    return false;
  }
  try {
    const normalized = normalizePhone(toPhone);
    if (!normalized) return false;

    await c.messages.create({
      from: fromPhone,
      to: normalized,
      body: message
    });
    console.log(`✅ SMS sent to ${normalized}`);
    return true;
  } catch (err) {
    console.error(`❌ SMS Error (${toPhone}):`, err.message);
    return false;
  }
}

// ─────────────────────────────────────────
// HELPER: Normalize Indian phone to E.164
// ─────────────────────────────────────────
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.toString().replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith('091')) return `+91${digits.slice(3)}`;
  if (phone.startsWith('+')) return phone;
  return null;
}

module.exports = { sendWhatsAppMessage, makeVoiceCall, sendSMS };
