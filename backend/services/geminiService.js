const { model } = require('../config/gemini');

// ─────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────
const schoolSystemPrompt = `
You are an intelligent AI assistant for ${process.env.SCHOOL_NAME || 'Sunshine Public School'}.
You help students, parents, and staff with school-related queries.

School Information:
- Name: ${process.env.SCHOOL_NAME || 'Sunshine Public School'}
- Address: ${process.env.SCHOOL_ADDRESS || '123 Education Street'}
- Phone: ${process.env.SCHOOL_PHONE || '+91-9876543210'}
- Email: ${process.env.SCHOOL_EMAIL || 'info@school.com'}
- Timings: ${process.env.SCHOOL_TIMINGS || '8:00 AM to 2:30 PM'}

You can help with:
1. Timetable and class schedules
2. Exam dates and results
3. Fee payment status and due dates
4. Attendance records
5. PTM (Parent-Teacher Meeting) information
6. Transport and bus route details
7. Staff contact information
8. Admission information
9. General school information

CRITICAL RULES — FOLLOW THESE STRICTLY:
- You have DIRECT ACCESS to the school's live database. The full database is provided in each message under "SCHOOL DATABASE".
- NEVER say "I don't have access to records" or "I cannot look up specific data" — you DO have the data!
- ALWAYS read the SCHOOL DATABASE section carefully and answer with SPECIFIC details: names, amounts, dates, room numbers, phone numbers, bus routes.
- If a student name or roll number is not found in the database, say "Record not found for that name/roll number in our system."
- Keep answers concise and accurate. Use ONLY the database — do NOT make up or guess any information.
- Be polite and friendly.
`;

// ─────────────────────────────────────────
// LANGUAGE INSTRUCTIONS
// ─────────────────────────────────────────
const LANG_INSTRUCTIONS = {
  en: 'Respond in clear, fluent English.',
  hi: 'केवल शुद्ध हिंदी में उत्तर दें। Roman script का उपयोग न करें।',
  hinglish: 'Respond in friendly Hinglish (Roman script Hindi mixed with English). Example: "Aapki fees 5000 rupaye hai aur due date 31 March hai!"'
};

// ─────────────────────────────────────────
// CONVERSATION HISTORY (stores clean Q&A only)
// ─────────────────────────────────────────
const conversationHistory = {};

// ─────────────────────────────────────────
// MAIN: Generate AI Response
// ─────────────────────────────────────────
async function generateResponse(userMessage, userId = 'default', contextData = null, language = 'en') {
  try {
    if (!conversationHistory[userId]) {
      conversationHistory[userId] = [];
    }

    // Build database context string from live Supabase data
    let dbContext = '';
    if (contextData) {
      dbContext = `\n\n===== SCHOOL DATABASE (Read this carefully to answer) =====\n${JSON.stringify(contextData, null, 2)}\n===== END OF DATABASE =====`;
    }

    // Get language instruction
    const langInstruction = LANG_INSTRUCTIONS[language] || LANG_INSTRUCTIONS['en'];

    // ✅ FIX: Build the COMPLETE message that includes system prompt + DB data + user question
    // This is what actually gets sent to Gemini each time
    const fullMessage = `${schoolSystemPrompt}

LANGUAGE RULE: ${langInstruction}
${dbContext}

Student/Parent Question: ${userMessage}

Your answer (use the database above to give specific, accurate details):`;

    // Use last 3 exchanges as conversation history context (6 entries: 3 user + 3 model)
    const historyForChat = conversationHistory[userId].slice(-6);

    const chat = model.startChat({
      history: historyForChat
    });

    // ✅ Send the FULL message to Gemini (includes DB + instructions every time)
    const result = await chat.sendMessage(fullMessage);
    const response = result.response.text();

    // Store only the clean user Q and AI answer in history (not the giant prompt)
    conversationHistory[userId].push({
      role: 'user',
      parts: [{ text: userMessage }]
    });
    conversationHistory[userId].push({
      role: 'model',
      parts: [{ text: response }]
    });

    // Keep max 20 history entries (10 exchanges)
    if (conversationHistory[userId].length > 20) {
      conversationHistory[userId] = conversationHistory[userId].slice(-20);
    }

    return response;

  } catch (error) {
    console.error('Gemini Error:', error.message);
    if (error.message.includes('API_KEY')) {
      return '⚠️ AI service is not configured. Please contact the school office directly.';
    }
    return '🙏 Sorry, having trouble right now. Please try again in a moment.';
  }
}

// ─────────────────────────────────────────
// Clear conversation history for a user
// ─────────────────────────────────────────
function clearHistory(userId) {
  delete conversationHistory[userId];
}

module.exports = { generateResponse, clearHistory };
