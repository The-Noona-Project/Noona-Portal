import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import kavita from '../../kavita/kavita.mjs';

export const command = {
    data: new SlashCommandBuilder()
        .setName('scan')
        .setDescription('Displays libraries and lets you select one to scan.'),

    async execute(interaction) {
        await interaction.deferReply();
        console.log('📡 Fetching libraries from Kavita...');

        const libraries = await kavita.getLibraries();
        if (!libraries || libraries.length === 0) {
            return interaction.editReply('❌ No libraries found.');
        }

        const buttons = libraries.map(lib =>
            new ButtonBuilder()
                .setCustomId(`scan_${lib.id}`)
                .setLabel(lib.name)
                .setStyle(ButtonStyle.Primary)
        );

        const row = new ActionRowBuilder().addComponents(buttons);
        await interaction.editReply({ content: '📚 Select a library to scan:', components: [row] });
    }
};
