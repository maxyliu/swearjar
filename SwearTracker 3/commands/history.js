const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('View recent swear messages for a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('User to check history for (defaults to yourself)')
                .setRequired(false)),
    
    async execute(interaction, swearTracker) {
        try {
            await interaction.deferReply();
            
            // Get the target user (defaults to the command user)
            const targetUser = interaction.options.getUser('user') || interaction.user;
            
            // Get recent messages
            const messages = await swearTracker.getUserRecentMessages(targetUser.id);
            
            if (!messages || messages.length === 0) {
                // No messages found
                await interaction.editReply(`${targetUser.id === interaction.user.id ? 'You have' : `${targetUser.username} has`} not used any swear words yet. What an angel! 😇`);
                return;
            }
            
            // Create the embed
            const embed = new EmbedBuilder()
                .setTitle(`Recent Swear Messages: ${targetUser.username}`)
                .setColor(config.colors.primary)
                .setThumbnail(targetUser.displayAvatarURL());
                
            // Create description with the recent messages
            const messagesText = messages
                .map((msg, index) => {
                    const date = new Date(msg.timestamp);
                    const timestamp = `<t:${Math.floor(date.getTime() / 1000)}:R>`;
                    
                    // Get the words used
                    const wordsUsed = Object.keys(msg.wordsUsed).join(', ');
                    
                    return `**${index + 1}.** ${timestamp}\n\`\`\`${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}\`\`\`Words: ${wordsUsed}`;
                })
                .join('\n\n');
                
            embed.setDescription(messagesText);
            embed.setFooter({ text: `Swear Jar Bot • Showing ${messages.length} most recent messages` });
            
            // Send the embed
            await interaction.editReply({ embeds: [embed] });
            
            // Log the command usage
            logger.info(`User ${interaction.user.tag} checked history for ${targetUser.tag}`);
        } catch (error) {
            logger.error('Error executing history command', error);
            
            // Send error message
            try {
                await interaction.editReply('There was an error fetching the message history. Please try again later.');
            } catch (e) {
                logger.error('Error sending error message', e);
            }
        }
    }
};