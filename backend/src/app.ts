import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

// Load Environment Variables
dotenv.config();

// Import Middleware & Routes
import { rateLimiter, sanitizeInput, securityHeaders } from './middleware/security.middleware';
import apiRouter from './routes';
import { initSocket } from './services/socket';

const app = express();
const server = http.createServer(app);

// Determine allowed origin — set CORS_ORIGIN env var in production (e.g. https://yourapp.vercel.app)
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Configure Socket.IO services
initSocket(io);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/foreverus';
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('[DATABASE] Connected to MongoDB successfully'))
  .catch((err) => console.error('[DATABASE] MongoDB connection error:', err));

// CORS Configuration
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Express Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply Security Middlewares
app.use(securityHeaders);
app.use(sanitizeInput);

// Apply Rate Limiter (Allow 150 requests per 15 minutes per IP)
app.use('/api/', rateLimiter(150, 15 * 60 * 1000));

// Local File Uploads Static Route Fallback
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// API Routes
app.use('/api', apiRouter);

// Healthcheck endpoints (both /health and /api/health for UptimeRobot keep-alive)
const healthHandler = (req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Root path fallback
app.get('/', (req, res) => {
  res.send('ForeverUs API Server is running...');
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[SERVER ERROR]', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

// Boot Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[SERVER] ForeverUs API listening on port ${PORT}`);
});
