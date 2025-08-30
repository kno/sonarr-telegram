import { Queue } from 'bullmq';
import { env } from '../shared/config/env';

export type MessageJob = {
  text: string;
  links: string[];
  source: string;
};

export const messageQueue = new Queue<MessageJob>('message-queue', {
  connection: { url: env.REDIS_URL },
});

