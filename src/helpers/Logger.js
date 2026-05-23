/**
 * Logger — Winston-powered structured logging utility.
 *
 * Transports:
 *   - Console: colorized, format [HH:mm:ss] LEVEL | message
 *   - File: logs/test-run.log (all levels)
 *   - File: logs/error.log (errors only)
 *
 * Methods:
 *   step(name, why, fn)  — wraps test.step() + logs STEP START / STEP DONE ✅
 *   action(method, el)   — logs a Playwright action (click, fill, goto …)
 *   verify(what, expect) — logs an assertion check
 *   info(message)        — general information log
 *   error(message, err?) — error log with optional Error object
 *   warn(message)        — warning log
 *   debug(message)       — debug log (only shown when LOG_LEVEL=debug)
 *
 * Usage:
 *   const Logger = require('./Logger');
 *   const logger = new Logger('LoginPage');
 *   await logger.step('Fill login form', 'Enter credentials', async () => {
 *     logger.action('fill', '#email');
 *     await emailInput.fill('user@test.com');
 *   });
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Ensure logs/ directory exists
const logsDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ── Custom timestamp format: [HH:mm:ss] ──────────────────────────────────────
const timeFormat = winston.format.printf(({ level, message, timestamp }) => {
  const time = timestamp ? timestamp.slice(11, 19) : new Date().toISOString().slice(11, 19);
  return `[${time}] ${level.toUpperCase().padEnd(5)} | ${message}`;
});

// ── Shared formats ────────────────────────────────────────────────────────────
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.uncolorize(),
  timeFormat
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.colorize({ all: true }),
  timeFormat
);

// ── Singleton Winston instance ────────────────────────────────────────────────
const _winstonLogger = winston.createLogger({
  level: config.LOG_LEVEL || 'info',
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({
      filename: path.join(logsDir, 'test-run.log'),
      format: fileFormat,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
    }),
  ],
});

// ── Logger class ─────────────────────────────────────────────────────────────
class Logger {
  /**
   * @param {string} [context='General'] - Label shown in log messages (e.g. class name)
   */
  constructor(context = 'General') {
    this.context = context;
  }

  /** @private */
  _msg(message) {
    return `[${this.context}] ${message}`;
  }

  // ── Basic log levels ──────────────────────────────────────────────────────

  info(message) {
    _winstonLogger.info(this._msg(message));
  }

  warn(message) {
    _winstonLogger.warn(this._msg(message));
  }

  debug(message) {
    _winstonLogger.debug(this._msg(message));
  }

  /**
   * Log an error.
   * @param {string} message
   * @param {Error} [err] - Optional Error object; stack trace is appended
   */
  error(message, err) {
    const detail = err ? ` | ${err.message}\n${err.stack}` : '';
    _winstonLogger.error(this._msg(`${message}${detail}`));
  }

  // ── Semantic helpers ──────────────────────────────────────────────────────

  /**
   * Log a Playwright action (click, fill, goto, select …).
   * @param {string} method  - Action name e.g. 'click', 'fill'
   * @param {string} element - Element description or selector
   */
  action(method, element) {
    _winstonLogger.info(this._msg(`  ▶ ${method.toUpperCase()} → ${element}`));
  }

  /**
   * Log an assertion / verification step.
   * @param {string} what     - What is being verified
   * @param {string} expected - Expected value or condition
   */
  verify(what, expected) {
    _winstonLogger.info(this._msg(`  🔍 VERIFY [${what}] expected: ${expected}`));
  }

  /**
   * Wrap a block in a named step — logs STEP START + STEP DONE ✅.
   * Integrates with Playwright's test.step() when called inside a test,
   * otherwise falls back to a plain async wrapper.
   *
   * @param {string}   name - Step name shown in reporter
   * @param {string}   why  - Short reason / intent
   * @param {Function} fn   - Async function containing the step actions
   * @returns {Promise<*>} Result of fn()
   *
   * @example
   * await logger.step('Fill login form', 'Enter valid credentials', async () => {
   *   logger.action('fill', '#email');
   *   await page.fill('#email', 'user@test.com');
   * });
   */
  async step(name, why, fn) {
    _winstonLogger.info(this._msg(`📌 STEP START — ${name}${why ? ` [${why}]` : ''}`));
    if (typeof fn !== 'function') {
      // Called as Logger.step('message') — just log, no wrapper
      return;
    }
    try {
      // Use Playwright's test.step() if we're inside a test context
      const { test } = require('@playwright/test');
      let result;
      try {
        result = await test.step(name, fn);
      } catch {
        // Not inside a Playwright test context — run fn directly
        result = await fn();
      }
      _winstonLogger.info(this._msg(`✅ STEP DONE  — ${name}`));
      return result;
    } catch (err) {
      _winstonLogger.error(this._msg(`❌ STEP FAIL  — ${name} | ${err.message}`));
      throw err;
    }
  }

  // ── Static convenience methods ───────────────────────────────────────────
  // Allow Logger.step(), Logger.info(), etc. without creating an instance.
  // Used by all spec files: const Logger = require('...'); Logger.step('...');

  static _default = new Logger('Test');

  static step(name, why, fn)       { return Logger._default.step(name, why, fn); }
  static action(method, element)   { return Logger._default.action(method, element); }
  static verify(what, expected)    { return Logger._default.verify(what, expected); }
  static info(message)             { return Logger._default.info(message); }
  static warn(message)             { return Logger._default.warn(message); }
  static debug(message)            { return Logger._default.debug(message); }
  static error(message, err)       { return Logger._default.error(message, err); }
}

module.exports = Logger;
