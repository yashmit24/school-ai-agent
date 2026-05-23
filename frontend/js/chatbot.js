// =============================================
// CHATBOT JAVASCRIPT (with Language Switcher)
// =============================================

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
// APPLY CHATBOT-SPECIFIC UI TRANSLATIONS
// ─────────────────────────────────────────
function applyBotTranslations() {
  // Bot name and status
  const botName = document.getElementById('botName');
  const botStatus = document.getElementById('botStatusText');
  const clearBtnText = document.getElementById('clearBtnText');
  const textarea = document.getElementById('userInput');
  const disclaimer = document.querySelector('.chat-disclaimer');

  if (botName) botName.textContent = t('bot_name');
  if (botStatus) botStatus.textContent = t('bot_status');
  if (clearBtnText) clearBtnText.textContent = t('clear_btn');
  if (textarea) textarea.placeholder = t('placeholder');
  if (disclaimer) disclaimer.textContent = t('disclaimer');

  // Update suggestion chips
  const chips = [
    { id: 'chip_timings', labelKey: 'chip_timings', msgKey: 'chip_timings_msg' },
    { id: 'chip_exams',   labelKey: 'chip_exams',   msgKey: 'chip_exams_msg'   },
    { id: 'chip_fees',    labelKey: 'chip_fees',     msgKey: 'chip_fees_msg'    },
    { id: 'chip_transport', labelKey: 'chip_transport', msgKey: 'chip_transport_msg' },
    { id: 'chip_staff',   labelKey: 'chip_staff',   msgKey: 'chip_staff_msg'   },
    { id: 'chip_attendance', labelKey: 'chip_attendance', msgKey: 'chip_attendance_msg' },
  ];
  chips.forEach(c => {
    const el = document.getElementById(c.id);
    if (el) {
      el.textContent = t(c.labelKey);
      el.dataset.msg = t(c.msgKey);
    }
  });
}

// ─────────────────────────────────────────
// OVERRIDE: setLang — also update bot UI
// ─────────────────────────────────────────
const _origSetLang = typeof setLang === 'function' ? setLang : null;
function setLang(lang) {
  localStorage.setItem('schoolLang', lang);
  applyTranslations(lang);
  updateLangButtons(lang);
  applyBotTranslations();
  renderWelcome(); // Re-render welcome in new language
}

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
      <h2>${t('welcome_title')}</h2>
      <p>${t('welcome_sub')}</p>
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
      body: JSON.stringify({
        message: text.trim(),
        userId: sessionId,
        language: getLang()   // ← send selected language to backend
      })
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
    appendMessage('🔌 Cannot connect to the server. Please try again in a moment.', 'bot');
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
initLangSwitcher();    // from i18n.js — sets up buttons and applies saved lang
applyBotTranslations(); // apply chatbot-specific UI strings
renderWelcome();        // render welcome in correct language
