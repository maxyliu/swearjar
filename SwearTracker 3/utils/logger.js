/**
 * Simple logging utility with timestamps and colorful output
 */

/**
 * Format the current timestamp for logging
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
    const now = new Date();
    return `[${now.toISOString()}]`;
}

/**
 * Log a debug message
 * @param {string} message - The debug message
 * @param {*} data - Optional data to log
 */
function debug(message, data = null) {
    const timestamp = getTimestamp();
    if (data) {
        console.debug(`${timestamp} [DEBUG] ${message}`, data);
    } else {
        console.debug(`${timestamp} [DEBUG] ${message}`);
    }
}

/**
 * Log an info message
 * @param {string} message - The info message
 * @param {*} data - Optional data to log
 */
function info(message, data = null) {
    const timestamp = getTimestamp();
    if (data) {
        console.info(`${timestamp} [INFO] ${message}`, data);
    } else {
        console.info(`${timestamp} [INFO] ${message}`);
    }
}

/**
 * Log a warning message
 * @param {string} message - The warning message
 * @param {*} data - Optional data to log
 */
function warn(message, data = null) {
    const timestamp = getTimestamp();
    if (data) {
        console.warn(`${timestamp} [WARNING] ${message}`, data);
    } else {
        console.warn(`${timestamp} [WARNING] ${message}`);
    }
}

/**
 * Log an error message
 * @param {string} message - The error message
 * @param {*} data - Optional data to log
 */
function error(message, data = null) {
    const timestamp = getTimestamp();
    if (data) {
        console.error(`${timestamp} [ERROR] ${message}`, data);
    } else {
        console.error(`${timestamp} [ERROR] ${message}`);
    }
}

module.exports = {
    getTimestamp,
    debug,
    info,
    warn,
    error
};