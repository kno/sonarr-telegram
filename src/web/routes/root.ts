import { Router } from 'express';
// package.json is available at runtime (copied in Docker and present in dev)
// The relative path works from both src (dev) and dist (build) thanks to resolveJsonModule
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pkg from '../../../package.json';

export const rootRouter = Router();

rootRouter.get('/', (_req, res) => {
  res.json({
    name: pkg.name ?? 'sonarr-telegram',
    version: pkg.version ?? '0.0.0',
    uptime_s: Math.floor(process.uptime()),
    endpoints: {
      health: '/api/health',
      metrics: '/metrics',
      enqueue: '/api/queue/enqueue',
    },
  });
});

