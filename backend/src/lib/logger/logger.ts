import { Injectable, Logger as NestLogger, Scope } from '@nestjs/common';

export interface LogContext {
  tenantId?: string;
  customerId?: string;
  subscriptionId?: string;
  requestId?: string;
  userId?: string;
  [key: string]: any;
}

/**
 * Structured logger with context support
 */
@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger {
  private readonly nestLogger: NestLogger;
  private context: LogContext = {};

  constructor(contextName: string) {
    this.nestLogger = new NestLogger(contextName);
  }

  /**
   * Set persistent context for this logger instance
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Merge temporary context with persistent context
   */
  private mergeContext(additionalContext?: LogContext): string {
    const merged = { ...this.context, ...additionalContext };
    if (Object.keys(merged).length === 0) {
      return '';
    }
    return JSON.stringify(merged);
  }

  log(message: string, context?: LogContext): void {
    const contextStr = this.mergeContext(context);
    this.nestLogger.log(`${message} ${contextStr}`);
  }

  error(message: string, trace?: string, context?: LogContext): void {
    const contextStr = this.mergeContext(context);
    this.nestLogger.error(`${message} ${contextStr}`, trace);
  }

  warn(message: string, context?: LogContext): void {
    const contextStr = this.mergeContext(context);
    this.nestLogger.warn(`${message} ${contextStr}`);
  }

  debug(message: string, context?: LogContext): void {
    const contextStr = this.mergeContext(context);
    this.nestLogger.debug(`${message} ${contextStr}`);
  }

  verbose(message: string, context?: LogContext): void {
    const contextStr = this.mergeContext(context);
    this.nestLogger.verbose(`${message} ${contextStr}`);
  }
}

/**
 * Factory function to create loggers
 */
export function createLogger(contextName: string, context?: LogContext): AppLogger {
  const logger = new AppLogger(contextName);
  if (context) {
    logger.setContext(context);
  }
  return logger;
}
