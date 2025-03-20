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
                .setDescription('Run server maintenance tasks')
                .addStringOption(option =>
                    option.setName('task')
                        .setDescription('Maintenance task to run')
                        .setRequired(true)
                        .addChoices(
                            {name: 'Clear Cache', value: 'clear-cache'},
                            {name: 'Cleanup', value: 'cleanup'},
                            {name: 'Database Backup', value: 'backup-db'},
                            {name: 'Analyze Files', value: 'analyze-files'}
                        )
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
                case 'analyze-files':
                    endpoint = '/api/Server/analyze-files';
                    taskName = 'Analyze Files';
                    break;
            }

            try {
                await kavita.fetchData(endpoint, 'POST');
                await interaction.editReply(`✅ ${taskName} task started successfully.`);
            } catch (error) {
                console.error(`Error running ${taskName}:`, error);
                await interaction.editReply(`❌ Failed to run ${taskName} task.`);
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