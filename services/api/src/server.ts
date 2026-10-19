import { createApp } from './app';
import { config } from './config';
import { getDbStore, seedDefaultData } from './db';

async function bootstrap() {
  const store = getDbStore();
  
  // Seed initial demo data
  await seedDefaultData(store);
  console.log('[Bootstrap] Default verified agencies and staff accounts initialized.');

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
