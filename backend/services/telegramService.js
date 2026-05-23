const TelegramBot = require('node-telegram-bot-api');
const { generateResponse } = require('./geminiService');
const { detectIntent } = require('./intentDetector');
const supabase = require('../config/supabase');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;

let bot = null;

if (!token || token.includes('your_')) {
  console.log('⚠️  WARNING: Telegram Bot Token is not configured. Telegram Bot integrations will be disabled.');
} else {
  try {
    // Initialize Telegram Bot in Polling Mode
    bot = new TelegramBot(token, { polling: true });
    console.log('🤖 Telegram Bot Service initialized successfully.');

    // Welcome message when user sends /start
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const firstName = msg.chat.first_name || 'there';
      
      const welcomeMessage = `Hello ${firstName}! 👋 Welcome to the *${process.env.SCHOOL_NAME || 'Sunshine Public School'} AI Assistant*.\n\n` +
        `I am here to help you 24/7. You can ask me questions about:\n` +
        `📅 Timetable & School Timings\n` +
        `📝 Exam Dates & Results\n` +
        `💰 Fees Payment Status\n` +
        `🚌 Bus Routes & Transport\n` +
        `📞 Staff Contacts\n\n` +
        `*Example queries you can try:*\n` +
        `• _What are the school timings?_\n` +
        `• _Show my exam timetable_\n` +
        `• _Who is the principal?_`;

      bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });

    // Handle all other incoming text messages
    bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;

      // Skip slash commands
      if (!text || text.startsWith('/')) return;

      // Let user know the bot is thinking/typing
      bot.sendChatAction(chatId, 'typing');

      // 1. Detect user's intent
      const intent = detectIntent(text);
      let contextData = null;

      // 2. Fetch relevant database context if Supabase is active
      try {
        if (supabase) {
          if (intent === 'exam') {
            const { data } = await supabase.from('exams').select('*').order('date', { ascending: true }).limit(5);
            contextData = data;
          } else if (intent === 'fees') {
            // In a real-world bot, we'd link the telegram_id to a student
            // Let's try searching if this Telegram user exists in students table
            const { data: student } = await supabase.from('students').select('id').eq('telegram_id', chatId.toString()).single();
            if (student) {
              const { data } = await supabase.from('fees').select('*').eq('student_id', student.id);
              contextData = data;
            }
          } else if (intent === 'staff') {
            const { data } = await supabase.from('staff').select('*').limit(10);
            contextData = data;
          } else if (intent === 'transport') {
            const { data } = await supabase.from('transport').select('*').limit(5);
            contextData = data;
          } else if (intent === 'attendance') {
            const { data: student } = await supabase.from('students').select('id').eq('telegram_id', chatId.toString()).single();
            if (student) {
              const { data } = await supabase.from('attendance').select('*').eq('student_id', student.id).limit(10);
              contextData = data;
            }
          }
        }
      } catch (dbError) {
        console.log('Telegram database fetch skipped:', dbError.message);
      }

      // 3. Generate response using Google Gemini AI
      try {
        const aiReply = await generateResponse(text, `telegram-${chatId}`, contextData);
        bot.sendMessage(chatId, aiReply);
      } catch (err) {
        console.error('Telegram response generation error:', err.message);
        bot.sendMessage(chatId, "🙏 Sorry, I'm experiencing some network issues. Please try again in a moment.");
      }
    });

    // Handle webhook or polling errors gracefully
    bot.on('polling_error', (error) => {
      console.error('Telegram Polling Error:', error.message);
    });

  } catch (error) {
    console.error('❌ Failed to initialize Telegram Bot:', error.message);
  }
}

module.exports = bot;
