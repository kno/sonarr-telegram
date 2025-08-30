import type { NextFunction, Request, Response } from 'express';
import { logger } from '../../shared/logging/logger';
import { AppError } from '../../shared/errors/errors';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('NotFoundError', 'Route not found', 404));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    if (err.level !== 'silent') {
      logger[err.level]({ err, cause: err.cause }, err.message);
    }
    res.status(err.status).json({ error: err.name, message: err.message });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'InternalServerError', message: 'Unexpected error' });
}

