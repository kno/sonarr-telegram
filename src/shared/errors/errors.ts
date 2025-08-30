export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export class AppError extends Error {
  public readonly name: string;
  public readonly status: number;
  public readonly level: LogLevel;
  public readonly cause?: unknown;

  constructor(name: string, message: string, status = 500, level: LogLevel = 'error', cause?: unknown) {
    super(message);
    this.name = name;
    this.status = status;
    this.level = level;
    this.cause = cause;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UnauthorizedError', message, 401, 'warn');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super('ValidationError', message, 400, 'warn');
  }
}

