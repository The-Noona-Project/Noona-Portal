import {SlashCommandBuilder, EmbedBuilder} from 'discord.js';
import kavita from '../../kavita/kavita.mjs';

/**
 * Command for searching manga/comics in Kavita.
 *
 * @type {Object}
 * @property {SlashCommandBuilder} data - The data describing the slash command.
 * @property {Function} execute - The function executed when the command is called.
 * @example
 * // Using the command in Discord
 * /search title:One Piece
 */
export const command = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for manga/comics in Kavita')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Title to search for')
                .setRequired(true)
        ),

    /**
     * Executes the "search" command.
     *
     * @param {import('discord.js').CommandInteraction} interaction - The interaction object from Discord.
     * @returns {Promise<void>} A promise that resolves when the interaction is processed.
     * @example
     * // Interaction example
     * await command.execute(interaction);
     */
    async execute(interaction) {
        await interaction.deferReply();
        const searchTerm = interaction.options.getString('title');

        const results = await kavita.searchSeries(searchTerm);

        if (!results || !results.series || results.series.length === 0) {
            return interaction.editReply(`No results found for "${searchTerm}".`);
        }

        const embed = new EmbedBuilder()
            .setTitle(`Search Results for "${searchTerm}"`)
            .setColor(0x0099FF);

        results.series.slice(0, 10).forEach((series, index) => {
            embed.addFields({
                name: `${index + 1}. ${series.name || 'Unknown'} (ID: ${series.seriesId})`,
                value: `Library: ${series.libraryName || 'Unknown'}`
            });
        });

        await interaction.editReply({embeds: [embed]});
    }
}; 