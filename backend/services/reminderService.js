const supabase = require('../config/supabase');
const { formatDate, formatCurrency, isDueSoon } = require('../utils/helpers');
require('dotenv').config();

let telegramBot = null;

// Lazily get bot instance to avoid circular dependency
function getBot() {
  if (!telegramBot) {
    try {
      telegramBot = require('./telegramService');
    } catch (e) {
      console.log('⚠️ Telegram Bot not available for reminders.');
    }
  }
  return telegramBot;
}

/**
 * Send a reminder message via Telegram to a specific chat ID
 */
async function sendTelegramReminder(telegramId, message) {
  const bot = getBot();
  if (!bot || !telegramId) return false;
  try {
    await bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
    console.log(`📨 Telegram reminder sent to chat ID: ${telegramId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send Telegram message to ${telegramId}:`, error.message);
    return false;
  }
}

/**
 * FEE REMINDER
 * Finds all unpaid fees due within 5 days and sends a Telegram reminder to parents
 */
async function sendFeeReminders() {
  if (!supabase) return;
  console.log('💰 Running Fee Reminder check...');
  try {
    const { data: fees, error } = await supabase
      .from('fees')
      .select('*, students(name, class, telegram_id, parent_name)')
      .eq('paid', false);

    if (error) throw error;

    let remindersSent = 0;
    for (const fee of fees || []) {
      if (isDueSoon(fee.due_date, 5) && fee.students?.telegram_id) {
        const msg = `🔔 *Fee Reminder — ${process.env.SCHOOL_NAME || 'Sunshine Public School'}*\n\n` +
          `Dear *${fee.students.parent_name || 'Parent'}*,\n` +
          `This is a reminder that the school fees for your child *${fee.students.name}* (Class ${fee.students.class}) are due.\n\n` +
          `📅 *Due Date:* ${formatDate(fee.due_date)}\n` +
          `💰 *Amount:* ${formatCurrency(fee.amount)}\n` +
          `📝 *Details:* ${fee.description || 'Tuition Fees'}\n\n` +
          `Please pay at the school office or contact us at ${process.env.SCHOOL_PHONE || ''}.`;
        const sent = await sendTelegramReminder(fee.students.telegram_id, msg);
        if (sent) remindersSent++;
      }
    }
    console.log(`✅ Fee Reminders: ${remindersSent} sent.`);
  } catch (err) {
    console.error('❌ Fee Reminder Error:', err.message);
  }
}

/**
 * EXAM REMINDER
 * Finds all exams happening within 2 days and sends a Telegram reminder
 */
async function sendExamReminders() {
  if (!supabase) return;
  console.log('📝 Running Exam Reminder check...');
  try {
    const { data: exams, error } = await supabase
      .from('exams')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;

    for (const exam of exams || []) {
      if (!isDueSoon(exam.date, 2)) continue;

      // Find all students of this class
      const { data: students } = await supabase
        .from('students')
        .select('name, telegram_id, parent_name')
        .eq('class', exam.class);

      for (const student of students || []) {
        if (!student.telegram_id) continue;
        const msg = `📚 *Exam Reminder — ${process.env.SCHOOL_NAME || 'Sunshine Public School'}*\n\n` +
          `Dear *${student.parent_name || 'Parent'}*,\n` +
          `This is a reminder about the upcoming exam for *${student.name}*.\n\n` +
          `📘 *Subject:* ${exam.subject}\n` +
          `📋 *Exam Name:* ${exam.name}\n` +
          `📅 *Date:* ${formatDate(exam.date)}\n` +
          `⏰ *Time:* ${exam.time}\n` +
          `🏫 *Room:* ${exam.room}\n\n` +
          `Best of luck! 🌟`;
        await sendTelegramReminder(student.telegram_id, msg);
      }
    }
    console.log('✅ Exam Reminders sent.');
  } catch (err) {
    console.error('❌ Exam Reminder Error:', err.message);
  }
}

/**
 * LOW ATTENDANCE ALERT
 * Finds students with attendance below 75% and sends parent alerts
 */
async function sendAttendanceAlerts() {
  if (!supabase) return;
  console.log('📊 Running Attendance Alert check...');
  try {
    const { data: students } = await supabase.from('students').select('*');

    for (const student of students || []) {
      if (!student.telegram_id) continue;
      const { data: records } = await supabase.from('attendance').select('status').eq('student_id', student.id);
      if (!records || records.length === 0) continue;

      const total = records.length;
      const present = records.filter(r => r.status === 'present').length;
      const percentage = (present / total) * 100;

      if (percentage < 75) {
        const msg = `⚠️ *Low Attendance Alert — ${process.env.SCHOOL_NAME || 'Sunshine Public School'}*\n\n` +
          `Dear *${student.parent_name || 'Parent'}*,\n` +
          `Your child *${student.name}* (Class ${student.class}) has low attendance.\n\n` +
          `📊 *Attendance:* ${present}/${total} days (${percentage.toFixed(1)}%)\n\n` +
          `Please ensure regular attendance. Contact us if you need assistance.`;
        await sendTelegramReminder(student.telegram_id, msg);
      }
    }
    console.log('✅ Attendance Alerts sent.');
  } catch (err) {
    console.error('❌ Attendance Alert Error:', err.message);
  }
}

module.exports = { sendFeeReminders, sendExamReminders, sendAttendanceAlerts };
