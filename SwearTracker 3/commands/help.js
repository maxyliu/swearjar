const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows information about available commands'),
    
    async execute(interaction) {
        try {
            // Create the help embed
            const embed = new EmbedBuilder()
                .setTitle('Swear Jar Bot - Help')
                .setDescription('A bot that tracks swear words in your server.')
                .setColor('#4287f5')
                .addFields([
                    {
                        name: '📊 User Stats',
                        value: 
                            '`/stats [user]` - Show swear statistics for yourself or another user\n' +
                            '`/history [user]` - View recent swear messages for a user'
                    },
                    {
                        name: '🏆 Leaderboards',
                        value: 
                            '`/leaderboard [limit]` - View the server\'s swear leaderboard\n' +
                            '`/serverstats` - View overall swearing statistics for the server'
                    },
                    {
                        name: '🔍 Word Stats',
                        value: 
                            '`/wordstats [word]` - View statistics for a specific swear word'
                    },
                    {
                        name: '🎲 Fun',
                        value: 
                            '`/swearfact` - Get a random fact about swearing'
                    },
                    {
                        name: '⚙️ Admin Commands',
                        value: 
                            '`/resetuser [user]` - Reset a user\'s swear count\n' +
                            '`/togglenotify [enabled]` - Toggle swear notifications in the current channel\n' +
                            '`/addword [word]` - Add a new word to the swear list\n' +
                            '`/removeword [word]` - Remove a word from the swear list\n' +
                            '`/cleardata` - Clear all swear data (CAUTION: cannot be undone)'
                    }
                ])
                .setFooter({ text: 'Swear Jar Bot • Discord Language Analytics' });
            
            // Send the embed
            await interaction.reply({ embeds: [embed] });
            
            // Log the command usage
            logger.info(`User ${interaction.user.tag} used help command`);
        } catch (error) {
            logger.error('Error executing help command', error);
            
            // Send error message
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
                }
            } catch (e) {
                logger.error('Error sending error message', e);
            }
        }
    }
};