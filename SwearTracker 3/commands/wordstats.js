const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wordstats')
        .setDescription('View statistics for a specific swear word')
        .addStringOption(option => 
            option.setName('word')
                .setDescription('The swear word to check')
                .setRequired(true)),
    
    async execute(interaction, swearTracker) {
        try {
            await interaction.deferReply();
            
            // Get the word from options
            const word = interaction.options.getString('word').toLowerCase();
            
            // Get top users for this word
            const topUsers = await swearTracker.getWordTopUsers(word);
            
            if (!topUsers || topUsers.length === 0) {
                // No data found for this word
                await interaction.editReply(`No one has used the word "${word}" yet.`);
                return;
            }
            
            // Create the embed
            const embed = new EmbedBuilder()
                .setTitle(`Word Stats: "${word}"`)
                .setDescription(`Statistics for the word "${word}" in ${interaction.guild.name}`)
                .setColor(config.colors.primary);
                
            // Add top users field
            const totalUses = topUsers.reduce((sum, user) => sum + user.count, 0);
            
            embed.addFields([
                {
                    name: '📊 Total Uses',
                    value: `${totalUses}`,
                    inline: true
                },
                {
                    name: '👥 Unique Users',
                    value: `${topUsers.length}`,
                    inline: true
                }
            ]);
            
            // Add top users list
            const topUsersValue = topUsers
                .map((user, index) => `**${index + 1}.** <@${user.userId}> (${user.count} times)`)
                .join('\n');
                
            embed.addFields([{
                name: '🏆 Top Users',
                value: topUsersValue || 'No data available'
            }]);
            
            embed.setFooter({ text: `Swear Jar Bot • Use /help for more commands` });
            
            // Send the embed
            await interaction.editReply({ embeds: [embed] });
            
            // Log the command usage
            logger.info(`User ${interaction.user.tag} viewed stats for word "${word}"`);
        } catch (error) {
            logger.error(`Error executing wordstats command for word "${interaction.options?.getString('word')}"`, error);
            
            // Send error message
            try {
                await interaction.editReply('There was an error fetching the word stats. Please try again later.');
            } catch (e) {
                logger.error('Error sending error message', e);
            }
        }
    }
};