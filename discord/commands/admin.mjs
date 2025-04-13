/**
 * @fileoverview
 * Admin Command for Kavita Server Management
 *
 * Provides subcommands for:
 * - Assigning user roles by email
 * - Viewing server stats
 * - Running maintenance tasks (scans, cleanup, cache, backup)
 *
 * @module commands/admin
 */

/** @typedef {import('discord.js').ChatInputCommandInteraction} ChatInputCommandInteraction */
/** @typedef {import('discord.js').AutocompleteInteraction} AutocompleteInteraction */

import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import kavita from '../../kavita/initKavita.mjs';
import {
    updateUserRoles,
    scanAllLibraries,
    scanSingleLibrary
} from '../../kavita/postKavita.mjs';
import { printError } from '../../noona/logger/logUtils.mjs';

const command = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Administrator commands for Kavita')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('role')
                .setDescription('Manage user roles')
                .addStringOption(opt =>
                    opt.setName('email').setDescription('User email').setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('role').setDescription('Role to assign').setRequired(true).addChoices(
                        { name: 'Admin', value: 'admin' },
                        { name: 'User', value: 'user' }
                    )
                )
        )
        .addSubcommand(sub =>
            sub.setName('server-status')
                .setDescription('Get Kavita server statistics')
        )
        .addSubcommand(sub =>
            sub.setName('server-maintenance')
                .setDescription('Perform server maintenance tasks')
                .addStringOption(opt =>
                    opt.setName('task').setDescription('Maintenance task to perform').setRequired(true).addChoices(
                        { name: 'Clear Cache', value: 'clear-cache' },
                        { name: 'Cleanup', value: 'cleanup' },
                        { name: 'Database Backup', value: 'backup-db' },
                        { name: 'Scan All Libraries', value: 'scan-libraries' },
                        { name: 'Scan Single Library', value: 'scan-library' }
                    )
                )
                .addStringOption(opt =>
                    opt.setName('library').setDescription('Library name or ID (for single scan)').setAutocomplete(true)
                )
                .addBooleanOption(opt =>
                    opt.setName('force').setDescription('Force full scan (single library only)')
                )
        ),

    /**
     * Executes the admin slash command.
     *
     * @param {ChatInputCommandInteraction} interaction - The interaction context of the command
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'role') {
            const email = interaction.options.getString('email');
            const role = interaction.options.getString('role');

            const userId = await kavita.getUserIdByEmail(email);
            if (!userId) {
                return interaction.editReply(`❌ User with email ${email} not found.`);
            }

            const result = await updateUserRoles(userId, [role]);
            return interaction.editReply(result
                ? `✅ Updated role to **${role}** for **${email}**`
                : `❌ Failed to update role for **${email}**`);
        }

        if (subcommand === 'server-status') {
            try {
                const stats = await kavita.fetchData('/api/Stats/server/stats');
                if (!stats) return interaction.editReply('❌ Failed to fetch server statistics.');

                const embed = new EmbedBuilder()
                    .setTitle('📊 Kavita Server Stats')
                    .setColor(0x5865F2)
                    .setTimestamp();

                const fields = [
                    ['Total Series', stats.seriesCount],
                    ['Total Volumes', stats.volumeCount],
                    ['Total Chapters', stats.chapterCount],
                    ['Total Files', stats.totalFiles],
                    ['Total Size', formatFileSize(stats.totalSize)],
                    ['Total Genres', stats.totalGenres],
                    ['Total Tags', stats.totalTags],
                    ['Total People', stats.totalPeople],
                    ['Total Reading Time', formatReadingTime(stats.totalReadingTime)]
                ];

                fields.forEach(([name, value]) => {
                    if (value !== undefined) embed.addFields({ name, value: value.toString(), inline: true });
                });

                if (stats.mostReadSeries?.[0]?.value?.name) {
                    embed.addFields({ name: '📖 Most Read Series', value: stats.mostReadSeries[0].value.name });
                }

                if (stats.mostActiveLibraries?.[0]?.value?.name) {
                    embed.addFields({ name: '🏛️ Most Active Library', value: stats.mostActiveLibraries[0].value.name });
                }

                return interaction.editReply({ embeds: [embed] });
            } catch (err) {
                printError('❌ Failed to fetch server stats:', err);
                return interaction.editReply('❌ Error fetching server statistics.');
            }
        }

        if (subcommand === 'server-maintenance') {
            const task = interaction.options.getString('task');

            if (task === 'scan-libraries') {
                try {
                    await scanAllLibraries();
                    return interaction.editReply('✅ Scan for all libraries started.');
                } catch (err) {
                    printError('❌ Failed to scan all libraries:', err);
                    return interaction.editReply('❌ Could not scan all libraries.');
                }
            }

            if (task === 'scan-library') {
                const libraryQuery = interaction.options.getString('library');
                const force = interaction.options.getBoolean('force') ?? false;

                try {
                    const libraries = await kavita.getLibraries();
                    const library = libraries.find(lib =>
                        lib.id.toString() === libraryQuery || lib.name.toLowerCase() === libraryQuery.toLowerCase()
                    );

                    if (!library) {
                        return interaction.editReply(`❌ Library "${libraryQuery}" not found.`);
                    }

                    await scanSingleLibrary(library.id, force);
                    return interaction.editReply(`✅ Scan started for library: **${library.name}** (${force ? 'forced' : 'normal'})`);
                } catch (err) {
                    printError('❌ Failed to scan library:', err);
                    return interaction.editReply(`❌ Failed to scan library "${libraryQuery}".`);
                }
            }

            const endpoints = {
                'clear-cache': '/api/Server/clear-cache',
                'cleanup': '/api/Server/cleanup',
                'backup-db': '/api/Server/backup-db'
            };

            const endpoint = endpoints[task];
            if (endpoint) {
                try {
                    await kavita.fetchData(endpoint, 'POST');
                    return interaction.editReply(`✅ ${task.replace('-', ' ')} started successfully.`);
                } catch (err) {
                    printError(`❌ Failed ${task}:`, err);
                    return interaction.editReply(`❌ ${task} failed.`);
                }
            }
        }
    },

    /**
     * Handles autocomplete for the library name input.
     *
     * @param {AutocompleteInteraction} interaction - The autocomplete interaction context
     * @returns {Promise<void>}
     */
    async autocomplete(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const focused = interaction.options.getFocused(true);

        if (subcommand === 'server-maintenance' && focused.name === 'library') {
            try {
                const libraries = await kavita.getLibraries();
                const query = focused.value.toLowerCase();

                const matches = libraries
                    .filter(lib =>
                        lib.name.toLowerCase().includes(query) ||
                        lib.id.toString().includes(query)
                    )
                    .slice(0, 25)
                    .map(lib => ({
                        name: `${lib.name} (ID: ${lib.id})`,
                        value: lib.id.toString()
                    }));

                await interaction.respond(matches);
            } catch (err) {
                printError('❌ Autocomplete failed:', err);
                await interaction.respond([]);
            }
        }
    }
};

export default command;

/**
 * Converts bytes to a human-readable size string.
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
    if (!bytes) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Converts minutes to h:m string.
 * @param {number} minutes
 * @returns {string}
 */
function formatReadingTime(minutes) {
    if (!minutes) return '0 min';
    const hrs = Math.floor(minutes / 60);
    const min = minutes % 60;
    return hrs ? `${hrs}h ${min}m` : `${min}m`;
}
