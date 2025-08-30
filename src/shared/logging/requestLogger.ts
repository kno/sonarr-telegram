import pinoHttp from 'pino-http';
import { logger } from './logger';

export const requestLogger = pinoHttp({
  logger,
  customSuccessMessage() {
    return 'request completed';
  },
  customErrorMessage(_req, _res, err) {
    return `request errored: ${err.message}`;
  },
});

