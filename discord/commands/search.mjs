import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import kavita from '../../kavita/kavita.mjs';

/**
 * Slash command for searching manga/comics in Kavita.
 */
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
     * Executes the search command.
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     */
    async execute(interaction) {
        await interaction.deferReply();
        const searchTerm = interaction.options.getString('title');
        console.log(`🔍 Searching Kavita for: ${searchTerm}`);

        try {
            const results = await kavita.searchSeries(searchTerm);

            if (!results?.series?.length) {
                return interaction.editReply(`❌ No results found for **${searchTerm}**.`);
            }

            const embed = new EmbedBuilder()
                .setTitle(`🔍 Results for "${searchTerm}"`)
                .setColor(0x0099FF)
                .setDescription(`Showing top ${Math.min(10, results.series.length)} result(s):`);

            results.series.slice(0, 10).forEach((series, index) => {
                const title = series.name || 'Unknown Title';
                const id = series.seriesId ?? '???';
                const library = series.libraryName || 'Unknown Library';

                embed.addFields({
                    name: `${index + 1}. ${title} (ID: ${id})`,
                    value: `Library: ${library}`
                });
            });

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error(`❌ Error during search:`, err);
            await interaction.editReply('❌ An error occurred while searching. Please try again later.');
        }
    }
};

export default command;
