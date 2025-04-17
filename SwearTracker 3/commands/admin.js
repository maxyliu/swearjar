const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config');

// Commands to manage the bot and swear tracking
module.exports = {
    data: [
        // Reset user command
        new SlashCommandBuilder()
            .setName('resetuser')
            .setDescription('Admin: Reset a user\'s swear count')
            .addUserOption(option => 
                option.setName('user')
                    .setDescription('User to reset')
                    .setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            
        // Toggle notifications command
        new SlashCommandBuilder()
            .setName('togglenotify')
            .setDescription('Admin: Toggle swear word notifications in the current channel')
            .addBooleanOption(option => 
                option.setName('enabled')
                    .setDescription('Whether to enable notifications (true) or disable them (false)')
                    .setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            
        // Add word command
        new SlashCommandBuilder()
            .setName('addword')
            .setDescription('Admin: Add a new word to the swear list')
            .addStringOption(option => 
                option.setName('word')
                    .setDescription('The word to add to the swear list')
                    .setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            
        // Remove word command
        new SlashCommandBuilder()
            .setName('removeword')
            .setDescription('Admin: Remove a word from the swear list')
            .addStringOption(option => 
                option.setName('word')
                    .setDescription('The word to remove from the swear list')
                    .setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            
        // Clear data command
        new SlashCommandBuilder()
            .setName('cleardata')
            .setDescription('Admin: Clear all swear data')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ],
    
    async execute(interaction, swearTracker, commandName) {
        try {
            // Check if the user has admin permissions
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                await interaction.reply({ 
                    content: "⚠️ You don't have permission to use this command. Only administrators can use it.",
                    ephemeral: true 
                });
                return;
            }
            
            // Execute the appropriate command
            switch (commandName) {
                case 'resetuser':
                    await this.handleResetUser(interaction, swearTracker);
                    break;
                case 'togglenotify':
                    await this.handleToggleNotify(interaction, swearTracker);
                    break;
                case 'addword':
                    await this.handleAddWord(interaction, swearTracker);
                    break;
                case 'removeword':
                    await this.handleRemoveWord(interaction, swearTracker);
                    break;
                case 'cleardata':
                    await this.handleClearData(interaction, swearTracker);
                    break;
                default:
                    await interaction.reply({ 
                        content: "Unknown admin command.",
                        ephemeral: true 
                    });
            }
        } catch (error) {
            logger.error(`Error executing admin command '${commandName}'`, error);
            
            // Send error message
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ 
                        content: 'There was an error executing this command!',
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: 'There was an error executing this command!',
                        ephemeral: true 
                    });
                }
            } catch (e) {
                logger.error('Error sending error message', e);
            }
        }
    },
    
    // Handler for /resetuser command
    async handleResetUser(interaction, swearTracker) {
        await interaction.deferReply({ ephemeral: true });
        
        // Get the target user
        const user = interaction.options.getUser('user');
        
        if (!user) {
            await interaction.editReply("⚠️ User not found.");
            return;
        }
        
        // Reset the user's data
        const result = await swearTracker.resetUser(user.id);
        
        if (result) {
            // Send confirmation
            const embed = new EmbedBuilder()
                .setTitle("User Reset")
                .setDescription(`✅ Successfully reset swear count for ${user.username}.`)
                .setColor(config.colors.success);
                
            await interaction.editReply({ embeds: [embed] });
            
            // Log the action
            logger.info(`Admin ${interaction.user.tag} reset swear count for ${user.tag}`);
        } else {
            await interaction.editReply("❌ Failed to reset the user. Please try again later.");
        }
    },
    
    // Handler for /togglenotify command
    async handleToggleNotify(interaction, swearTracker) {
        await interaction.deferReply({ ephemeral: true });
        
        // Get the enabled parameter
        const enabled = interaction.options.getBoolean('enabled');
        
        // Update the channel notifications
        const result = await swearTracker.setChannelNotifications(interaction.channelId, enabled);
        
        if (result) {
            // Send confirmation
            const embed = new EmbedBuilder()
                .setTitle("Notifications Updated")
                .setDescription(`✅ Swear word notifications are now ${enabled ? 'enabled' : 'disabled'} in this channel.`)
                .setColor(config.colors.success);
                
            await interaction.editReply({ embeds: [embed] });
            
            // Log the action
            logger.info(`Admin ${interaction.user.tag} ${enabled ? 'enabled' : 'disabled'} notifications in channel ${interaction.channelId}`);
        } else {
            await interaction.editReply("❌ Failed to update notifications. Please try again later.");
        }
    },
    
    // Handler for /addword command
    async handleAddWord(interaction, swearTracker) {
        await interaction.deferReply({ ephemeral: true });
        
        // Get the word parameter
        const word = interaction.options.getString('word')?.toLowerCase().trim();
        
        if (!word) {
            await interaction.editReply("⚠️ Please provide a valid word to add.");
            return;
        }
        
        // Validate the word (basic checks)
        if (word.length < 2 || word.length > 20) {
            await interaction.editReply("⚠️ The word must be between 2 and 20 characters long.");
            return;
        }
        
        // Add the word to the swear list
        const result = await swearTracker.addCustomWord(word);
        
        if (result) {
            // Send confirmation
            const embed = new EmbedBuilder()
                .setTitle("Word Added")
                .setDescription(`✅ Successfully added '${word}' to the swear list.`)
                .setColor(config.colors.success);
                
            await interaction.editReply({ embeds: [embed] });
            
            // Log the action
            logger.info(`Admin ${interaction.user.tag} added word '${word}' to the swear list`);
        } else {
            await interaction.editReply("❌ Failed to add the word. It may already be in the list.");
        }
    },
    
    // Handler for /removeword command
    async handleRemoveWord(interaction, swearTracker) {
        await interaction.deferReply({ ephemeral: true });
        
        // Get the word parameter
        const word = interaction.options.getString('word')?.toLowerCase().trim();
        
        if (!word) {
            await interaction.editReply("⚠️ Please provide a valid word to remove.");
            return;
        }
        
        // Remove the word from the swear list
        const result = await swearTracker.removeCustomWord(word);
        
        if (result) {
            // Send confirmation
            const embed = new EmbedBuilder()
                .setTitle("Word Removed")
                .setDescription(`✅ Successfully removed '${word}' from the swear list.`)
                .setColor(config.colors.success);
                
            await interaction.editReply({ embeds: [embed] });
            
            // Log the action
            logger.info(`Admin ${interaction.user.tag} removed word '${word}' from the swear list`);
        } else {
            await interaction.editReply("❌ Failed to remove the word. It may be a built-in word or not in the list.");
        }
    },
    
    // Handler for /cleardata command
    async handleClearData(interaction, swearTracker) {
        // Create a confirmation button view
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_clear')
                    .setLabel('Confirm Clear')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_clear')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        // Send confirmation message
        const embed = new EmbedBuilder()
            .setTitle("⚠️ Confirm Data Deletion")
            .setDescription("Are you sure you want to clear ALL swear data?\n\nThis will delete **all** swear counts, message history, and statistics for **all users**. This action cannot be undone.")
            .setColor(config.colors.warning);
            
        const response = await interaction.reply({ 
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
        
        // Create a collector for the buttons
        const collector = response.createMessageComponentCollector({ 
            filter: i => i.user.id === interaction.user.id,
            time: 30000 // 30 seconds
        });
        
        collector.on('collect', async i => {
            if (i.customId === 'confirm_clear') {
                // User confirmed, clear the data
                await i.update({ 
                    components: [] // Remove the buttons
                });
                
                try {
                    // Clear all data
                    const result = await swearTracker.clearAllData();
                    
                    if (result) {
                        // Send confirmation
                        const successEmbed = new EmbedBuilder()
                            .setTitle("Data Cleared")
                            .setDescription("✅ Successfully cleared all swear data from the database.")
                            .setColor(config.colors.success);
                            
                        await i.editReply({ embeds: [successEmbed] });
                        
                        // Log the action
                        logger.info(`Admin ${interaction.user.tag} cleared all swear data`);
                    } else {
                        const errorEmbed = new EmbedBuilder()
                            .setTitle("Error")
                            .setDescription("❌ There was an error clearing the data. Please try again later.")
                            .setColor(config.colors.error);
                            
                        await i.editReply({ embeds: [errorEmbed] });
                    }
                } catch (error) {
                    logger.error('Error clearing data', error);
                    
                    const errorEmbed = new EmbedBuilder()
                        .setTitle("Error")
                        .setDescription("❌ There was an error clearing the data. Please try again later.")
                        .setColor(config.colors.error);
                        
                    await i.editReply({ embeds: [errorEmbed] });
                }
            } else if (i.customId === 'cancel_clear') {
                // User cancelled
                const cancelEmbed = new EmbedBuilder()
                    .setTitle("Cancelled")
                    .setDescription("✅ Data deletion cancelled. No changes were made.")
                    .setColor(config.colors.success);
                    
                await i.update({ 
                    embeds: [cancelEmbed],
                    components: [] // Remove the buttons
                });
            }
            
            // End the collector
            collector.stop();
        });
        
        collector.on('end', async collected => {
            // If nothing was collected (timeout), remove the buttons
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle("Timed Out")
                    .setDescription("⏱️ Confirmation timed out. No changes were made.")
                    .setColor(config.colors.warning);
                    
                await interaction.editReply({ 
                    embeds: [timeoutEmbed],
                    components: [] // Remove the buttons
                }).catch(error => {
                    logger.error('Error editing reply after timeout', error);
                });
            }
        });
    }
};