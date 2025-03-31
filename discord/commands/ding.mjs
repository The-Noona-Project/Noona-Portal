// /discord/commands/ding.mjs — Simple Ping Test

import { SlashCommandBuilder } from 'discord.js';

const command = {
    data: new SlashCommandBuilder()
        .setName('ding')
        .setDescription('Replies with DONG! 🔔'),

    async execute(interaction) {
        await interaction.reply('DONG! 🔔');
    }
};

export default command;
