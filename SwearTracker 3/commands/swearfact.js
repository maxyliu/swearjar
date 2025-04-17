const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('swearfact')
        .setDescription('Get a random fun fact about swearing'),
    
    async execute(interaction) {
        try {
            // Get a random fact from the config
            const facts = config.swearFacts;
            const randomFact = facts[Math.floor(Math.random() * facts.length)];
            
            // Create the embed
            const embed = new EmbedBuilder()
                .setTitle('💡 Swear Word Fact')
                .setDescription(randomFact)
                .setColor(config.colors.primary)
                .setFooter({ text: 'Swear Jar Bot • a makka production • Use /help for more commands' });
                
            // Send the embed
            await interaction.reply({ embeds: [embed] });
            
            // Log the command usage
            logger.info(`User ${interaction.user.tag} requested a swear fact`);
        } catch (error) {
            logger.error('Error executing swearfact command', error);
            
            // Send error message
            try {
                await interaction.reply({ content: 'There was an error getting a swear fact. Please try again later.', ephemeral: true });
            } catch (e) {
                logger.error('Error sending error message', e);
            }
        }
    }
};