import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
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

        const rows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            const row = new ActionRowBuilder()
                .addComponents(buttons.slice(i, i + 5));
            rows.push(row);
        }

        await interaction.editReply({ 
            content: '📚 Select a library to scan:', 
            components: rows 
        });
    }
};

export async function handleScanButton(interaction) {
    await interaction.deferUpdate();
    
    console.log('📡 Fetching libraries from Kavita...');
    
    const libraries = await kavita.getLibraries();
    if (!libraries || libraries.length === 0) {
        return interaction.editReply({
            content: '❌ No libraries found.',
            components: []
        });
    }
    
    const buttons = libraries.map(lib =>
        new ButtonBuilder()
            .setCustomId(`scan_${lib.id}`)
            .setLabel(lib.name)
            .setStyle(ButtonStyle.Primary)
    );
    
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        const row = new ActionRowBuilder()
            .addComponents(buttons.slice(i, i + 5));
        rows.push(row);
    }
    
    await interaction.editReply({ 
        content: '📚 Select a library to scan:',
        embeds: [],
        components: rows 
    });
}

export async function handleLibrarySelection(interaction, libraryId) {
    await interaction.deferUpdate();
    
    const library = (await kavita.getLibraries()).find(lib => lib.id.toString() === libraryId);
    if (!library) {
        return interaction.editReply({
            content: '❌ Library not found.',
            components: []
        });
    }
    
    try {
        await kavita.scanLibrary(libraryId);
        console.log(`✅ Scan initiated for library: ${library.name}`);
    } catch (error) {
        console.error(`❌ Failed to scan library: ${error.message}`);
    }
    
    const series = await kavita.getSeriesByLibrary(libraryId);
    
    if (!series || !Array.isArray(series) || series.length === 0) {
        const scanRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('scan')
                    .setLabel('Back to Libraries')
                    .setStyle(ButtonStyle.Danger)
            );
            
        return interaction.editReply({
            content: `📚 Library "${library.name}" has no series or there was an issue with the API.`,
            components: [scanRow]
        });
    }
    
    await handleSeriesPage(interaction, libraryId, 0, true);
}

export async function handleSeriesPage(interaction, libraryId, pageNumber, alreadyDeferred = false) {
    if (!alreadyDeferred) {
        await interaction.deferUpdate();
    }
    
    const library = (await kavita.getLibraries()).find(lib => lib.id.toString() === libraryId);
    if (!library) {
        return interaction.editReply({
            content: '❌ Library not found.',
            components: []
        });
    }
    
    const series = await kavita.getSeriesByLibrary(libraryId);
    
    if (!series || series.length === 0) {
        const scanRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('scan')
                    .setLabel('Back to Libraries')
                    .setStyle(ButtonStyle.Danger)
            );
            
        return interaction.editReply({
            content: `📚 Library "${library.name}" has no series.`,
            components: [scanRow]
        });
    }
    
    const pageSize = 10;
    const totalPages = Math.ceil(series.length / pageSize);
    const startIdx = pageNumber * pageSize;
    const endIdx = Math.min(startIdx + pageSize, series.length);
    const currentPageSeries = series.slice(startIdx, endIdx);
    
    const embed = new EmbedBuilder()
        .setTitle(`Series in ${library.name} (Page ${pageNumber + 1}/${totalPages})`)
        .setColor(0x0099FF)
        .setDescription(`Displaying ${startIdx + 1}-${endIdx} of ${series.length} series.`);
        
    currentPageSeries.forEach((s, i) => {
        const createdDate = s.created ? new Date(s.created).toLocaleDateString() : 'Unknown';
        const readingTime = s.avgHoursToRead ? Math.abs(s.avgHoursToRead).toFixed(1) : '?';
        
        let details = '';
        
        if (s.pages) {
            details += `📄 ${s.pages} pages\n`;
        }
        
        if (s.format !== undefined) {
            details += `📚 Format: ${formatType(s.format)}\n`;
        }
        
        if (s.avgHoursToRead) {
            details += `⏱️ Est. reading time: ${readingTime} hours\n`;
        }
        
        details += `📅 Added: ${createdDate}`;
        
        embed.addFields({
            name: `${startIdx + i + 1}. ${s.name}`,
            value: details
        });
    });
    
    const navigationRow = new ActionRowBuilder();
    
    if (pageNumber > 0) {
        navigationRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`series_page_${libraryId}_${pageNumber - 1}`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
        );
    }
    
    navigationRow.addComponents(
        new ButtonBuilder()
            .setCustomId('scan')
            .setLabel('Back to Libraries')
            .setStyle(ButtonStyle.Danger)
    );
    
    if (pageNumber < totalPages - 1) {
        navigationRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`series_page_${libraryId}_${pageNumber + 1}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
        );
    }
    
    await interaction.editReply({
        content: null,
        embeds: [embed],
        components: [navigationRow]
    });
}

function formatType(format) {
    const formats = {
        0: 'Unknown',
        1: 'Image',
        2: 'Archive',
        3: 'Epub',
        4: 'PDF',
        5: 'Text'
    };
    return formats[format] || 'Unknown';
}

export async function handleSeriesSelection(interaction, seriesId) {
    await interaction.deferUpdate();
    
    try {
        const series = await kavita.fetchData(`/api/Series/${seriesId}`);
        
        if (!series) {
            return interaction.editReply({
                content: '❌ Series not found.',
                components: []
            });
        }
        
        const embed = new EmbedBuilder()
            .setTitle(series.name)
            .setColor(0x0099FF)
            .setDescription(series.summary || 'No summary available');
            
        if (series.coverImage) {
            embed.setImage(`${process.env.KAVITA_URL}/api/image/${series.coverImage}?apiKey=${process.env.KAVITA_API_KEY}`);
        }
        
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`scan_${series.libraryId}`)
                    .setLabel('Back to Library')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        await interaction.editReply({
            embeds: [embed],
            components: [actionRow]
        });
    } catch (error) {
        console.error('❌ Error fetching series details:', error);
        await interaction.editReply({
            content: '❌ Error fetching series details.',
            components: []
        });
    }
}
