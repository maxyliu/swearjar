/**
 * Run script for the Discord Swear Jar Bot
 */
const { exec } = require('child_process');
const logger = require('./utils/logger');

// Start the bot
logger.info('Starting Discord Swear Jar Bot...');
require('./index.js');

// Keep the process alive
process.on('SIGINT', () => {
    logger.warn('Received SIGINT signal. Shutting down...');
    process.exit(0);
});

logger.info('Bot running. Press Ctrl+C to stop.');