import { Router } from 'express';
import { promClientRegistry } from '../../shared/metrics/registry';

export const metricsRouter = Router();

metricsRouter.get('/', async (_req, res) => {
  res.set('Content-Type', promClientRegistry.contentType);
  res.end(await promClientRegistry.metrics());
});

