import { createServer } from 'http';
import { app } from './web/app';
import { env } from './shared/config/env';
import { logger } from './shared/logging/logger';
import { startMessageWorker } from './worker/processor';
import { telegramService } from './services/telegram/TelegramService';
import { runMigrations } from './shared/db/migrate';

const server = createServer(app);

const port = env.PORT;
async function boot(): Promise<void> {
  // Run DB migrations before starting services
  await runMigrations();

  server.listen(port, () => {
    logger.info({ port }, 'HTTP server listening');
  });

  // Start async services
  const worker = startMessageWorker();
  void telegramService.start();

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down');
    try {
      await telegramService.stop();
      await worker.close();
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
    }
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down');
    try {
      await telegramService.stop();
      await worker.close();
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
    }
    process.exit(0);
  });
}

boot().catch((err) => {
  logger.error({ err }, 'Fatal error on boot');
  process.exit(1);
});
