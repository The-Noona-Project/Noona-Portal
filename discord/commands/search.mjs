import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import kavita from '../../kavita/kavita.mjs';

export const command = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for manga/comics in Kavita')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Title to search for')
                .setRequired(true)
        ),

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
        
        await interaction.editReply({ embeds: [embed] });
    }
}; 