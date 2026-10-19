import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { requestIdMiddleware, createRateLimiter } from './common/middleware';
import { errorHandler } from './common/errors';
import { healthRouter } from './health/health.controller';
import { publicConfigRouter } from './config/public-config.controller';
import { authRouter } from './auth/auth.controller';
import { incidentsRouter, staffIncidentsRouter } from './incidents/incidents.controller';
import { assignmentsRouter } from './assignments/assignments.controller';
import { uploadsRouter } from './uploads/uploads.controller';
import { adminRouter } from './admin/admin.controller';
import { getDbStore, provisionInitialAdmin } from './db';

let productionInitialization: Promise<void> | undefined;

async function initializeProduction(): Promise<void> {
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET || !process.env.GUEST_TOKEN_SECRET || !process.env.INITIAL_ADMIN_EMAIL) {
    throw new Error('DATABASE_URL, AUTH_SECRET, GUEST_TOKEN_SECRET, and INITIAL_ADMIN_EMAIL must be configured.');
  }
  if (config.authSecret.length < 32 || config.guestTokenSecret.length < 32) {
    throw new Error('AUTH_SECRET and GUEST_TOKEN_SECRET must each be at least 32 characters.');
  }

  const store = getDbStore();
  if (!(await store.checkHealth())) {
    throw new Error('Database health check failed.');
  }

  const email = process.env.INITIAL_ADMIN_EMAIL;
  if (!(await store.findUserByEmail(email))) {
    const password = process.env.INITIAL_ADMIN_PASSWORD;
    if (!password || password.length < 12) {
      throw new Error('Set INITIAL_ADMIN_PASSWORD to a unique password of at least 12 characters to create the initial administrator.');
    }
    await provisionInitialAdmin(store, email, password);
  }
}

export function createApp(): Express {
  const app = express();

  // 1. Security Headers & CORS
  app.use(helmet({
    contentSecurityPolicy: false, // allow flexible dashboard integration
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  const allowedOrigins = config.webAppOrigin.split(',').map(origin => origin.trim()).filter(Boolean);
  app.use(cors({
    origin: config.nodeEnv === 'production'
      ? allowedOrigins
      : [...allowedOrigins, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Guest-Token', 'X-Request-Id']
  }));

  // 2. Request Parsing & Size Limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 3. Correlation Tracking & Global Rate Limiting
  app.use(requestIdMiddleware);
  if (config.nodeEnv === 'production') {
    app.use((_req, _res, next) => {
      productionInitialization ??= initializeProduction();
      productionInitialization.then(() => next()).catch(error => {
        productionInitialization = undefined;
        next(error);
      });
    });
  }
  app.use(createRateLimiter({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxGeneral
  }));

  // 4. Mount API Routes
  app.use('/health', healthRouter);
  app.use('/api/v1/config', publicConfigRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/incidents', incidentsRouter);
  app.use('/api/v1/staff', staffIncidentsRouter);
  app.use('/api/v1/staff', assignmentsRouter);
  app.use('/api/v1/staff', adminRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api', uploadsRouter);

  // 5. Catch-all 404 Route
  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} does not exist.`,
        requestId: req.id
      }
    });
  });

  // 6. Global Safe Error Handler
  app.use(errorHandler);

  return app;
}

const app = createApp();
module.exports = Object.assign(app, { createApp });
