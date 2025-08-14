/**
 * JavaScript logger utility for Node.js scripts
 * Only logs in development environment or when DEBUG flag is set
 */

const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
};

class Logger {
    constructor(config = {}) {
        this.config = {
            enableDebug: true,
            enableInfo: true,
            enableWarn: true,
            enableError: true,
            prefix: '',
            ...config,
        };

        // Check if we're in development environment
        this.isDevelopment = process.env.NODE_ENV === 'development' || 
                           process.env.NODE_ENV === undefined;
        
        // Check for explicit DEBUG flag
        this.isDebugEnabled = process.env.DEBUG === 'true' || 
                             process.env.DEBUG === '1';
    }

    shouldLog(level) {
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

    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const levelStr = Object.keys(LogLevel).find(key => LogLevel[key] === level);
        const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
        
        return `${timestamp} ${levelStr}${prefix} ${message}`;
    }

    debug(message, ...args) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.log(this.formatMessage(LogLevel.DEBUG, message), ...args);
        }
    }

    info(message, ...args) {
        if (this.shouldLog(LogLevel.INFO)) {
            console.log(this.formatMessage(LogLevel.INFO, message), ...args);
        }
    }

    warn(message, ...args) {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(this.formatMessage(LogLevel.WARN, message), ...args);
        }
    }

    error(message, ...args) {
        if (this.shouldLog(LogLevel.ERROR)) {
            console.error(this.formatMessage(LogLevel.ERROR, message), ...args);
        }
    }

    // Convenience method for conditional logging based on environment
    devLog(message, ...args) {
        if (this.isDevelopment || this.isDebugEnabled) {
            console.log(`[DEV] ${message}`, ...args);
        }
    }
}

// Create default logger instance
const logger = new Logger();

// Create logger factory for custom configurations
function createLogger(config) {
    return new Logger(config);
}

export { Logger, LogLevel, logger, createLogger };