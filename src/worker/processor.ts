import { Worker } from 'bullmq';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { env } from '../shared/config/env';
import { logger } from '../shared/logging/logger';
import type { MessageJob } from './queue';

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

// Minimal processor skeleton. Extend with Sonarr integration logic.
export function startMessageWorker(): Worker<MessageJob> {
  const worker = new Worker<MessageJob>(
    'message-queue',
    async (job) => {
      logger.info({ id: job.id, links: job.data.links }, 'Processing message job');
      // TODO: Integrate with Sonarr client and prioritization rules
      void env; // silence unused for now
    },
    { connection: { url: env.REDIS_URL } },
  );

  worker.on('failed', (job, err) => {
    logger.error({ id: job?.id, err }, 'Job failed');
  });
  worker.on('completed', (job) => {
    logger.info({ id: job.id }, 'Job completed');
  });

  return worker;
}

