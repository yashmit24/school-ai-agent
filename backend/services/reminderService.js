const supabase = require('../config/supabase');
const { formatDate, formatCurrency, isDueSoon } = require('../utils/helpers');
const { sendWhatsAppMessage, makeVoiceCall } = require('./twilioService');
require('dotenv').config();

let telegramBot = null;
function getBot() {
  if (!telegramBot) {
    try { telegramBot = require('./telegramService'); } catch (e) {}
  }
  return telegramBot;
}

// ─────────────────────────────────────────
// TELEGRAM SEND
// ─────────────────────────────────────────
async function sendTelegramReminder(telegramId, message) {
  const bot = getBot();
  if (!bot || !telegramId) return false;
  try {
    await bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
    console.log(`📨 Telegram sent to: ${telegramId}`);
    return true;
  } catch (err) {
    console.error(`❌ Telegram error (${telegramId}):`, err.message);
    return false;
  }
}

// ─────────────────────────────────────────
// SMART NOTIFY: Telegram → WhatsApp → Voice Call
// Tries each channel in order until one succeeds
// ─────────────────────────────────────────
async function smartNotify(student, message, plainMessage) {
  const name = student.name || 'Student';

  // 1️⃣ Try Telegram first
  if (student.telegram_id) {
    const sent = await sendTelegramReminder(student.telegram_id, message);
    if (sent) return 'telegram';
  }

  // 2️⃣ Try WhatsApp on their phone number
  if (student.phone) {
    const sent = await sendWhatsAppMessage(student.phone, plainMessage || message);
    if (sent) return 'whatsapp';
  }

  // 3️⃣ Try parent phone if different
  if (student.parent_phone && student.parent_phone !== student.phone) {
    const sent = await sendWhatsAppMessage(student.parent_phone, plainMessage || message);
    if (sent) return 'whatsapp-parent';
  }

  // 4️⃣ Last resort — Voice Call
  if (student.phone) {
    const callMsg = (plainMessage || message).replace(/[*_`]/g, ''); // remove markdown
    const sent = await makeVoiceCall(student.phone, callMsg);
    if (sent) return 'voice-call';
  }

  console.log(`⚠️ Could not reach ${name} — no contact method worked.`);
  return null;
}

// ─────────────────────────────────────────
// FEE REMINDER — runs daily 8 AM
// ─────────────────────────────────────────
async function sendFeeReminders() {
  if (!supabase) return;
  console.log('💰 Running Fee Reminder check...');
  try {
    const { data: fees, error } = await supabase
      .from('fees')
      .select('*, students(name, class, telegram_id, parent_name, phone, parent_phone)')
      .eq('paid', false);

    if (error) throw error;

    let sent = 0;
    for (const fee of fees || []) {
      if (!isDueSoon(fee.due_date, 5)) continue;
      const s = fee.students;
      if (!s) continue;

      const markdownMsg =
        `🔔 *Fee Reminder — ${process.env.SCHOOL_NAME || 'School Mitra'}*\n\n` +
        `Dear *${s.parent_name || 'Parent'}*,\n` +
        `Fees for *${s.name}* (Class ${s.class}) are due soon.\n\n` +
        `📅 *Due Date:* ${formatDate(fee.due_date)}\n` +
        `💰 *Amount:* ${formatCurrency(fee.amount)}\n\n` +
        `Please pay at school or call ${process.env.SCHOOL_PHONE || ''}.`;

      const plainMsg =
        `Fee Reminder from ${process.env.SCHOOL_NAME || 'School Mitra'}. ` +
        `Dear ${s.parent_name || 'Parent'}, fees for ${s.name} (Class ${s.class}) ` +
        `of ${formatCurrency(fee.amount)} are due on ${formatDate(fee.due_date)}. ` +
        `Please pay at school or call ${process.env.SCHOOL_PHONE || ''}.`;

      const channel = await smartNotify(s, markdownMsg, plainMsg);
      if (channel) sent++;
    }
    console.log(`✅ Fee Reminders: ${sent} sent.`);
  } catch (err) {
    console.error('❌ Fee Reminder Error:', err.message);
  }
}

// ─────────────────────────────────────────
// EXAM REMINDER — runs daily 7 AM
// ─────────────────────────────────────────
async function sendExamReminders() {
  if (!supabase) return;
  console.log('📝 Running Exam Reminder check...');
  try {
    const { data: exams, error } = await supabase
      .from('exams').select('*').order('date', { ascending: true });
    if (error) throw error;

    for (const exam of exams || []) {
      if (!isDueSoon(exam.date, 2)) continue;

      const { data: students } = await supabase
        .from('students')
        .select('name, telegram_id, parent_name, phone, parent_phone')
        .eq('class', exam.class);

      for (const s of students || []) {
        const markdownMsg =
          `📚 *Exam Reminder — ${process.env.SCHOOL_NAME || 'School Mitra'}*\n\n` +
          `Dear *${s.parent_name || 'Parent'}*,\n` +
          `Upcoming exam for *${s.name}*:\n\n` +
          `📘 *Subject:* ${exam.subject}\n` +
          `📅 *Date:* ${formatDate(exam.date)}\n` +
          `⏰ *Time:* ${exam.time}\n` +
          `🏫 *Room:* ${exam.room}\n\n` +
          `Best of luck! 🌟`;

        const plainMsg =
          `Exam Reminder from ${process.env.SCHOOL_NAME || 'School Mitra'}. ` +
          `${s.name} has ${exam.subject} exam on ${formatDate(exam.date)} at ${exam.time} in Room ${exam.room}. Best of luck!`;

        await smartNotify(s, markdownMsg, plainMsg);
      }
    }
    console.log('✅ Exam Reminders sent.');
  } catch (err) {
    console.error('❌ Exam Reminder Error:', err.message);
  }
}

// ─────────────────────────────────────────
// ATTENDANCE ALERT — runs every Monday 9 AM
// ─────────────────────────────────────────
async function sendAttendanceAlerts() {
  if (!supabase) return;
  console.log('📊 Running Attendance Alert check...');
  try {
    const { data: students } = await supabase.from('students').select('*');

    for (const s of students || []) {
      const { data: records } = await supabase
        .from('attendance').select('status').eq('student_id', s.id);
      if (!records || records.length === 0) continue;

      const total = records.length;
      const present = records.filter(r => r.status === 'present').length;
      const pct = ((present / total) * 100).toFixed(1);

      if (parseFloat(pct) < 75) {
        const markdownMsg =
          `⚠️ *Low Attendance Alert — ${process.env.SCHOOL_NAME || 'School Mitra'}*\n\n` +
          `Dear *${s.parent_name || 'Parent'}*,\n` +
          `*${s.name}* (Class ${s.class}) has low attendance.\n\n` +
          `📊 *Attendance:* ${present}/${total} days (${pct}%)\n\n` +
          `Please ensure regular attendance. Contact us for assistance.`;

        const plainMsg =
          `Attendance Alert from ${process.env.SCHOOL_NAME || 'School Mitra'}. ` +
          `${s.name} (Class ${s.class}) attendance is only ${pct}%. ` +
          `Please ensure regular attendance.`;

        await smartNotify(s, markdownMsg, plainMsg);
      }
    }
    console.log('✅ Attendance Alerts sent.');
  } catch (err) {
    console.error('❌ Attendance Alert Error:', err.message);
  }
}

module.exports = { sendFeeReminders, sendExamReminders, sendAttendanceAlerts };
