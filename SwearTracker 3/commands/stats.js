const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View swear word statistics for a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('User to check stats for (defaults to yourself)')
                .setRequired(false)),
    
    async execute(interaction, swearTracker) {
        try {
            await interaction.deferReply();
            
            // Get the target user (defaults to the command user)
            const targetUser = interaction.options.getUser('user') || interaction.user;
            
            // Get user stats from the tracker
            const stats = await swearTracker.getUserStats(targetUser.id);
            
            if (!stats || stats.totalSwears === 0) {
                // No stats found
                await interaction.editReply(`${targetUser.id === interaction.user.id ? 'You have' : `${targetUser.username} has`} not used any swear words yet. What an angel! 😇`);
                return;
            }
            
            // Build the embed
            const embed = new EmbedBuilder()
                .setTitle(`Swear Stats for ${targetUser.username}`)
                .setColor('#4287f5')
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields([
                    {
                        name: '💬 Total Swears',
                        value: `${stats.totalSwears}`,
                        inline: true
                    },
                    {
                        name: '📅 First Recorded',
                        value: stats.firstSwear ? `<t:${Math.floor(new Date(stats.firstSwear).getTime() / 1000)}:R>` : 'Unknown',
                        inline: true
                    },
                    {
                        name: '⏱️ Last Recorded',
                        value: stats.lastSwear ? `<t:${Math.floor(new Date(stats.lastSwear).getTime() / 1000)}:R>` : 'Unknown',
                        inline: true
                    }
                ]);
            
            // Add top words field if there are any
            if (stats.topWords && stats.topWords.length > 0) {
                const topWordsValue = stats.topWords
                    .slice(0, 5) // Get top 5
                    .map((item, index) => `**${index + 1}.** "${item.word}" (${item.count} times)`)
                    .join('\n');
                
                embed.addFields([{
                    name: '🔍 Most Used Words',
                    value: topWordsValue
                }]);
            }
            
            embed.setFooter({ text: `Swear Jar Bot • Use /help for more commands` });
            
            // Send the embed
            await interaction.editReply({ embeds: [embed] });
            
            // Log the command usage
            logger.info(`User ${interaction.user.tag} checked stats for ${targetUser.tag}`);
        } catch (error) {
            logger.error('Error executing stats command', error);
            
            // Send error message
            try {
                await interaction.editReply('There was an error fetching the stats. Please try again later.');
            } catch (e) {
                logger.error('Error sending error message', e);
            }
        }
    }
};