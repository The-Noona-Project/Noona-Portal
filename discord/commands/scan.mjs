/**
 * @fileoverview
 * Scan Command — Displays library list and scans selected libraries.
 *
 * Supports buttons for:
 * - Library selection
 * - Series browsing
 * - Paginated navigation
 * - Returning to library list
 *
 * @module commands/scan
 */

import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} from 'discord.js';
import kavita from '../../kavita/initKavita.mjs';
import { scanLibrary } from '../../kavita/postKavita.mjs';
import { printDebug, printError } from '../../noona/logger/logUtils.mjs';

const command = {
    data: new SlashCommandBuilder()
        .setName('scan')
        .setDescription('Displays libraries and lets you select one to scan.'),

    /**
     * Shows the initial library button list.
     *
     * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object.
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        await interaction.deferReply();
        printDebug(`[Scan] ${interaction.user.tag} requested library list`);

        const libraries = await kavita.getLibraries();
        if (!libraries?.length) {
            return interaction.editReply('❌ No libraries found.');
        }

        const rows = buildLibraryButtons(libraries);
        await interaction.editReply({
            content: '📚 Select a library to scan:',
            components: rows
        });
    }
};

export default command;

/**
 * 🔘 Builds button rows from a list of libraries.
 *
 * @param {Array<{ id: number, name: string }>} libraries - The list of libraries.
 * @returns {ActionRowBuilder<ButtonBuilder>[]} Array of Discord button rows.
 */
function buildLibraryButtons(libraries) {
    const buttons = libraries.map(lib =>
        new ButtonBuilder()
            .setCustomId(`scan_${lib.id}`)
            .setLabel(lib.name)
            .setStyle(ButtonStyle.Primary)
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    return rows;
}

/**
 * 🔄 Handles button interaction for library selection and triggers a scan.
 *
 * @param {import('discord.js').ButtonInteraction} interaction - The interaction object.
 * @param {string} libraryId - The selected library ID.
 * @returns {Promise<void>}
 */
export async function handleLibrarySelection(interaction, libraryId) {
    await interaction.deferUpdate();
    const libraries = await kavita.getLibraries();
    const library = libraries.find(lib => lib.id.toString() === libraryId);

    if (!library) {
        return interaction.editReply({ content: '❌ Library not found.', components: [] });
    }

    try {
        await scanLibrary(libraryId);
        printDebug(`[Scan] Scan initiated for ${library.name} by ${interaction.user.tag}`);
    } catch (err) {
        printError(`❌ Failed to scan library: ${err.message}`);
    }

    await handleSeriesPage(interaction, libraryId, 0, true);
}

/**
 * 📖 Shows a paginated list of series in a library.
 *
 * @param {import('discord.js').ButtonInteraction} interaction - The interaction object.
 * @param {string} libraryId - The library ID.
 * @param {number} [page=0] - The page number.
 * @param {boolean} [alreadyDeferred=false] - Whether deferUpdate has already been called.
 * @returns {Promise<void>}
 */
export async function handleSeriesPage(interaction, libraryId, page = 0, alreadyDeferred = false) {
    if (!alreadyDeferred) await interaction.deferUpdate();

    const libraries = await kavita.getLibraries();
    const library = libraries.find(lib => lib.id.toString() === libraryId);
    const series = await kavita.getSeriesByLibrary(libraryId);

    if (!library || !series?.length) {
        return interaction.editReply({
            content: `📚 Library not found or has no series.`,
            components: []
        });
    }

    const pageSize = 10;
    const totalPages = Math.ceil(series.length / pageSize);
    const slice = series.slice(page * pageSize, (page + 1) * pageSize);

    const embed = new EmbedBuilder()
        .setTitle(`📚 ${library.name} — Series (Page ${page + 1}/${totalPages})`)
        .setColor(0x0099FF)
        .setDescription(`Showing ${page * pageSize + 1}-${page * pageSize + slice.length} of ${series.length}`);

    slice.forEach((s, idx) => {
        embed.addFields({
            name: `${page * pageSize + idx + 1}. ${s.name}`,
            value: formatSeriesDetails(s)
        });
    });

    const navRow = new ActionRowBuilder();
    if (page > 0) {
        navRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`series_page_${libraryId}_${page - 1}`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
        );
    }

    navRow.addComponents(
        new ButtonBuilder()
            .setCustomId('scan')
            .setLabel('Back to Libraries')
            .setStyle(ButtonStyle.Danger)
    );

    if (page < totalPages - 1) {
        navRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`series_page_${libraryId}_${page + 1}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
        );
    }

    await interaction.editReply({ embeds: [embed], components: [navRow] });
}

/**
 * 📄 Formats details of a series object.
 *
 * @param {object} series - Series object from Kavita API.
 * @returns {string} Formatted string.
 */
function formatSeriesDetails(series) {
    const createdDate = series.created ? new Date(series.created).toLocaleDateString() : 'Unknown';
    const readingTime = series.avgHoursToRead?.toFixed(1) || '?';
    const format = formatType(series.format);

    return [
        series.pages ? `📄 ${series.pages} pages` : null,
        format ? `📚 Format: ${format}` : null,
        series.avgHoursToRead ? `⏱️ Est. read time: ${readingTime} hrs` : null,
        `📅 Added: ${createdDate}`
    ].filter(Boolean).join('\n');
}

/**
 * 🔣 Converts Kavita format type into readable string.
 *
 * @param {number|string} format - Format code from Kavita.
 * @returns {string} Readable format string.
 */
function formatType(format) {
    const formats = {
        0: 'Unknown', 1: 'Image', 2: 'Archive', 3: 'Epub', 4: 'PDF', 5: 'Text'
    };
    return formats[format] || 'Unknown';
}

/**
 * 📘 Displays full details for a selected series.
 *
 * @param {import('discord.js').ButtonInteraction} interaction - Discord button interaction.
 * @param {string} seriesId - ID of the series.
 * @returns {Promise<void>}
 */
export async function handleSeriesSelection(interaction, seriesId) {
    await interaction.deferUpdate();

    try {
        const series = await kavita.fetchData(`/api/Series/${seriesId}`);
        if (!series) throw new Error('Series not found.');

        const embed = new EmbedBuilder()
            .setTitle(series.name)
            .setColor(0x0099FF)
            .setDescription(series.summary || 'No summary available');

        if (series.coverImage) {
            embed.setImage(`${process.env.KAVITA_URL}/api/image/${series.coverImage}?apiKey=${process.env.KAVITA_API_KEY}`);
        }

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`scan_${series.libraryId}`)
                .setLabel('Back to Library')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });
    } catch (err) {
        printError('❌ Error fetching series details:', err);
        await interaction.editReply({ content: '❌ Error fetching series details.', components: [] });
    }
}
