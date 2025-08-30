import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from '../shared/config/env';
import { requestLogger } from '../shared/logging/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/error';
import { healthRouter } from './routes/health';
import { queueRouter } from './routes/queue';
import { metricsRouter } from './routes/metrics';

export const app = express();

app.set('trust proxy', env.TRUST_PROXY);

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.RATE_LIMIT_PER_MIN,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use('/api/health', healthRouter);
app.use('/api/queue', queueRouter);
app.use('/metrics', metricsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

