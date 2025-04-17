const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the top swearers in the server')
        .addIntegerOption(option => 
            option.setName('limit')
                .setDescription('Number of users to show (default: 10)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25)),
    
    async execute(interaction, swearTracker) {
        try {
            await interaction.deferReply();
            
            // Get the limit parameter (default to 10)
            const limit = interaction.options.getInteger('limit') || 10;
            
            // Get the leaderboard data
            const leaderboard = await swearTracker.getLeaderboard(limit);
            
            if (!leaderboard || leaderboard.length === 0) {
                // No data found
                await interaction.editReply('No swearing has been recorded in this server yet. Everyone\'s been so well-behaved! 😇');
                return;
            }
            
            // Create the leaderboard embed
            const embed = new EmbedBuilder()
                .setTitle('🏆 Swear Word Leaderboard')
                .setDescription(`The top ${leaderboard.length} swearers in the server`)
                .setColor('#4287f5');
            
            // Add leaderboard entries
            const medals = ['🥇', '🥈', '🥉'];
            const leaderboardText = leaderboard.map((entry, index) => {
                const prefix = index < 3 ? medals[index] : `${index + 1}.`;
                return `${prefix} <@${entry.userId}>: **${entry.count}** swears`;
            }).join('\n');
            
            embed.addFields([{
                name: 'Rankings',
                value: leaderboardText
            }]);
            
            embed.setFooter({ text: `Swear Jar Bot • Use /help for more commands` });
            
            // Send the embed
            await interaction.editReply({ embeds: [embed] });
            
            // Log the command usage
            logger.info(`User ${interaction.user.tag} viewed the leaderboard (limit: ${limit})`);
        } catch (error) {
            logger.error('Error executing leaderboard command', error);
            
            // Send error message
            try {
                await interaction.editReply('There was an error fetching the leaderboard. Please try again later.');
            } catch (e) {
                logger.error('Error sending error message', e);
            }
        }
    }
};