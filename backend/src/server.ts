import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';

import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { corsOptions } from './config/cors.js';
import { initializeSocket } from './config/socket.js';
import { sessionMiddleware } from './middleware/session.js';
import { errorHandler } from './middleware/errorHandler.js';
import { securityService } from './services/security.service.js';

import { createCommentsRouter } from './routes/comments.routes.js';
import { createRoomsRouter } from './routes/rooms.routes.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createAdminRouter } from './routes/admin.routes.js';

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);
securityService.setSocketServer(io);

// Security & Parsing Middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(mongoSanitize());

// Session Identity Extraction
app.use(sessionMiddleware);

// Render & Deployment Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'cockroachtalk-backend',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/comments', createCommentsRouter(io));
app.use('/api/rooms', createRoomsRouter(io));
app.use('/api/auth', createAuthRouter());
app.use('/api/admin', createAdminRouter(io));

// Backward Compatibility Aliases for legacy path callers
app.use('/api/reports', (req, res, next) => {
  req.url = '/reports';
  createAdminRouter(io)(req, res, next);
});
app.use('/api/report-user', (req, res, next) => {
  req.url = '/report-user';
  createAdminRouter(io)(req, res, next);
});
app.use('/api/create-room', (req, res, next) => {
  req.url = '/create-room';
  createRoomsRouter(io)(req, res, next);
});
app.use('/api/leave-room', (req, res, next) => {
  req.url = '/leave-room';
  createRoomsRouter(io)(req, res, next);
});
app.use('/api/turn-credentials', (req, res, next) => {
  req.url = '/turn-credentials';
  createRoomsRouter(io)(req, res, next);
});

// Centralized Error Handling
app.use(errorHandler);

// Start Database & Server
async function startServer() {
  await connectDB();

  server.listen(env.PORT, () => {
    console.log(`\n🚀 CockroachTalk Express Backend running on http://localhost:${env.PORT}\n`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = env.PORT + 1;
      console.warn(`Port ${env.PORT} in use, retrying on ${fallbackPort}...`);
      server.listen(fallbackPort, () => {
        console.log(`🚀 CockroachTalk Express Backend running on fallback port http://localhost:${fallbackPort}\n`);
      });
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
