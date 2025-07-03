/**
 * MCP-safe logging utilities
 * 
 * This module provides logging that never pollutes STDIO output, which is critical
 * for MCP protocol compliance when using STDIO transport.
 * 
 * - Uses stderr for all log output (STDIO transport uses stdout)
 * - Provides structured logging with timestamps and levels
 * - Can be safely used in both STDIO and HTTP server contexts
 * - Supports environment-based log level configuration
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel;

  constructor() {
    // Default to 'info' level, can be overridden by environment
    this.level = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private writeToStderr(level: LogLevel, message: string, ...args: any[]) {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    const prefix = `[${timestamp}] ${levelStr}`;
    
    // Use stderr to avoid polluting STDIO MCP protocol
    if (args.length > 0) {
      process.stderr.write(`${prefix} ${message}\n`);
      args.forEach(arg => {
        process.stderr.write(`${prefix} ${typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)}\n`);
      });
    } else {
      process.stderr.write(`${prefix} ${message}\n`);
    }
  }

  debug(message: string, ...args: any[]) {
    this.writeToStderr('debug', message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.writeToStderr('info', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.writeToStderr('warn', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.writeToStderr('error', message, ...args);
  }

  /**
   * Create a child logger with a context prefix
   */
  child(context: string): Logger {
    const childLogger = new Logger();
    childLogger.level = this.level;
    
    // Override write method to include context
    const originalWrite = childLogger.writeToStderr.bind(childLogger);
    childLogger.writeToStderr = (level: LogLevel, message: string, ...args: any[]) => {
      originalWrite(level, `[${context}] ${message}`, ...args);
    };
    
    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export logger factory for convenience
export function createLogger(context?: string): Logger {
  return context ? logger.child(context) : logger;
}