/**
 * Logger - Structured console logging utility.
 *
 * Provides leveled logging: DEBUG, INFO, WARN, ERROR.
 * Configurable via LOG_LEVEL environment variable.
 */
const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

class Logger {
  constructor(context = 'General') {
    this.context = context;
    this.level = LEVELS[process.env.LOG_LEVEL || 'INFO'] || LEVELS.INFO;
  }

  _log(level, message, ...args) {
    if (LEVELS[level] >= this.level) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${level}] [${this.context}]`;
      // eslint-disable-next-line no-console
      console.log(`${prefix} ${message}`, ...args);
    }
  }

  debug(msg, ...args) { this._log('DEBUG', msg, ...args); }
  info(msg, ...args) { this._log('INFO', msg, ...args); }
  warn(msg, ...args) { this._log('WARN', msg, ...args); }
  error(msg, ...args) { this._log('ERROR', msg, ...args); }
}

module.exports = Logger;
