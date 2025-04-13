/**
 * @fileoverview
 * Search Command — `/search`
 *
 * Searches for manga/comics in Kavita and returns an embed with the top results.
 *
 * @module commands/search
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import kavita from '../../kavita/initKavita.mjs';
import { printDebug, printError } from '../../noona/logger/logUtils.mjs';

const command = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for manga/comics in Kavita')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Title to search for')
                .setRequired(true)
        ),

    /**
     * Executes the /search command.
     *
     * @param {import('discord.js').ChatInputCommandInteraction} interaction - The Discord interaction object.
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        await interaction.deferReply();

        const searchTerm = interaction.options.getString('title');
        printDebug(`[Search] ${interaction.user.tag} searching for "${searchTerm}"`);

        try {
            const results = await kavita.searchSeries(searchTerm);

            if (!results?.series?.length) {
                return interaction.editReply(`❌ No results found for **${searchTerm}**.`);
            }

            const embed = new EmbedBuilder()
                .setTitle(`🔍 Results for "${searchTerm}"`)
                .setColor(0x0099FF)
                .setDescription(`Showing top ${Math.min(10, results.series.length)} result(s):`)
                .setTimestamp();

            results.series.slice(0, 10).forEach((series, index) => {
                const title = series.name || 'Unknown Title';
                const id = series.seriesId ?? '???';
                const library = series.libraryName || 'Unknown Library';

                embed.addFields({
                    name: `${index + 1}. ${title} (ID: ${id})`,
                    value: `📚 Library: ${library}`
                });
            });

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            printError(`❌ Error during search:`, err);
            await interaction.editReply('❌ An error occurred while searching. Please try again later.');
        }
    }
};

export default command;
