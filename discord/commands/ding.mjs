import {SlashCommandBuilder} from 'discord.js';

/**
 * Command object for the "ding" slash command.
 */
export const command = {
    /**
     * Data for the "ding" command.
     * - Name: ding
     * - Description: Replies with "DONG! 🔔"
     */
    data: new SlashCommandBuilder()
        .setName('ding')
        .setDescription('Replies with DONG! 🔔'),

    /**
     * Executes the "ding" command.
     *
     * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object representing the command execution.
     * @example
     * // User triggers the /ding command in a Discord channel.
     * // The bot replies with "DONG! 🔔".
     */
    async execute(interaction) {
        await interaction.reply('DONG! 🔔');
    },
};
