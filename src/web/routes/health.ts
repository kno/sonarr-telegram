import { Router } from 'express';
import { promClientRegistry } from '../../shared/metrics/registry';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

healthRouter.get('/metrics', async (_req, res) => {
  res.set('Content-Type', promClientRegistry.contentType);
  res.end(await promClientRegistry.metrics());
});

