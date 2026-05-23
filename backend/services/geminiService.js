const { model } = require('../config/gemini');
const supabase = require('../config/supabase');

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

Rules:
- Always be polite, helpful, and professional.
- CRITICAL: You DO have direct access to the school's live, real-time database, which is attached to your prompt context under "Relevant school data" for relevant queries (containing students, fees, attendance, exams, staff, transport, and timetable).
- NEVER say "I do not have access to private databases or specific institutional records". You have full authority to read and answer using the provided database records!
- Always search the provided database context to find the student by Name or Roll Number (e.g., Roll Number "01" or "02") and answer confidently with specific details (amount, due date, payment status, exam room, bus stop, driver contact, etc.).
- If the specific student, roll number, or record is not present in the provided database context, politely state that the record for that roll number or name was not found in the school records.
- Keep responses concise, clear, and extremely accurate based ONLY on the provided database context.
- Always respond in the exact same language/Hinglish style the user writes in.
`;

const conversationHistory = {};

async function generateResponse(userMessage, userId = 'default', contextData = null) {
  try {
    if (!conversationHistory[userId]) {
      conversationHistory[userId] = [];
    }

    let contextString = '';
    if (contextData) {
      contextString = `\n\nRelevant school data for this query:\n${JSON.stringify(contextData, null, 2)}`;
    }

    const fullPrompt = `${schoolSystemPrompt}${contextString}\n\nUser Message: ${userMessage}`;

    conversationHistory[userId].push({
      role: 'user',
      parts: [{ text: fullPrompt }]
    });

    // Keep only last 10 messages to avoid token limit
    if (conversationHistory[userId].length > 10) {
      conversationHistory[userId] = conversationHistory[userId].slice(-10);
    }

    const chat = model.startChat({
      history: conversationHistory[userId].slice(0, -1)
    });

    const result = await chat.sendMessage(userMessage);
    const response = result.response.text();

    conversationHistory[userId].push({
      role: 'model',
      parts: [{ text: response }]
    });

    return response;
  } catch (error) {
    console.error('Gemini Error:', error.message);
    if (error.message.includes('API_KEY')) {
      return '⚠️ AI service is not configured yet. Please contact the school office directly.';
    }
    return '🙏 Sorry, I am having trouble responding right now. Please try again in a moment.';
  }
}

function clearHistory(userId) {
  delete conversationHistory[userId];
}

module.exports = { generateResponse, clearHistory };
