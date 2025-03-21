import {SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder} from 'discord.js';
import kavita from '../../kavita/kavita.mjs';

/**
 * Defines the 'admin' command with subcommands for user role management, server status, and maintenance tasks.
 * @type {Object}
 */
export const command = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Administrator commands for Kavita')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('role')
                .setDescription('Manage user roles')
                .addStringOption(option =>
                    option.setName('email')
                        .setDescription('User email')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('role')
                        .setDescription('Role to assign')
                        .setRequired(true)
                        .addChoices(
                            {name: 'Admin', value: 'admin'},
                            {name: 'User', value: 'user'}
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('server-status')
                .setDescription('Get Kavita server statistics')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('server-maintenance')
                .setDescription('Perform server maintenance tasks')
                .addStringOption(option =>
                    option.setName('task')
                        .setDescription('Maintenance task to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Clear Cache', value: 'clear-cache' },
                            { name: 'Cleanup', value: 'cleanup' },
                            { name: 'Database Backup', value: 'backup-db' },
                            { name: 'Scan All Libraries', value: 'scan-libraries' },
                            { name: 'Scan Single Library', value: 'scan-library' }
                        )
                )
                .addStringOption(option =>
                    option.setName('library')
                        .setDescription('Library name or ID to scan (only used with Scan Single Library)')
                        .setRequired(false)
                        .setAutocomplete(true)
                )
                .addBooleanOption(option =>
                    option.setName('force')
                        .setDescription('Force full scan, ignore optimizations (only used with Scan Single Library)')
                        .setRequired(false)
                )
        ),

    /**
     * Executes the 'admin' command based on the subcommand provided.
     * @param {Object} interaction - The interaction object from Discord.
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'role') {
            const email = interaction.options.getString('email');
            const role = interaction.options.getString('role');

            const userId = await kavita.getUserIdByEmail(email);

            if (!userId) {
                return interaction.editReply(`User with email ${email} not found.`);
            }

            const result = await kavita.updateUserRoles(userId, [role]);

            if (result) {
                await interaction.editReply(`Updated role to ${role} for user ${email}`);
            } else {
                await interaction.editReply(`Failed to update role for user ${email}`);
            }
        } else if (subcommand === 'server-status') {
            try {
                console.log('Fetching server statistics...');
                const stats = await kavita.fetchData('/api/Stats/server/stats');

                if (!stats) {
                    return interaction.editReply('Failed to fetch server statistics.');
                }

                console.log('Server stats received:', JSON.stringify(stats).substring(0, 500) + '...');

                const embed = new EmbedBuilder()
                    .setTitle('Kavita Server Statistics')
                    .setColor(0x0099FF);

                if (stats.seriesCount !== undefined) embed.addFields({
                    name: 'Total Series',
                    value: stats.seriesCount.toString(),
                    inline: true
                });
                if (stats.volumeCount !== undefined) embed.addFields({
                    name: 'Total Volumes',
                    value: stats.volumeCount.toString(),
                    inline: true
                });
                if (stats.chapterCount !== undefined) embed.addFields({
                    name: 'Total Chapters',
                    value: stats.chapterCount.toString(),
                    inline: true
                });
                if (stats.totalFiles !== undefined) embed.addFields({
                    name: 'Total Files',
                    value: stats.totalFiles.toString(),
                    inline: true
                });
                if (stats.totalSize !== undefined) embed.addFields({
                    name: 'Total Size',
                    value: formatFileSize(stats.totalSize),
                    inline: true
                });
                if (stats.totalGenres !== undefined) embed.addFields({
                    name: 'Total Genres',
                    value: stats.totalGenres.toString(),
                    inline: true
                });
                if (stats.totalTags !== undefined) embed.addFields({
                    name: 'Total Tags',
                    value: stats.totalTags.toString(),
                    inline: true
                });
                if (stats.totalPeople !== undefined) embed.addFields({
                    name: 'Total People',
                    value: stats.totalPeople.toString(),
                    inline: true
                });
                if (stats.totalReadingTime !== undefined) embed.addFields({
                    name: 'Total Reading Time',
                    value: formatReadingTime(stats.totalReadingTime),
                    inline: true
                });

                if (stats.mostReadSeries && stats.mostReadSeries.length > 0) {
                    const topSeries = stats.mostReadSeries[0];
                    if (topSeries.value && topSeries.value.name) {
                        embed.addFields({name: 'Most Read Series', value: topSeries.value.name, inline: true});
                    }
                }

                if (stats.mostActiveLibraries && stats.mostActiveLibraries.length > 0) {
                    const topLibrary = stats.mostActiveLibraries[0];
                    if (topLibrary.value && topLibrary.value.name) {
                        embed.addFields({name: 'Most Active Library', value: topLibrary.value.name, inline: true});
                    }
                }

                embed.setTimestamp();

                await interaction.editReply({embeds: [embed]});
            } catch (error) {
                console.error('Error fetching server stats:', error);
                await interaction.editReply('An error occurred while fetching server statistics.');
            }
        } else if (subcommand === 'server-maintenance') {
            const task = interaction.options.getString('task');
            let endpoint = '';
            let taskName = '';

            switch (task) {
                case 'clear-cache':
                    endpoint = '/api/Server/clear-cache';
                    taskName = 'Clear Cache';
                    break;
                case 'cleanup':
                    endpoint = '/api/Server/cleanup';
                    taskName = 'Cleanup';
                    break;
                case 'backup-db':
                    endpoint = '/api/Server/backup-db';
                    taskName = 'Database Backup';
                    break;
                case 'scan-libraries':
                    try {
                        const result = await kavita.scanAllLibraries();
                        return await interaction.editReply(`✅ Scan Libraries task started successfully.`);
                    } catch (error) {
                        console.error('Error scanning libraries:', error);
                        return await interaction.editReply(`❌ Failed to scan libraries.`);
                    }
                    break;
                case 'scan-library':
                    const libraryQuery = interaction.options.getString('library');
                    if (!libraryQuery) {
                        return await interaction.editReply(`❌ Library name or ID is required for scanning a single library.`);
                    }
                    
                    try {
                        const libraries = await kavita.getLibraries();
                        
                        if (!libraries || libraries.length === 0) {
                            return await interaction.editReply('❌ No libraries found.');
                        }
                        
                        let libraryToScan = null;
                        
                        if (!isNaN(libraryQuery)) {
                            const libraryId = parseInt(libraryQuery);
                            libraryToScan = libraries.find(lib => lib.id === libraryId);
                        } else {
                            libraryToScan = libraries.find(lib => 
                                lib.name.toLowerCase() === libraryQuery.toLowerCase());
                        }
                        
                        if (!libraryToScan) {
                            return await interaction.editReply(`❌ Library "${libraryQuery}" not found.`);
                        }
                        
                        const forceScan = interaction.options.getBoolean('force') ?? false;
                        const url = `/api/Library/scan?libraryId=${libraryToScan.id}&force=${forceScan}`;
                        await kavita.fetchData(url, 'POST');
                        
                        const scanTypeText = forceScan ? "force scan" : "scan";
                        return await interaction.editReply(`✅ ${scanTypeText} started for library: ${libraryToScan.name}`);
                    } catch (error) {
                        console.error('Error scanning library:', error);
                        return await interaction.editReply(`❌ Failed to scan library: ${error.message}`);
                    }
                    break;
            }

            if (endpoint) {
                try {
                    await kavita.fetchData(endpoint, 'POST');
                    await interaction.editReply(`✅ ${taskName} task started successfully.`);
                } catch (error) {
                    console.error(`Error running ${taskName}:`, error);
                    await interaction.editReply(`❌ Failed to run ${taskName} task.`);
                }
            }
        }
    },
    
    async autocomplete(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const focusedOption = interaction.options.getFocused(true);
        
        if (subcommand === 'server-maintenance' && focusedOption.name === 'library') {
            try {
                const libraries = await kavita.getLibraries();
                const focusedValue = focusedOption.value.toLowerCase();
                
                const filtered = libraries
                    .filter(lib => lib.name.toLowerCase().includes(focusedValue) || 
                                  lib.id.toString().includes(focusedValue))
                    .slice(0, 25);
                    
                await interaction.respond(
                    filtered.map(lib => ({
                        name: `${lib.name} (ID: ${lib.id})`,
                        value: lib.id.toString()
                    }))
                );
            } catch (error) {
                console.error('Error during library autocomplete:', error);
                await interaction.respond([]);
            }
        }
    }
};

/**
 * Formats a file size from bytes into a human-readable string.
 * @param {number} bytes - The file size in bytes.
 * @returns {string} The formatted file size string.
 * @example
 * const size = formatFileSize(1024);
 * console.log(size); // Output: "1 KB"
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats reading time in minutes into hours and minutes.
 * @param {number} minutes - The total reading time in minutes.
 * @returns {string} The formatted reading time string.
 * @example
 * const time = formatReadingTime(125);
 * console.log(time); // Output: "2 hours 5 minutes"
 */
function formatReadingTime(minutes) {
    if (minutes === 0) return '0 minutes';

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
        return `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    } else if (remainingMinutes === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
        return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    }
} 