const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverstats')
        .setDescription('View overall swearing statistics for the server'),
    
    async execute(interaction, swearTracker) {
        try {
            await interaction.deferReply();
            
            // Get overall stats
            const stats = await swearTracker.getOverallStats();
            
            if (!stats || stats.totalSwears === 0) {
                // No data found
                await interaction.editReply('No swearing has been recorded in this server yet. Everyone\'s been so well-behaved! 😇');
                return;
            }
            
            // Create the embed
            const embed = new EmbedBuilder()
                .setTitle('📊 Server Swear Stats')
                .setDescription(`Overall statistics for swearing in ${interaction.guild.name}`)
                .setColor(config.colors.primary)
                .setThumbnail(interaction.guild.iconURL())
                .addFields([
                    {
                        name: '💬 Total Swears',
                        value: `${stats.totalSwears}`,
                        inline: true
                    },
                    {
                        name: '👥 Unique Users',
                        value: `${stats.uniqueUsers}`,
                        inline: true
                    },
                    {
                        name: '📈 Swears Per User',
                        value: `${(stats.totalSwears / stats.uniqueUsers).toFixed(2)}`,
                        inline: true
                    }
                ]);
                
            // Add top words field if there are any
            if (stats.topWords && stats.topWords.length > 0) {
                const topWordsValue = stats.topWords
                    .slice(0, 5) // Top 5 words
                    .map((item, index) => `**${index + 1}.** "${item.word}" (${item.count} times)`)
                    .join('\n');
                
                embed.addFields([{
                    name: '🔍 Most Popular Words',
                    value: topWordsValue
                }]);
            }
            
            // Add hourly breakdown if available
            if (stats.hourlyBreakdown && Object.keys(stats.hourlyBreakdown).length > 0) {
                // Find the peak hour
                let peakHour = 0;
                let peakCount = 0;
                
                Object.entries(stats.hourlyBreakdown).forEach(([hour, count]) => {
                    if (count > peakCount) {
                        peakHour = parseInt(hour);
                        peakCount = count;
                    }
                });
                
                // Format the hour in 12-hour format
                const formattedHour = peakHour % 12 === 0 ? 12 : peakHour % 12;
                const amPm = peakHour < 12 ? 'AM' : 'PM';
                
                embed.addFields([{
                    name: '',
                    value: ``
                }]);
            }
            
            embed.setFooter({ text: `Swear Jar Bot • Use /help for more commands • a makka production` });
            
            // Send the embed
            await interaction.editReply({ embeds: [embed] });
            
            // Log the command usage
            logger.info(`User ${interaction.user.tag} viewed server stats`);
        } catch (error) {
            logger.error('Error executing serverstats command', error);
            
            // Send error message
            try {
                await interaction.editReply('There was an error fetching the server stats. Please try again later.');
            } catch (e) {
                logger.error('Error sending error message', e);
            }
        }
    }
};