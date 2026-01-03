/**
 * Logging utility for the application
 * Provides structured logging with different levels
 * In production, console.logs should be disabled
 */

const isDevelopment = __DEV__;

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (!isDevelopment && (level === LogLevel.DEBUG || level === LogLevel.INFO)) {
      return false;
    }
    return true;
  }

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} ${level} ${contextStr} ${message}`;
  }

  debug(message: string, context?: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, context), ...args);
    }
  }

  info(message: string, context?: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message, context), ...args);
    }
  }

  warn(message: string, context?: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, context), ...args);
    }
  }

  error(message: string, context?: string, error?: Error | any, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message, context), error, ...args);
      // In production, you could send errors to a service like Sentry here
      // if (error) {
      //   Sentry.captureException(error);
      // }
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports
export const log = {
  debug: (msg: string, ctx?: string, ...args: any[]) => logger.debug(msg, ctx, ...args),
  info: (msg: string, ctx?: string, ...args: any[]) => logger.info(msg, ctx, ...args),
  warn: (msg: string, ctx?: string, ...args: any[]) => logger.warn(msg, ctx, ...args),
  error: (msg: string, ctx?: string, err?: Error | any, ...args: any[]) => 
    logger.error(msg, ctx, err, ...args),
};

export default logger;
