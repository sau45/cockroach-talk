import { CorsOptions } from 'cors';
import { env } from './env.js';

const configuredOrigins = (env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

const devOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];

const isProduction = process.env.NODE_ENV === 'production';

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., curl, server-to-server health checks)
    if (!origin) {
      return callback(null, true);
    }

    const cleanOrigin = origin.replace(/\/$/, '');

    if (configuredOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    // In local development, also allow localhost
    if (!isProduction && devOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    // Reject unknown origins in production
    return callback(new Error(`CORS policy violation: Origin '${origin}' is not authorized.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-admin-password',
    'x-device-fingerprint',
    'x-author-tag'
  ]
};
