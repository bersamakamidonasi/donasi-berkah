/**
 * Simple logging utility
 * Provides consistent logging across the application
 */

/**
 * Log levels
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * Current log level based on environment
 */
const currentLogLevel = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

/**
 * Format log message with timestamp
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {any} data - Additional data to log
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const baseMessage = `[${timestamp}] [${level}] ${message}`;

  if (data) {
    return `${baseMessage} ${JSON.stringify(data, null, 2)}`;
  }

  return baseMessage;
}

/**
 * Log error message
 * @param {string} message - Error message
 * @param {any} data - Additional error data
 */
function error(message, data = null) {
  if (currentLogLevel >= LOG_LEVELS.ERROR) {
    console.error(formatLogMessage('ERROR', message, data));
  }
}

/**
 * Log warning message
 * @param {string} message - Warning message
 * @param {any} data - Additional warning data
 */
function warn(message, data = null) {
  if (currentLogLevel >= LOG_LEVELS.WARN) {
    console.warn(formatLogMessage('WARN', message, data));
  }
}

/**
 * Log info message
 * @param {string} message - Info message
 * @param {any} data - Additional info data
 */
function info(message, data = null) {
  if (currentLogLevel >= LOG_LEVELS.INFO) {
    console.log(formatLogMessage('INFO', message, data));
  }
}

/**
 * Log debug message
 * @param {string} message - Debug message
 * @param {any} data - Additional debug data
 */
function debug(message, data = null) {
  if (currentLogLevel >= LOG_LEVELS.DEBUG) {
    console.log(formatLogMessage('DEBUG', message, data));
  }
}

module.exports = {
  LOG_LEVELS,
  error,
  warn,
  info,
  debug
};
