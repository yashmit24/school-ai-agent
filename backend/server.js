const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import Middlewares
const authMiddleware = require('./middleware/authMiddleware');
const jwtMiddleware = require('./middleware/jwtMiddleware');
const errorHandler = require('./middleware/errorHandler');
const checkDb = require('./middleware/checkDb');

// Import Routes
const chatRouter = require('./routes/chat');
const studentsRouter = require('./routes/students');
const examsRouter = require('./routes/exams');
const feesRouter = require('./routes/fees');
const attendanceRouter = require('./routes/attendance');
const adminRouter = require('./routes/admin');
const scoresRouter = require('./routes/scores');
const brandingRouter = require('./routes/branding');
const authRouter = require('./routes/auth');
const parentRouter = require('./routes/parent');
const teacherAiRouter  = require('./routes/teacher-ai');
const whatsappRouter   = require('./routes/whatsapp');

// Import & Initialize Telegram Bot Service
require('./services/telegramService');

// Import Scheduler
const { startCronJobs } = require('./scheduler/cronJobs');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow custom frontend integrations easily
}));

// CORS Configuration (Allow frontend requests)
app.use(cors());

// Body Parser Middleware
app.use(express.json({ limit: '5mb' }));  // 5mb for base64 logo images
app.use(express.urlencoded({ extended: true }));

// Serve Frontend Static Files
const path = require('path');
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rate Limiting (Prevent spam/abuse)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});
app.use('/api/', limiter);

// Welcome Route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: `Welcome to the ${process.env.SCHOOL_NAME || 'Sunshine Public School'} AI Agent Backend API! 🏫`,
    status: 'Running & Healthy'
  });
});

// Bind Routes with optional Authentication for modification routes
// Feel free to attach authMiddleware on admin-only routes
app.use('/api/chat', chatRouter);
app.use('/api/auth', checkDb, authRouter);                              // Public auth routes
app.use('/api/admin', checkDb, adminRouter);
app.use('/api/branding', checkDb, brandingRouter);
app.use('/api/students', checkDb, jwtMiddleware, studentsRouter);
app.use('/api/exams', checkDb, jwtMiddleware, examsRouter);
app.use('/api/fees', checkDb, jwtMiddleware, feesRouter);
app.use('/api/attendance', checkDb, jwtMiddleware, attendanceRouter);
app.use('/api/scores', checkDb, jwtMiddleware, scoresRouter);
app.use('/api/parent', checkDb, parentRouter);        // Parent portal (own JWT inside)
app.use('/api/teacher-ai', checkDb, teacherAiRouter); // Teacher AI tools (JWT protected)
app.use('/api/whatsapp',  whatsappRouter);            // WhatsApp webhook (no JWT, own HMAC auth)

// Global Error Handler Middleware (MUST be last)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🏫 School AI Agent Server is LIVE on port ${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=================================================`);

  // Start scheduled cron jobs AFTER server is up
  startCronJobs();
});
