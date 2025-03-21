import {EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} from 'discord.js';
import kavita from '../../kavita/kavita.mjs';
import fs from 'fs';
import path from 'path';

/**
 * Sets up and manages a library notification service that checks for new additions
 * to the library and sends Discord messages to a specified channel.
 *
 * @param {Object} client - The Discord.js client instance.
 * @returns {Object} An object with controls to stop the service, trigger a manual check,
 * or get the count of notified items.
 *
 * @example
 * const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
 * client.once('ready', () => {
 *     const libraryNotifications = setupLibraryNotifications(client);
 *     console.log('Library notifications enabled');
 * });
 */
export const setupLibraryNotifications = (client) => {
    const NOTIFICATION_CHANNEL_ID = process.env.NOTIFICATION_CHANNEL_ID;
    const CHECK_INTERVAL_HOURS = parseInt(process.env.CHECK_INTERVAL_HOURS || '12', 10);
    const CHECK_INTERVAL = CHECK_INTERVAL_HOURS * 60 * 60 * 1000; // Interval in milliseconds
    const STORAGE_FILE = path.join(process.cwd(), 'data', 'notified-items.json');
    const ITEMS_PER_PAGE = 10;

    // Map to store batch data temporarily for pagination
    // Key: batchId, Value: array of items
    const batchStorage = new Map();

    // Cleanup old batches after 1 hour
    const BATCH_TTL = 60 * 60 * 1000;

    if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
        fs.mkdirSync(path.join(process.cwd(), 'data'), {recursive: true});
    }

    let notifiedItemIds = new Set();
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
            notifiedItemIds = new Set(data);
            console.log(`📂 Loaded ${notifiedItemIds.size} previously notified items`);
        } else {
            console.log('📂 No previous notifications file found, starting fresh');
        }
    } catch (error) {
        console.error('❌ Error loading notification history:', error);
    }

    /**
     * Saves the IDs of notified items to a file.
     * Ensures that the notification history is persistent across restarts.
     */
    function saveNotifiedItems() {
        try {
            const data = JSON.stringify(Array.from(notifiedItemIds));
            fs.writeFileSync(STORAGE_FILE, data);
        } catch (error) {
            console.error('❌ Error saving notification history:', error);
        }
    }

    function createEmbeds(newItems) {
        const ITEMS_PER_EMBED = 10;
        const totalEmbeds = Math.ceil(newItems.length / ITEMS_PER_EMBED);
        const embeds = [];
        
        for (let i = 0; i < totalEmbeds; i++) {
            const startIdx = i * ITEMS_PER_EMBED;
            const endIdx = Math.min(startIdx + ITEMS_PER_EMBED, newItems.length);
            const pageItems = newItems.slice(startIdx, endIdx);
            
            const embed = new EmbedBuilder()
                .setTitle(`📚 New Additions to the Library! (${i+1}/${totalEmbeds})`)
                .setColor(0x00FF00)
                .setDescription(`Total new items: ${newItems.length}`)
                .setTimestamp();
                
            pageItems.forEach(item => {
                const addedTime = new Date(item.lastChapterAdded);
                
                const fieldValue = [
                    `Added: ${addedTime.toLocaleString()}`,
                    `Library: ${item.libraryName || 'Unknown'}`
                ].filter(Boolean).join('\n');
                
                embed.addFields({
                    name: item.name,
                    value: fieldValue || 'No additional information available'
                });
            });
            
            embeds.push(embed);
        }
        
        return embeds;
    }

    function createNavigationRow(page, totalPages, batchId) {
        const row = new ActionRowBuilder();

        if (totalPages > 1) {
            if (page > 1) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`library_prev_${batchId}_${page}`)
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                );
            }

            if (page < totalPages) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`library_next_${batchId}_${page}`)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                );
            }
        }

        return row;
    }

    function cleanupOldBatches() {
        const now = Date.now();
        for (const [batchId, data] of batchStorage.entries()) {
            if (now - parseInt(batchId) > BATCH_TTL) {
                batchStorage.delete(batchId);
            }
        }
    }

    /**
     * Checks for new additions to the library, filters for new and recent items,
     * and sends a notification to a Discord channel.
     *
     * @async
     * @example
     * const notifications = setupLibraryNotifications(client);
     * notifications.checkNow(); // Manually trigger a check for new library items.
     */
    async function checkForNewAdditions() {
        const channel = client.channels.cache.get(NOTIFICATION_CHANNEL_ID);
        if (!channel) {
            console.error('❌ Notification channel not found');
            return;
        }

        try {
            const currentTime = Date.now();
            const lookbackTime = currentTime - (24 * 60 * 60 * 1000);
            const batchId = currentTime.toString();

            const endpoint = `/api/Series/recently-added-v2`;

            const filterDto = {
                statements: [],
                combination: 1
            };

            const recentlyAdded = await kavita.fetchData(endpoint, 'POST', filterDto);

            if (recentlyAdded && Array.isArray(recentlyAdded) && recentlyAdded.length > 0) {
                const newItems = recentlyAdded.filter(item => {
                    if (!item.lastChapterAdded) return false;

                    const addedDate = new Date(item.lastChapterAdded).getTime();
                    const isWithinLookback = addedDate >= lookbackTime;
                    const isNew = !notifiedItemIds.has(item.id);

                    return isWithinLookback && isNew;
                });

                if (newItems.length === 0) {
                    console.log('No new items found in library within the lookback period');
                    return;
                }

                newItems.forEach(item => {
                    notifiedItemIds.add(item.id);
                });

                const embeds = createEmbeds(newItems);

                // Discord allows up to 10 embeds per message
                const MAX_EMBEDS_PER_MESSAGE = 10;

                // Split embeds into chunks if needed
                for (let i = 0; i < embeds.length; i += MAX_EMBEDS_PER_MESSAGE) {
                    const embedChunk = embeds.slice(i, i + MAX_EMBEDS_PER_MESSAGE);
                    await channel.send({ embeds: embedChunk });
                }

                console.log(`✅ Sent notification about ${newItems.length} new items (${embeds.length} embeds)`);
                saveNotifiedItems();

                cleanupOldBatches();
            } else {
                console.log('No items found in library response');
            }
        } catch (error) {
            console.error('❌ Error checking for new library additions:', error);
        }
    }

    const interval = setInterval(checkForNewAdditions, CHECK_INTERVAL);

    console.log(`✅ Library notification service initialized - checking every ${CHECK_INTERVAL / (60 * 60 * 1000)} hours`);

    checkForNewAdditions();

    // Need To Export For Button Handler
    const libraryNotificationService = {
        /**
         * Stops the library notification service by clearing the interval.
         * @example
         * const notifications = setupLibraryNotifications(client);
         * notifications.stop(); // Stops the notification service.
         */
        stop: () => clearInterval(interval),

        /**
         * Manually triggers a check for new library additions.
         * @returns {Promise<void>} Resolves when the check is complete.
         * @example
         * const notifications = setupLibraryNotifications(client);
         * notifications.checkNow(); // Manually triggers a library check.
         */
        checkNow: checkForNewAdditions,

        /**
         * Gets the count of notified items stored in memory.
         * @returns {number} The number of notified items.
         * @example
         * const notifications = setupLibraryNotifications(client);
         * console.log(`Notified items count: ${notifications.getNotifiedCount()}`);
         */
        getNotifiedCount: () => notifiedItemIds.size,

        async handlePaginationButton(interaction) {
            try {
                await interaction.deferUpdate();

                const customId = interaction.customId;
                const parts = customId.split('_');
                const action = parts[1];
                const batchId = parts[2];
                const currentPage = parseInt(parts[3]);

                let newPage = currentPage;
                if (action === 'next') newPage++;
                else if (action === 'prev') newPage--;

                const batchItems = batchStorage.get(batchId);
                if (!batchItems) {
                    return await interaction.followUp({
                        content: '⚠️ This navigation has expired. The data is no longer available.',
                        ephemeral: true
                    });
                }

                const totalPages = Math.ceil(batchItems.length / ITEMS_PER_PAGE);

                const newEmbeds = createEmbeds(batchItems);

                const newNavRow = createNavigationRow(newPage, totalPages, batchId);

                await interaction.editReply({
                    embeds: [newEmbeds[newPage - 1]],
                    components: [newNavRow]
                });
            } catch (error) {
                console.error('Error handling pagination:', error);
            }
        }
    };

    client.libraryNotifications = libraryNotificationService;

    return libraryNotificationService;
};