import express, { NextFunction, Request, Response } from 'express';
import { createApp } from './app';
import { config } from './config';
import { getDbStore, provisionInitialAdmin } from './db';

let initialization: Promise<void> | undefined;

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

const app = express();
app.use((_req: Request, _res: Response, next: NextFunction) => {
  initialization ??= initializeProduction();
  initialization.then(() => next()).catch(error => {
    initialization = undefined;
    next(error);
  });
});
app.use(createApp());

export default app;
