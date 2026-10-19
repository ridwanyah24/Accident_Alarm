import { createApp } from './app';
import { config } from './config';
import { getDbStore, provisionInitialAdmin, seedDefaultData } from './db';

async function bootstrap() {
  if (config.nodeEnv === 'production') {
    for (const key of ['DATABASE_URL', 'AUTH_SECRET', 'GUEST_TOKEN_SECRET', 'INITIAL_ADMIN_EMAIL', 'INITIAL_ADMIN_PASSWORD']) {
      if (!process.env[key]) throw new Error(`${key} must be set in production.`);
    }
    if (config.authSecret.length < 32 || config.guestTokenSecret.length < 32) {
      throw new Error('AUTH_SECRET and GUEST_TOKEN_SECRET must each be at least 32 characters.');
    }
    if (process.env.INITIAL_ADMIN_PASSWORD!.length < 12) {
      throw new Error('INITIAL_ADMIN_PASSWORD must be at least 12 characters.');
    }
  }

  const store = getDbStore();

  if (config.nodeEnv === 'production') {
    await provisionInitialAdmin(store, process.env.INITIAL_ADMIN_EMAIL!, process.env.INITIAL_ADMIN_PASSWORD!);
    console.log('[Bootstrap] Initial administrator is ready.');
  } else {
    await seedDefaultData(store);
    console.log('[Bootstrap] Default demo agencies and staff accounts initialized.');
  }

  const app = createApp();

  const server = app.listen(config.port, config.host, () => {
    console.log(`[Accident Alarm API] Server running at http://${config.host}:${config.port}`);
    console.log(`[Accident Alarm API] Environment: ${config.nodeEnv}`);
    console.log(`[Accident Alarm API] Emergency Helpline configured: ${config.emergency.primary}`);
  });

  const shutdown = () => {
    console.log('[Accident Alarm API] Received termination signal. Closing gracefully...');
    server.close(() => {
      console.log('[Accident Alarm API] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (require.main === module) {
  bootstrap().catch(err => {
    console.error('[Bootstrap Error] Failed to start server:', err);
    process.exit(1);
  });
}
