import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import kavita from '../../kavita/kavita.mjs';

const command = {
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
                            { name: 'Admin', value: 'admin' },
                            { name: 'User', value: 'user' }
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
                        .setDescription('Library name or ID (for single scan)')
                        .setAutocomplete(true)
                )
                .addBooleanOption(option =>
                    option.setName('force')
                        .setDescription('Force full scan (single library only)')
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
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
                return interaction.editReply(`✅ Updated role to ${role} for ${email}`);
            } else {
                return interaction.editReply(`❌ Failed to update role for ${email}`);
            }
        }

        if (subcommand === 'server-status') {
            try {
                const stats = await kavita.fetchData('/api/Stats/server/stats');
                if (!stats) return interaction.editReply('❌ Failed to fetch server statistics.');

                const embed = new EmbedBuilder()
                    .setTitle('Kavita Server Stats')
                    .setColor(0x0099FF)
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
                    if (value !== undefined) {
                        embed.addFields({ name, value: value.toString(), inline: true });
                    }
                });

                if (stats.mostReadSeries?.[0]?.value?.name) {
                    embed.addFields({ name: 'Most Read Series', value: stats.mostReadSeries[0].value.name });
                }

                if (stats.mostActiveLibraries?.[0]?.value?.name) {
                    embed.addFields({ name: 'Most Active Library', value: stats.mostActiveLibraries[0].value.name });
                }

                return interaction.editReply({ embeds: [embed] });
            } catch (err) {
                console.error('❌ Failed to fetch server stats:', err);
                return interaction.editReply('❌ Error fetching server statistics.');
            }
        }

        if (subcommand === 'server-maintenance') {
            const task = interaction.options.getString('task');

            if (task === 'scan-libraries') {
                try {
                    await kavita.scanAllLibraries();
                    return interaction.editReply('✅ Scan for all libraries started.');
                } catch (err) {
                    console.error('❌ Failed to scan all libraries:', err);
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

                    const url = `/api/Library/scan?libraryId=${library.id}&force=${force}`;
                    await kavita.fetchData(url, 'POST');

                    return interaction.editReply(`✅ Scan started for library: ${library.name} (${force ? 'forced' : 'normal'})`);
                } catch (err) {
                    console.error('❌ Failed to scan library:', err);
                    return interaction.editReply(`❌ Failed to scan library "${libraryQuery}".`);
                }
            }

            // Basic tasks (clear-cache, cleanup, backup-db)
            const endpoints = {
                'clear-cache': '/api/Server/clear-cache',
                'cleanup': '/api/Server/cleanup',
                'backup-db': '/api/Server/backup-db'
            };

            const endpoint = endpoints[task];
            if (endpoint) {
                try {
                    await kavita.fetchData(endpoint, 'POST');
                    return interaction.editReply(`✅ ${task} started successfully.`);
                } catch (err) {
                    console.error(`❌ Failed ${task}:`, err);
                    return interaction.editReply(`❌ ${task} failed.`);
                }
            }
        }
    },

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
                console.error('❌ Autocomplete failed:', err);
                await interaction.respond([]);
            }
        }
    }
};

export default command;

// ———————————————————————————————————————————————————————————————————
// Helpers

function formatFileSize(bytes) {
    if (!bytes) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function formatReadingTime(minutes) {
    if (!minutes) return '0 min';
    const hrs = Math.floor(minutes / 60);
    const min = minutes % 60;
    return hrs ? `${hrs}h ${min}m` : `${min}m`;
}
