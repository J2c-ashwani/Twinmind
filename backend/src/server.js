import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './config/logger.js';

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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: [
    process.env.WEB_APP_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3004'  // Flutter web app
  ],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`TwinMind API server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
