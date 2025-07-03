// src/utils/log.ts
// Simple logging utility that always writes to stderr, never stdout

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
}

export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || LogLevel.INFO;
    this.prefix = options.prefix || '';
  }

  error(message: string, ...args: unknown[]) {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.write('ERROR', message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]) {
    if (this.shouldLog(LogLevel.WARN)) {
      this.write('WARN', message, ...args);
    }
  }

  info(message: string, ...args: unknown[]) {
    if (this.shouldLog(LogLevel.INFO)) {
      this.write('INFO', message, ...args);
    }
  }

  debug(message: string, ...args: unknown[]) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.write('DEBUG', message, ...args);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const order = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    return order.indexOf(level) <= order.indexOf(this.level);
  }

  private write(level: string, message: string, ...args: unknown[]) {
    const prefix = this.prefix ? `[${this.prefix}]` : '';
    const time = new Date().toISOString();
    const output = `${time} ${prefix} [${level}] ${message}`;
    if (args.length > 0) {
      process.stderr.write(output + ' ' + args.map(a => JSON.stringify(a)).join(' ') + '\n');
    } else {
      process.stderr.write(output + '\n');
    }
  }
}

export const defaultLogger = new Logger({ level: LogLevel.INFO });
