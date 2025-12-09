import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from './routes/auth.routes.js';
import personalityRoutes from './routes/personality.routes.js';
import chatRoutes from './routes/chat.routes.js';
import memoryRoutes from './routes/memory.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import dailyRoutes from './routes/daily.routes.js';
import gamificationRoutes from './routes/gamification.routes.js';
import insightsRoutes from './routes/insights.routes.js';
import referralRoutes from './routes/referral.routes.js';
import conversationRoutes from './routes/conversation.routes.js';
import circleRoutes from './routes/circle.routes.js';
import motivationCardRoutes from './routes/motivationCard.routes.js';
import growthStoryRoutes from './routes/growthStory.routes.js';
import twinMatchRoutes from './routes/twinMatch.routes.js';
import adminRoutes from './routes/admin.routes.js';
import voiceRoutes from './routes/voice.routes.js';
import lifeCoachRoutes from './routes/lifeCoach.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { initJobs } from './jobs/reminderJob.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// 🛡️ ENHANCED SECURITY MIDDLEWARE
// ============================================

// Debugging Hang
app.use((req, res, next) => {
  console.log('DEBUG: Request received', req.method, req.path);
  next();
});

// Helmet with strict Content-Security-Policy
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", process.env.SUPABASE_URL, "https://api.openai.com", "https://generativelanguage.googleapis.com"],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for some API calls
}));

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    logger.warn(`CORS blocked request from: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ============================================
// 🚀 STABILITY ENHANCEMENTS
// ============================================

// Request timeout middleware (30 seconds default)
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000;
app.use((req, res, next) => {
  req.setTimeout(REQUEST_TIMEOUT, () => {
    logger.error(`Request timeout: ${req.method} ${req.path}`);
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  next();
});

// Body parsing middleware with strict limits
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// 🔒 RATE LIMITING (Multiple Tiers)
// ============================================

// Standard rate limiting
const standardLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded: ${req.ip}`);
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});

// Strict rate limiting for auth routes (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased for development
  message: { error: 'Too many login attempts, please try again later.' },
  skipSuccessfulRequests: true // Don't count successful logins
});

// Strict rate limiting for chat (expensive AI calls)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: { error: 'Sending messages too fast, please slow down.' }
});

// TEMPORARILY DISABLED ALL RATE LIMITING FOR DEVELOPMENT
// app.use('/api/', standardLimiter);
// app.use('/api/auth/login', authLimiter);
// app.use('/api/auth/register', authLimiter);
app.use('/api/chat/message', chatLimiter);

// ============================================
// 📝 REQUEST LOGGING
// ============================================

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.userId || 'anonymous'
    });
  });

  next();
});

// ============================================
// 🏥 HEALTH CHECK ENDPOINT
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage().heapUsed / 1024 / 1024 + ' MB'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// 🔗 API ROUTES
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/personality', personalityRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/daily', dailyRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/circles', circleRoutes);
app.use('/api/motivation-cards', motivationCardRoutes);
app.use('/api/growth-story', growthStoryRoutes);
app.use('/api/twin-match', twinMatchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/life-coach', lifeCoachRoutes);
app.use('/api/notifications', notificationRoutes);

// ============================================
// 📱 SERVE WEB APP (Flutter PWA)
// ============================================

// Serve static files from 'public' directory
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "connect-src 'self' https://lhwtfjgtripwikxwookp.supabase.co https://api.openai.com https://generativelanguage.googleapis.com https://www.gstatic.com https://fonts.googleapis.com https://fonts.gstatic.com https://apis.google.com; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.gstatic.com https://apis.google.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' data: https://lhwtfjgtripwikxwookp.supabase.co https://*.googleusercontent.com; " +
    "worker-src 'self' blob: https://www.gstatic.com https://apis.google.com;"
  );
  next();
});
app.use(express.static(path.join(__dirname, '../public')));

// Handle SPA routing - send index.html for any non-API route
app.get('*', (req, res, next) => {
  // If it's an API call that wasn't handled, let it fall through to 404
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// ============================================
// ❌ ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler - NEVER crashes the server
app.use((err, req, res, next) => {
  // Log error details
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.userId
  });

  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(err.status || 500).json({
    error: isProduction ? 'Internal server error' : err.message,
    ...((!isProduction) && { stack: err.stack })
  });
});

// ============================================
// 🖥️ SERVER STARTUP
// ============================================

const server = app.listen(PORT, () => {
  logger.info(`🚀 TwinMind API server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`⏱️ Request timeout: ${REQUEST_TIMEOUT}ms`);

  // Initialize cron jobs safely
  try {
    initJobs();
  } catch (error) {
    logger.error('Failed to initialize cron jobs:', error);
    // Don't crash - jobs are non-critical
  }
});

// ============================================
// 🛡️ PROCESS CRASH PROTECTION
// ============================================

// Handle uncaught exceptions - LOG but don't crash
process.on('uncaughtException', (error) => {
  logger.error('🔴 UNCAUGHT EXCEPTION:', {
    message: error.message,
    stack: error.stack
  });
  // In production, you might want to restart gracefully
  // For now, we log and continue
});

// Handle unhandled promise rejections - LOG but don't crash
process.on('unhandledRejection', (reason, promise) => {
  logger.error('🔴 UNHANDLED REJECTION:', {
    reason: reason?.message || reason,
    stack: reason?.stack
  });
  // Don't crash - just log
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
  logger.info('📥 SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('✅ Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

// Graceful shutdown on SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  logger.info('📥 SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('✅ Server closed');
    process.exit(0);
  });
});

// Memory usage warning
setInterval(() => {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);

  if (heapUsedMB > 500) { // Warn if over 500MB
    logger.warn(`⚠️ High memory usage: ${heapUsedMB}MB`);
  }
}, 60000); // Check every minute

export default app;

