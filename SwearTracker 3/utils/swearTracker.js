const { Pool } = require('pg');
const logger = require('./logger');
const config = require('../config');

/**
 * Character substitution mapping for detecting bypass attempts
 * For example: a -> @, e -> 3, etc.
 */
const CHAR_SUBSTITUTIONS = {
    'a': ['a', '@', '4', 'á', 'à', 'â', 'ä', 'å', 'ã', 'α'],
    'b': ['b', '8', 'ß', '6'],
    'c': ['c', '(', '[', '{', '<', '©', 'ç'],
    'd': ['d', 'δ'],
    'e': ['e', '3', 'é', 'è', 'ê', 'ë', 'ē', 'ε'],
    'f': ['f', 'ƒ', 'ph'],
    'g': ['g', '9', 'ğ', 'γ'],
    'h': ['h', 'η'],
    'i': ['i', '1', '!', '|', 'í', 'ì', 'î', 'ï', 'ι'],
    'j': ['j'],
    'k': ['k', 'κ'],
    'l': ['l', '1', '|', 'ł', 'λ'],
    'm': ['m', 'μ'],
    'n': ['n', 'ñ', 'η', 'ν'],
    'o': ['o', '0', 'ó', 'ò', 'ô', 'ö', 'õ', 'ø', '○', 'ο'],
    'p': ['p', 'þ', 'ρ'],
    'q': ['q'],
    'r': ['r', 'ř', 'ρ'],
    's': ['s', '5', '$', 'š', 'σ'],
    't': ['t', '7', '+', 'τ'],
    'u': ['u', 'ú', 'ù', 'û', 'ü', 'µ', 'υ'],
    'v': ['v', 'ν'],
    'w': ['w', 'ω'],
    'x': ['x', '×', 'χ'],
    'y': ['y', 'ý', 'ÿ', '¥', 'γ'],
    'z': ['z', 'ž', 'ζ']
};

/**
 * SwearTracker class that handles the tracking and detection of swear words
 */
class SwearTracker {
    /**
     * Initialize the swear tracker with the list of tracked words
     */
    constructor() {
        // Setup PostgreSQL connection pool
        this.pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            database: process.env.DB_NAME || 'postgres'
        });

        // Load initial list of swear words
        this.swearWords = new Set(config.swearWords.map(word => word.toLowerCase()));

        // Load whitelist
        this.whitelist = new Set(config.whitelist.map(word => word.toLowerCase()));

        // Set to track notification-enabled channels
        this.notificationChannels = new Set();

        // Compiled regex patterns for each word (for bypass detection)
        this.bypassPatterns = {};

        // Initialize bypass patterns for each word
        this._initializeBypassPatterns();

        logger.info(`SwearTracker initialized with ${this.swearWords.size} tracked words`);
    }

    /**
     * Initialize bypass patterns for all swear words
     * @private
     */
    _initializeBypassPatterns() {
        for (const word of this.swearWords) {
            this.bypassPatterns[word] = this._createBypassPattern(word);
        }
    }

    /**
     * Create a regex pattern that detects common bypass techniques for a word
     * @param {string} word - The word to create a bypass pattern for
     * @returns {RegExp|null} Compiled regex pattern for bypass detection or null if pattern is invalid
     * @private
     */
    _createBypassPattern(word) {
        try {
            // Create a pattern that matches:
            // - Inserted spaces or special chars between letters
            // - Character substitutions (a->@, e->3, etc.)

            let pattern = '';

            // For each character in the word, create a pattern that matches any of its substitutions
            for (let i = 0; i < word.length; i++) {
                const char = word[i].toLowerCase();

                // If we have substitutions for this character, use them
                if (CHAR_SUBSTITUTIONS[char]) {
                    const substitutions = CHAR_SUBSTITUTIONS[char].map(c => {
                        // Escape special regex characters to prevent errors
                        return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    }).join('|');
                    pattern += `(?:${substitutions})`;
                } else {
                    // Otherwise, just match the character itself (escaped)
                    pattern += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                }

                // Add optional spaces or special characters between each letter (not after the last one)
                if (i < word.length - 1) {
                    pattern += '[\\s\\W]*';
                }
            }

            // Simple pattern that just checks for the characters in sequence with possible spaces/special chars between
            return new RegExp(pattern, 'i');
        } catch (error) {
            logger.error(`Error creating bypass pattern for word "${word}":`, error);
            return null;
        }
    }

    /**
     * Initialize the database tables
     * @returns {Promise<boolean>} Success status
     */
    async initializeDatabase() {
        try {
            // Create a connection from the pool
            const client = await this.pool.connect();

            try {
                // Create the swear_events table if it doesn't exist
                await client.query(`
                    CREATE TABLE IF NOT EXISTS swear_events (
                        id SERIAL PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        username TEXT NOT NULL,
                        message_content TEXT NOT NULL,
                        words_used JSONB NOT NULL,
                        timestamp TIMESTAMP DEFAULT NOW()
                    )
                `);

                // Create the notification_channels table if it doesn't exist
                await client.query(`
                    CREATE TABLE IF NOT EXISTS notification_channels (
                        channel_id TEXT PRIMARY KEY,
                        enabled BOOLEAN NOT NULL DEFAULT TRUE
                    )
                `);

                // Create the custom_words table if it doesn't exist
                await client.query(`
                    CREATE TABLE IF NOT EXISTS custom_words (
                        word TEXT PRIMARY KEY,
                        added_by TEXT,
                        added_at TIMESTAMP DEFAULT NOW()
                    )
                `);

                // Load notification channels from database
                const notifyResult = await client.query('SELECT channel_id FROM notification_channels WHERE enabled = TRUE');
                this.notificationChannels.clear();
                notifyResult.rows.forEach(row => {
                    this.notificationChannels.add(row.channel_id);
                });

                // Load custom words from database
                const wordsResult = await client.query('SELECT word FROM custom_words');
                wordsResult.rows.forEach(row => {
                    this.swearWords.add(row.word.toLowerCase());
                    this.bypassPatterns[row.word.toLowerCase()] = this._createBypassPattern(row.word.toLowerCase());
                });

                logger.info('Database tables initialized successfully');
                return true;
            } finally {
                client.release();
            }
        } catch (err) {
            logger.error('Error initializing database', err);
            return false;
        }
    }

    /**
     * Process a message to detect and count swear words
     * @param {string} userId - The Discord user ID
     * @param {string} username - The Discord username
     * @param {string} messageContent - The message content to process
     * @returns {Promise<number>} The number of swear words found
     */
    async processMessage(userId, username, messageContent) {
        // Skip empty messages and messages from bots
        if (!messageContent || !messageContent.trim()) {
            return 0;
        }

        // Remove Discord emoji patterns before processing
        const cleanMessage = messageContent.replace(/<a?:\w+:\d+>/g, '');

        // Normalize message to improve detection
        const normalizedMessage = this._normalizeMessage(cleanMessage);

        // Check if the message contains any whitelisted words and skip those
        const words = normalizedMessage.split(/\s+/);
        const isWhitelisted = words.some(word => this.whitelist.has(word.toLowerCase()));
        if (isWhitelisted) {
            logger.info(`Skipping whitelisted word in message from ${username}`);
            return 0;
        }

        // Find swear words in the message
        const wordsFound = {};
        let totalFound = 0;

        // Three-pass detection:
        // 1. First look for exact whole word matches
        for (const word of this.swearWords) {
            // Create a regex that looks for the word as a whole word
            const exactRegex = new RegExp(`\\b${word}\\b`, 'gi');

            // Find all matches
            const matches = normalizedMessage.match(exactRegex);

            if (matches) {
                wordsFound[word] = matches.length;
                totalFound += matches.length;

                // Log the detection
                logger.info(`Detected exact swear word "${word}" from ${username} (${userId}): ${matches.length} occurrences`);
            }
        }

        // 2. Look for swear words inside other words (if no exact matches)
        if (totalFound === 0) {
            for (const word of this.swearWords) {
                // Skip very short words to prevent false positives (like "as" in "class")
                if (word.length < 3) continue;

                // Create a regex that looks for the word as part of other words
                // We use word boundaries where possible to reduce false positives
                const partialRegex = new RegExp(word, 'gi');

                // Find all matches
                const matches = normalizedMessage.match(partialRegex);

                if (matches) {
                    wordsFound[word] = matches.length;
                    totalFound += matches.length;

                    // Log the detection
                    logger.info(`Detected embedded swear word "${word}" in "${normalizedMessage}" from ${username} (${userId})`);
                }
            }
        }

        // 3. Then look for bypass attempts (if still no matches found)
        if (totalFound === 0) {
            for (const word of this.swearWords) {
                try {
                    // Use the pre-compiled bypass pattern
                    const pattern = this.bypassPatterns[word];

                    // Test if the message contains a bypass attempt
                    if (pattern && pattern.test(normalizedMessage)) {
                        wordsFound[word] = 1; // Count as 1 for bypass attempts
                        totalFound += 1;

                        // Log the detection
                        logger.info(`Detected bypass attempt for "${word}" from ${username} (${userId})`);
                    }
                } catch (error) {
                    logger.error(`Error with bypass pattern for word "${word}":`, error);
                }
            }
        }

        // If swear words were found, record them
        if (totalFound > 0) {
            await this._recordSwearEvent(userId, username, messageContent, wordsFound);
        }

        return totalFound;
    }

    /**
     * Normalize a message to improve detection of bypasses
     * @param {string} message - The message to normalize
     * @returns {string} The normalized message
     * @private
     */
    _normalizeMessage(message) {
        return message
            .toLowerCase()
            // Replace common accented characters
            .replace(/[áàâäãåā]/g, 'a')
            .replace(/[éèêëē]/g, 'e')
            .replace(/[íìîï]/g, 'i')
            .replace(/[óòôöõø]/g, 'o')
            .replace(/[úùûü]/g, 'u')
            .replace(/[ýÿ]/g, 'y')
            .replace(/[ç]/g, 'c')
            .replace(/[ñ]/g, 'n')
            .replace(/[ß]/g, 'b')
            // Common character substitutions
            .replace(/@/g, 'a')
            .replace(/4/g, 'a')
            .replace(/8/g, 'b')
            .replace(/\(/g, 'c')
            .replace(/3/g, 'e')
            .replace(/9/g, 'g')
            .replace(/1/g, 'i')
            .replace(/\!/g, 'i')
            .replace(/\|/g, 'i')
            .replace(/0/g, 'o')
            .replace(/5/g, 's')
            .replace(/\$/g, 's')
            .replace(/7/g, 't')
            .replace(/\+/g, 't');
    }

    /**
     * Record a new swear word event
     * @param {string} userId - The Discord user ID
     * @param {string} username - The Discord username
     * @param {string} messageContent - The message content
     * @param {Object} wordsUsed - Dictionary of word -> count pairs
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async _recordSwearEvent(userId, username, messageContent, wordsUsed) {
        try {
            // Create a connection from the pool
            const client = await this.pool.connect();

            try {
                // Count total swear words in this message
                const totalSwearCount = Object.values(wordsUsed).reduce((sum, count) => sum + count, 0);

                // Insert one record for each swear word occurrence (so they count as separate instances)
                // This makes the leaderboard and statistics count each swear word individually
                for (let i = 0; i < totalSwearCount; i++) {
                    await client.query(
                        'INSERT INTO swear_events (user_id, username, message_content, words_used) VALUES ($1, $2, $3, $4)',
                        [userId, username, messageContent, JSON.stringify(wordsUsed)]
                    );
                }

                logger.info(`Recorded ${totalSwearCount} swear events for ${username} (${userId}) with ${Object.keys(wordsUsed).length} unique words`);
                return true;
            } finally {
                client.release();
            }
        } catch (err) {
            logger.error('Error recording swear event', err);
            return false;
        }
    }

    /**
     * Get stats for a specific user
     * @param {string} userId - The Discord user ID
     * @returns {Promise<Object|null>} The user's stats or null if not found
     */
    async getUserStats(userId) {
        try {
            // Create a connection from the pool
            const client = await this.pool.connect();

            try {
                // Get total swear count
                const countResult = await client.query(
                    'SELECT COUNT(*) as count FROM swear_events WHERE user_id = $1',
                    [userId]
                );

                // If no swears found, return null
                if (countResult.rows[0].count === '0') {
                    return null;
                }

                // Get most used words
                const wordsResult = await client.query(`
                    SELECT word, COUNT(*) as count
                    FROM (
                        SELECT jsonb_object_keys(words_used) as word
                        FROM swear_events
                        WHERE user_id = $1
                    ) as words
                    GROUP BY word
                    ORDER BY count DESC
                `, [userId]);

                // Get first and last swear
                const firstResult = await client.query(
                    'SELECT timestamp FROM swear_events WHERE user_id = $1 ORDER BY timestamp ASC LIMIT 1',
                    [userId]
                );

                const lastResult = await client.query(
                    'SELECT timestamp FROM swear_events WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1',
                    [userId]
                );

                // Calculate stats
                const totalSwears = parseInt(countResult.rows[0].count);
                const wordCounts = wordsResult.rows.reduce((acc, row) => {
                    acc[row.word] = parseInt(row.count);
                    return acc;
                }, {});

                const topWords = wordsResult.rows.map(row => ({
                    word: row.word,
                    count: parseInt(row.count)
                }));

                const firstSwear = firstResult.rows[0]?.timestamp;
                const lastSwear = lastResult.rows[0]?.timestamp;

                return {
                    userId,
                    totalSwears,
                    wordCounts,
                    topWords,
                    firstSwear,
                    lastSwear
                };
            } finally {
                client.release();
            }
        } catch (err) {
            logger.error(`Error getting user stats for ${userId}`, err);
            return null;
        }
    }

    /**
     * Get recent messages for a specific user
     * @param {string} userId - The Discord user ID
     * @returns {Promise<Array>} Array of recent messages
     */
    async getUserRecentMessages(userId) {
        try {
            // Create a connection from the pool
            const client = await this.pool.connect();

            try {
                // Get recent messages
                const result = await client.query(
                    'SELECT message_content, words_used, timestamp FROM swear_events WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 10',
                    [userId]
                );

                // Format the messages
                return result.rows.map(row => ({
                    content: row.message_content,
                    wordsUsed: row.words_used,
                    timestamp: row.timestamp
                }));
            } finally {
                client.release();
            }
        } catch (err) {
            logger.error(`Error getting recent messages for ${userId}`, err);
            return [];
        }
    }

    /**
     * Get the leaderboard of top swearers
     * @param {number} limit - Number of users to include
     * @returns {Promise<Array>} Sorted array of top users
     */
    async getLeaderboard(limit = 10) {
        try {
            // Create a connection from the pool
            const client = await this.pool.connect();

            try {
                // Get top swearers
                const result = await client.query(`
                    SELECT user_id, username, COUNT(*) as swear_count
                    FROM swear_events
                    GROUP BY user_id, username
                    ORDER BY swear_count DESC
                    LIMIT $1
                `, [limit]);

                // Format the leaderboard
                return result.rows.map(row => ({
                    userId: row.user_id,
                    username: row.username,
                    count: parseInt(row.swear_count)
                }));
            } finally {
                client.release();
            }
        } catch (err) {
            logger.error('Error getting leaderboard', err);
            return [];
        }
    }

    /**
     * Get overall statistics
     * @returns {Promise<Object>} Object containing overall stats
     */
    async getOverallStats() {
        try {
            // Create a connection from the pool
            const client = await this.pool.connect();

            try {
                // Get total swear count
                const countResult = await client.query('SELECT COUNT(*) as count FROM swear_events');

                // Get unique user count
                const userResult = await client.query('SELECT COUNT(DISTINCT user_id) as count FROM swear_events');

                // Get top swear words
                const wordsResult = await client.query(`
                    SELECT word, COUNT(*) as count
                    FROM (
                        SELECT jsonb_object_keys(words_used) as word
                        FROM swear_events
                    ) as words
                    GROUP BY word
                    ORDER BY count DESC
                    LIMIT 10
                `);

                // Get counts by hour
                const hourResult = await client.query(`
                    SELECT EXTRACT(HOUR FROM timestamp) as hour, COUNT(*) as count
                    FROM swear_events
                    GROUP BY hour
                    ORDER BY hour
                `);

                // Calculate stats
                const totalSwears = parseInt(countResult.rows[0].count);
                const uniqueUsers = parseInt(userResult.rows[0].count);

                const topWords = wordsResult.rows.map(row => ({
                    word: row.word,
                    count: parseInt(row.count)
                }));

                const hourlyBreakdown = {};
                hourResult.rows.forEach(row => {
                    hourlyBreakdown[parseInt(row.hour)] = parseInt(row.count);
                });

                return {
                    totalSwears,
                    uniqueUsers,
                    topWords,
                    hourlyBreakdown
                };
            } finally {
                client.release();
            }
        } catch (err) {
            logger.error('Error getting overall stats', err);
            return {
                totalSwears: 0,
                uniqueUsers: 0,
                topWords: [],
                hourlyBreakdown: {}
            };
        }
    }

    /**
     * Get the top users for a specific swear word
     * @param {string} word - The swear word to check
     * @param {number} limit - Number of users to include
     * @returns {Promise<Array>} Array of tuples (user_id, username, count)
     */
    async getWordTopUsers(word, limit = 5) {
        try {
            // Create a connection from the pool
            const client = await this.pool.connect();

            try {
                // Get top users for this word
                const result = await client.query(`
                    SELECT user_id, username, SUM(CAST(words_used->>$1 AS INTEGER)) as word_count
                    FROM swear_events
                    WHERE words_used ? $1
                    GROUP BY user_id, username
                    ORDER BY word_count DESC
                    LIMIT $2
                `, [word, limit]);

                // Format the results
                return result.rows.map(row => ({
                    userId: row.user_id,
                    username: row.username,
                    count: parseInt(row.word_count)
                }));
            } finally {
                client.release();
            }
        } catch (err) {
            logger.error(`Error getting top users for word "${word}"`, err);
            return [];
        }
    }

    /**
     * Reset swear counts for a specific user
     * @param {string} userId - The Discord user ID
     * @returns {Promise<boolean>} Success status
     */
    async resetUser(userId) {
        try {
            // Create a connection from the pool
            const client = await this.pool.connect();

            try {
                // Delete all swear events for this user
                await client.query('DELETE FROM swear_events WHERE user_id = $1', [userId]);

                logger.info(`Reset swear counts for user ${userId}`);
                return true;
            } finally {
                client.release();
            }
        } catch (err) {
            logger.error(`Error resetting user ${userId}`, err);
            return false;
        }
    }

    /**
     * Enable or disable notifications for a channel
     * @param {string} channelId - The Discord channel ID
     * @param {boolean} enabled - Whether to enable or disable notifications
     * @returns {Promise<boolean>} Success status
     */
    async setChannelNotifications(channelId, enabled) {
        try {
            // Create a connection from the pool
            const client = await this.pool.connect();

            try {
                // Update the channel notifications
                await client.query(
                    'INSERT INTO notification_channels (channel_id, enabled) VALUES ($1, $2) ON CONFLICT (channel_id) DO UPDATE SET enabled = $2',
                    [channelId, enabled]
                );

                // Update the local cache
                if (enabled) {
                    this.notificationChannels.add(channelId);
                } else {
                    this.notificationChannels.delete(channelId);
                }

                logger.info(`${enabled ? 'Enabled' : 'Disabled'} notifications for channel ${channelId}`);
                return true;
            } finally {
                client.release();
            }
        } catch (err) {
            logger.error(`Error setting channel notifications for ${channelId}`, err);
            return false;
        }
    }

    /**
     * Check if notifications are enabled for a channel
     * @param {string} channelId - The Discord channel ID
     * @returns {boolean} Whether notifications are enabled
     */
    isChannelNotificationsEnabled(channelId) {
        // Only send notifications to this specific channel
        return channelId === '1361851298378678453';
    }

    /**
     * Add a custom word to the swear list
     * @param {string} word - The word to add
     * @returns {Promise<boolean>} Success status
     */
    async addCustomWord(word) {
        word = word.toLowerCase().trim();

        // Check if word already exists
        if (this.swearWords.has(word)) {
            return false;
        }

        try {
            // Create a connection from the pool
            const client = await this.pool.connect();

            try {
                // Add the word to the database
                await client.query(
                    'INSERT INTO custom_words (word) VALUES ($1) ON CONFLICT (word) DO NOTHING',
                    [word]
                );

                // Add the word to the local cache
                this.swearWords.add(word);
                this.bypassPatterns[word] = this._createBypassPattern(word);

                logger.info(`Added custom word "${word}" to swear list`);
                return true;
            } finally {
                client.release();
            }
        } catch (err) {
            logger.error(`Error adding custom word "${word}"`, err);
            return false;
        }
    }

    /**
     * Remove a word from the swear list
     * @param {string} word - The word to remove
     * @returns {Promise<boolean>} Success status
     */
    async removeCustomWord(word) {
        word = word.toLowerCase().trim();

        // Check if word exists
        if (!this.swearWords.has(word)) {
            return false;
        }

        // Don't allow removing built-in swear words
        if (config.swearWords.includes(word)) {
            return false;
        }

        try {
            // Create a connection from the pool
            const client = await this.pool.connect();

            try {
                // Remove the word from the database
                await client.query('DELETE FROM custom_words WHERE word = $1', [word]);

                // Remove the word from the local cache
                this.swearWords.delete(word);
                delete this.bypassPatterns[word];

                logger.info(`Removed custom word "${word}" from swear list`);
                return true;
            } finally {
                client.release();
            }
        } catch (err) {
            logger.error(`Error removing custom word "${word}"`, err);
            return false;
        }
    }

    /**
     * Clear all swear data from the database
     * @returns {Promise<boolean>} Success status
     */
    async clearAllData() {
        try {
            // Create a connection from the pool
            const client = await this.pool.connect();

            try {
                // Delete all swear events
                await client.query('DELETE FROM swear_events');

                logger.info('Cleared all swear data from the database');
                return true;
            } finally {
                client.release();
            }
        } catch (err) {
            logger.error('Error clearing all data', err);
            return false;
        }
    }
}

module.exports = SwearTracker;