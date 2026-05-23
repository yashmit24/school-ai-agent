// =============================================
// CHATBOT JAVASCRIPT
// =============================================

// ⚠️ UPDATE THIS URL AFTER DEPLOYMENT TO RENDER
const API_BASE_URL = 'https://school-ai-agent-eynr.onrender.com';

const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const suggestionsBar = document.getElementById('suggestionsBar');

// Generate a unique session ID for this browser tab
const sessionId = 'web-' + Math.random().toString(36).substring(2, 10);

// ─────────────────────────────────────────
// HELPER: Get current time string
// ─────────────────────────────────────────
function getTimeStr() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────
// RENDER: Show welcome message
// ─────────────────────────────────────────
function renderWelcome() {
  chatMessages.innerHTML = `
    <div class="welcome-msg">
      <div class="welcome-icon">🏫</div>
      <h2>Hello! I'm your School AI Assistant</h2>
      <p>Ask me anything about exams, fees, timetables, transport, attendance, staff contacts, and more!</p>
    </div>
  `;
}

// ─────────────────────────────────────────
// RENDER: Append a message bubble
// ─────────────────────────────────────────
function appendMessage(text, role) {
  // Remove welcome message on first chat
  const welcome = chatMessages.querySelector('.welcome-msg');
  if (welcome) welcome.remove();

  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', role);

  const avatarIcon = role === 'bot' ? '🤖' : '👤';
  const avatarClass = role === 'bot' ? 'bot-msg-avatar' : 'user-msg-avatar';

  // Convert newlines and markdown-like bold to HTML
  const formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/\n/g, '<br/>');

  msgDiv.innerHTML = `
    <div class="message-avatar ${avatarClass}">${avatarIcon}</div>
    <div>
      <div class="message-bubble">${formatted}</div>
      <div class="message-time">${getTimeStr()}</div>
    </div>
  `;

  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ─────────────────────────────────────────
// RENDER: Show typing indicator
// ─────────────────────────────────────────
function showTyping() {
  const typingDiv = document.createElement('div');
  typingDiv.classList.add('message', 'bot', 'typing-indicator');
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = `
    <div class="message-avatar bot-msg-avatar">🤖</div>
    <div class="message-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
  const typing = document.getElementById('typingIndicator');
  if (typing) typing.remove();
}

// ─────────────────────────────────────────
// SEND MESSAGE TO BACKEND API
// ─────────────────────────────────────────
async function sendMessage(text) {
  if (!text || text.trim() === '') return;

  appendMessage(text, 'user');
  userInput.value = '';
  userInput.style.height = 'auto';
  sendBtn.disabled = true;
  showTyping();

  // Hide suggestions after first message
  if (suggestionsBar) suggestionsBar.style.display = 'none';

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text.trim(), userId: sessionId })
    });

    const data = await response.json();
    hideTyping();

    if (data.success) {
      appendMessage(data.message, 'bot');
    } else {
      appendMessage('⚠️ Sorry, I encountered an error. Please try again!', 'bot');
    }
  } catch (error) {
    hideTyping();
    appendMessage('🔌 Cannot connect to the server. Make sure the backend is running at `http://localhost:3000`.', 'bot');
    console.error('Chat API error:', error);
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
}

// ─────────────────────────────────────────
// EVENT: Form submit
// ─────────────────────────────────────────
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage(userInput.value);
});

// ─────────────────────────────────────────
// EVENT: Enter to send (Shift+Enter = new line)
// ─────────────────────────────────────────
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(userInput.value);
  }
});

// ─────────────────────────────────────────
// Auto-resize textarea as user types
// ─────────────────────────────────────────
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
});

// ─────────────────────────────────────────
// EVENT: Suggestion chips
// ─────────────────────────────────────────
document.querySelectorAll('.suggestion-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    sendMessage(chip.dataset.msg);
  });
});

// ─────────────────────────────────────────
// EVENT: Clear chat
// ─────────────────────────────────────────
clearChatBtn.addEventListener('click', () => {
  renderWelcome();
  if (suggestionsBar) suggestionsBar.style.display = 'flex';
  userInput.focus();
});

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
renderWelcome();
