/**
 * Centralized logging utility for production-safe logging
 * Only logs in development environment or when DEBUG flag is set
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerConfig {
  enableDebug?: boolean;
  enableInfo?: boolean;
  enableWarn?: boolean;
  enableError?: boolean;
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;
  private isDevelopment: boolean;
  private isDebugEnabled: boolean;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      enableDebug: true,
      enableInfo: true,
      enableWarn: true,
      enableError: true,
      prefix: '',
      ...config,
    };

    // Check if we're in development environment
    this.isDevelopment = typeof process !== 'undefined' && 
      (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined);
    
    // Check for explicit DEBUG flag
    this.isDebugEnabled = typeof process !== 'undefined' && 
      (process.env.DEBUG === 'true' || process.env.DEBUG === '1');
  }

  private shouldLog(level: LogLevel): boolean {
    // Always allow errors
    if (level === LogLevel.ERROR) {
      return this.config.enableError !== false;
    }

    // In production, only log warnings and errors unless DEBUG is explicitly set
    if (!this.isDevelopment && !this.isDebugEnabled) {
      return level >= LogLevel.WARN;
    }

    // In development or with DEBUG flag, respect individual level settings
    switch (level) {
      case LogLevel.DEBUG:
        return this.config.enableDebug !== false;
      case LogLevel.INFO:
        return this.config.enableInfo !== false;
      case LogLevel.WARN:
        return this.config.enableWarn !== false;
      default:
        return true;
    }
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    
    return `${timestamp} ${levelStr}${prefix} ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage(LogLevel.INFO, message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message), ...args);
    }
  }

  fatal(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, `FATAL: ${message}`), ...args);
    }
  }

  // Convenience method for conditional logging based on environment
  devLog(message: string, ...args: unknown[]): void {
    if (this.isDevelopment || this.isDebugEnabled) {
      console.log(`[DEV] ${message}`, ...args);
    }
  }
}

// Create default logger instance
export const logger = new Logger();

// Create logger factory for custom configurations
export function createLogger(config: LoggerConfig): Logger {
  return new Logger(config);
}

// Deno-compatible logger for scripts
export function createDenoLogger(prefix?: string): Logger {
  return new Logger(prefix ? { prefix } : {});
}