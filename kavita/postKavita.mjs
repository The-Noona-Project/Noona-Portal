/**
 * @fileoverview
 * Kavita API Handler for State-Changing Operations (write/update/post).
 *
 * Provides functionality for:
 * - Scanning libraries
 * - Creating users and invites
 * - Updating user roles
 * - Checking for new items
 * - Sending new item notifications to Discord
 *
 * @module postKavita
 */

import { EmbedBuilder } from 'discord.js';
import { printStep, printDebug, printResult, printError } from '../noona/logger/logUtils.mjs';
import kavitaAPI from './initKavita.mjs';

/**
 * Updates the roles of a given user.
 * @param {number} userId - Kavita user ID
 * @param {string[]} roles - List of roles to apply
 * @returns {Promise<any>}
 */
export async function updateUserRoles(userId, roles) {
    return await kavitaAPI.fetchData(`/api/Users/${userId}/update-roles`, 'POST', { roles });
}

/**
 * Retrieves all series from a specific library.
 * @param {number|string} libraryId - Kavita library ID
 * @returns {Promise<object[]>}
 */
export async function getSeriesByLibrary(libraryId) {
    const result = await kavitaAPI.fetchData('/api/Series/all-v2', 'POST', {
        libraryId: parseInt(libraryId)
    });

    return Array.isArray(result)
        ? result.filter(series => series.libraryId === parseInt(libraryId))
        : [];
}

/**
 * Triggers a scan for a single Kavita library.
 * @param {number|string} libraryId
 * @returns {Promise<any>}
 */
export async function scanLibrary(libraryId) {
    return await kavitaAPI.fetchData(`/api/Library/scan`, 'POST', null, {
        libraryId: parseInt(libraryId)
    });
}

/**
 * Triggers a scan across all configured Kavita libraries.
 * @returns {Promise<any>}
 */
export async function scanAllLibraries() {
    const ids = process.env.KAVITA_LIBRARY_IDS?.split(',').map(id => parseInt(id.trim())) || [];
    if (!ids.length) return null;

    return await kavitaAPI.fetchData('/api/Library/scan-multiple', 'POST', {
        ids,
        force: true
    });
}

/**
 * Forces a scan on a specific Kavita library.
 * @param {number|string} libraryId
 * @param {boolean} [force=false]
 * @returns {Promise<any>}
 */
export async function scanSingleLibrary(libraryId, force = false) {
    const url = `/api/Library/scan?libraryId=${libraryId}&force=${force}`;
    return await kavitaAPI.fetchData(url, 'POST');
}

/**
 * Creates a new user in Kavita and returns their invite link.
 * @param {string} email - Email address of the new user
 * @returns {Promise<string|null>} Invite link or null on failure
 */
export async function createUser(email) {
    const libraryIds = process.env.KAVITA_LIBRARY_IDS?.split(',').map(id => parseInt(id.trim())) || [];

    const payload = {
        email,
        roles: ['User', 'Login', 'Change Password', 'Bookmark'],
        libraries: libraryIds,
        ageRestriction: { ageRating: 0, includeUnknowns: true }
    };

    const res = await kavitaAPI.fetchData('/api/Account/invite', 'POST', payload);

    if (!res) return null;

    if (res.emailLink) return res.emailLink;
    if (typeof res === 'string') {
        return res.startsWith('http') ? res : `${kavitaAPI.baseUrl}/invite?token=${res}`;
    }

    return null;
}

/**
 * Filters series added within the configured lookback period.
 * @param {number|string} libraryId
 * @param {number|null} lookbackDays
 * @returns {Promise<object[]>}
 */
export async function checkForNewItems(libraryId, lookbackDays = null) {
    const allSeries = await getSeriesByLibrary(libraryId);
    if (!Array.isArray(allSeries)) return [];

    const hours = parseInt(process.env.KAVITA_LOOKBACK_HOURS, 10) || 168;
    const days = lookbackDays || hours / 24;

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return allSeries.filter(series => {
        const created = new Date(series.created);
        return created >= cutoff;
    });
}

/**
 * Sends a notification embed to Discord for newly added series in Kavita.
 *
 * @param {import('discord.js').Client} discordClient - The active Discord client instance
 * @param {Set<string>} notifiedIds - Set of already-notified series IDs
 * @returns {Promise<object[]>} Array of new items that were sent
 */
export async function sendNewItemNotifications(discordClient, notifiedIds) {
    const channelId = process.env.NOTIFICATION_CHANNEL_ID;

    if (!channelId) {
        printError('[Kavita] ❌ NOTIFICATION_CHANNEL_ID not set');
        return [];
    }

    let channel = null;

    try {
        channel = await discordClient.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
            throw new Error('Channel is not a text-based channel');
        }
    } catch (err) {
        printError(`[Kavita] ❌ Discord channel fetch failed (${channelId}): ${err.message}`);
        return [];
    }

    const libraries = await kavitaAPI.fetchData('/api/Library/libraries');
    if (!libraries?.length) {
        printDebug('[Kavita] 📭 No libraries returned from Kavita');
        return [];
    }

    let newItems = [];

    for (const library of libraries) {
        const items = await checkForNewItems(library.id);
        const fresh = (items || []).filter(item => !notifiedIds.has(item.id));
        for (const item of fresh) {
            newItems.push({ ...item, libraryName: library.name });
        }
    }

    if (!newItems.length) {
        printDebug('[Kavita] 📭 No new series to notify');
        return [];
    }

    newItems.sort((a, b) => new Date(b.created) - new Date(a.created));

    const batches = Array.from({ length: Math.ceil(newItems.length / 10) }, (_, i) =>
        newItems.slice(i * 10, i * 10 + 10)
    );

    for (let i = 0; i < batches.length; i++) {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📚 New Series Added (${i + 1}/${batches.length})`)
            .setDescription(`${newItems.length} new series have been added to the library!`)
            .setTimestamp();

        batches[i].forEach(item => {
            embed.addFields({
                name: item.name,
                value: `**Library:** ${item.libraryName}\n**Added:** ${new Date(item.created).toLocaleDateString()}`,
                inline: false
            });
            notifiedIds.add(item.id);
        });

        try {
            await channel.send({ embeds: [embed] });
        } catch (err) {
            printError(`[Kavita] ❌ Failed to send embed to Discord: ${err.message}`);
        }
    }

    return newItems;
}
