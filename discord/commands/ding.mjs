/**
 * @fileoverview
 * Simple Ping Command
 *
 * Responds with a fun "DONG! 🔔" when a user invokes /ding.
 * Used for testing bot responsiveness.
 *
 * @module commands/ding
 */

import { SlashCommandBuilder } from 'discord.js';
import { printDebug } from '../../noona/logger/logUtils.mjs';

const command = {
    data: new SlashCommandBuilder()
        .setName('ding')
        .setDescription('Replies with DONG! 🔔'),

    /**
     * Executes the /ding command.
     *
     * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction context of the command.
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        printDebug(`[Ding] /ding triggered by ${interaction.user.tag}`);
        await interaction.reply('DONG! 🔔');
    }
};

export default command;
