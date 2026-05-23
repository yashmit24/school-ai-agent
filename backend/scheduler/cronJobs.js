const cron = require('node-cron');
const { sendFeeReminders, sendExamReminders, sendAttendanceAlerts } = require('../services/reminderService');

/**
 * SCHEDULED CRON JOBS
 * These run automatically in the background 24x7
 * 
 * Cron Syntax: minute hour day month weekday
 * Examples:
 *   '0 8 * * *'    → Every day at 8:00 AM
 *   '0 8 * * 1'    → Every Monday at 8:00 AM
 *   '0 9 1 * *'    → 1st of every month at 9:00 AM
 */

function startCronJobs() {
  console.log('⏰ Starting Scheduled Cron Jobs...');

  // ─────────────────────────────────────────
  // 1. FEE REMINDERS — Runs every day at 8 AM
  // Checks for fees due within 5 days and sends Telegram alerts to parents
  // ─────────────────────────────────────────
  cron.schedule('0 8 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🕗 Running daily fee reminder job...`);
    await sendFeeReminders();
  }, { timezone: 'Asia/Kolkata' });

  // ─────────────────────────────────────────
  // 2. EXAM REMINDERS — Runs every day at 7 AM
  // Sends exam alerts to parents of relevant class 2 days before exam
  // ─────────────────────────────────────────
  cron.schedule('0 7 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 📝 Running daily exam reminder job...`);
    await sendExamReminders();
  }, { timezone: 'Asia/Kolkata' });

  // ─────────────────────────────────────────
  // 3. ATTENDANCE ALERTS — Runs every Monday at 9 AM
  // Alerts parents of students with less than 75% attendance
  // ─────────────────────────────────────────
  cron.schedule('0 9 * * 1', async () => {
    console.log(`[${new Date().toISOString()}] 📊 Running weekly attendance alert job...`);
    await sendAttendanceAlerts();
  }, { timezone: 'Asia/Kolkata' });

  // ─────────────────────────────────────────
  // 4. KEEP-ALIVE PING — Runs every 5 minutes
  // Prevents free hosting (Render) from sleeping
  // ─────────────────────────────────────────
  cron.schedule('*/5 * * * *', () => {
    console.log(`[${new Date().toISOString()}] 💓 Keep-alive ping...`);
  });

  console.log('✅ All Cron Jobs Scheduled:');
  console.log('   📅 Fee Reminders   → Daily at 8:00 AM IST');
  console.log('   📝 Exam Reminders  → Daily at 7:00 AM IST');
  console.log('   📊 Attendance Alerts → Every Monday at 9:00 AM IST');
  console.log('   💓 Keep-Alive Ping → Every 5 minutes');
}

module.exports = { startCronJobs };
