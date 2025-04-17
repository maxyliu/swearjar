// Import required modules
const fs = require('fs');
const path = require('path');
const { Client, Collection, Events, GatewayIntentBits, REST, Routes } = require('discord.js');
const SwearTracker = require('./utils/swearTracker');
const logger = require('./utils/logger');
const config = require('./config');

// Create a new client instance with specified intents
const client = new Client({
    intents: config.intents.map(intent => GatewayIntentBits[intent])
});

// Initialize the swear tracker
const swearTracker = new SwearTracker();

// Create a commands collection
client.commands = new Collection();

// Create a command registry for slash commands
const commands = [];

// Load command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    // Handle both single and multiple command definitions
    if (Array.isArray(command.data)) {
        // Multiple commands in one file (like admin.js)
        command.data.forEach(cmd => {
            commands.push(cmd.toJSON());
            client.commands.set(cmd.name, command);
        });
    } else if ('data' in command && 'execute' in command) {
        // Single command
        commands.push(command.data.toJSON());
        client.commands.set(command.data.name, command);
    } else {
        logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Handle interaction create events
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    const command = client.commands.get(interaction.commandName);
    
    if (!command) {
        logger.warn(`No command matching ${interaction.commandName} was found.`);
        return;
    }
    
    try {
        // For admin.js which has multiple commands but one execute handler
        if (Array.isArray(command.data)) {
            await command.execute(interaction, swearTracker, interaction.commandName);
        } else {
            await command.execute(interaction, swearTracker);
        }
    } catch (error) {
        logger.error(`Error executing command ${interaction.commandName}:`, error);
        
        const replyContent = { 
            content: 'There was an error while executing this command!',
            ephemeral: true
        };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(replyContent);
        } else {
            await interaction.reply(replyContent);
        }
    }
});

// Handle message create events for tracking swear words
client.on(Events.MessageCreate, async message => {
    // Ignore messages from bots
    if (message.author.bot) return;
    
    // Debug: Log the message received for debugging
    logger.info(`Received message from ${message.author.username} in #${message.channel.name}: "${message.content}"`);
    
    // Check bot permissions in this channel
    const botMember = message.guild.members.cache.get(client.user.id);
    const hasPermission = message.channel.permissionsFor(botMember).has('SendMessages');
    logger.info(`Bot has SendMessages permission in #${message.channel.name}: ${hasPermission}`);
    
    // Track swear words
    const swearCount = await swearTracker.processMessage(
        message.author.id,
        message.author.username,
        message.content
    );
    
    // Log swear count for debugging
    logger.info(`Swear count for message: ${swearCount}, Notifications enabled: ${swearTracker.isChannelNotificationsEnabled('1361851298378678453')}`);
    
    // If swear words were found, send a notification message to the designated channel
    if (swearCount > 0) {
        // Choose a random response message
        const responses = swearCount === 1 
            ? config.swearResponses.single 
            : config.swearResponses.multiple;
            
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        logger.info(`Selected response: "${randomResponse}"`);
        
        // Replace placeholders
        const formattedResponse = randomResponse
            .replace('{username}', message.author.toString())
            .replace('{count}', swearCount.toString());
            
        // Get the designated log channel (specific channel ID for swear notifications)
        const logChannelId = '1361851298378678453';
        
        // Find the guild that has this specific channel
        let targetChannel = null;
        for (const guild of client.guilds.cache.values()) {
            const foundChannel = guild.channels.cache.get(logChannelId);
            if (foundChannel) {
                targetChannel = foundChannel;
                break;
            }
        }
        
        // Send the notification
        logger.info(`Attempting to send notification to designated channel (ID: ${logChannelId}): "${formattedResponse}"`);
        
        try {
            if (targetChannel) {
                // Format the message with channel and server info for context
                await targetChannel.send(
                    `**Server:** ${message.guild.name}\n` +
                    `**Channel:** <#${message.channel.id}>\n` +
                    `**Message Content:** "${message.content}"\n` +
                    `**Alert:** ${formattedResponse}`
                );
                logger.info(`Successfully sent notification to designated channel`);
            } else {
                // Only log the error if target channel not found
                logger.error(`Could not find designated notification channel (ID: ${logChannelId})`);
            }
        } catch (error) {
            logger.error(`Error sending notification message:`, error);
        }
            
        // Log the detection
        logger.info(`💬 SWEAR DETECTED: User ${message.author.username} used ${swearCount} swear word(s) in #${message.channel.name}`);
        
        // Get user stats for logging
        const stats = await swearTracker.getUserStats(message.author.id);
        if (stats) {
            const topWords = Object.keys(stats.wordCounts).join(', ');
            logger.info(`📊 Total count for ${message.author.username}: ${stats.totalSwears} | Words used: ${topWords}`);
        }
        
        // Log the message content
        logger.info(`🔍 Message content: "${message.content}"`);
        logger.info('⎯'.repeat(50));
    }
});

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, async () => {
    logger.info(`Logged in as ${client.user.tag}`);
    
    // Initialize the database
    await swearTracker.initializeDatabase();
    
    // Register slash commands
    const rest = new REST().setToken(config.token);
    
    try {
        logger.info('Started refreshing application (/) commands.');
        
        const data = await rest.put(
            Routes.applicationCommands(config.applicationId),
            { body: commands },
        );
        
        logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
        
        // Log server count
        logger.info(`Bot is in ${client.guilds.cache.size} guilds`);
    } catch (error) {
        logger.error('Error refreshing application commands:', error);
    }
});

// Handle errors
client.on(Events.Error, error => {
    logger.error('Discord client error:', error);
});

// Handle rejections
process.on('unhandledRejection', error => {
    logger.error('Unhandled promise rejection:', error);
});

// Login to Discord
logger.info(`Starting bot with token starting with: ${config.token.substring(0, 5)}...`);
client.login(config.token).catch(error => {
    logger.error('Failed to login to Discord:', error);
    process.exit(1);
});