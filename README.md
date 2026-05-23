# 🏫 School AI Agent

A **24×7 fully automated School AI Assistant** built with free technologies. 
Powered by **Google Gemini AI**, **Supabase**, **Telegram Bot API**, and **Node.js**.

## 🚀 Features
- AI Chatbot (Website + Telegram)
- Exam, Fee & PTM Reminders (auto via Telegram)
- Attendance Tracking & Alerts
- Transport Route Information
- Staff Contact Directory
- Admin Dashboard
- Scheduled Cron Jobs (24×7)

## 🛠️ Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js |
| AI | Google Gemini 2.5 Flash |
| Database | Supabase (PostgreSQL) |
| Bot | Telegram Bot API |
| Scheduler | node-cron |
| Frontend | HTML, CSS, JavaScript |

## ⚙️ Local Setup

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/school-ai-agent.git
cd school-ai-agent/backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
# Edit .env and fill in your API keys
```

### 4. Run the backend
```bash
npm start
```

### 5. Open frontend
Open `frontend/index.html` using VS Code Live Server.

## 🔑 Environment Variables
```
PORT=3000
GEMINI_API_KEY=your_gemini_key
TELEGRAM_BOT_TOKEN=your_telegram_token
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SCHOOL_NAME=Your School Name
```

## 📄 License
MIT — Free to use and modify.
