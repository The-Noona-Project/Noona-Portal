// /discord/tasks/libraryNotifications.mjs — Warden-Aware Notifier (Vault + Kavita + Discord Integration)

import { sendNewItemNotifications } from '../../kavita/postKavita.mjs';
import * as vault from '../../noona/vault/initVault.mjs';
import {
    printStep,
    printDebug,
    printResult,
    printError,
    printSection
} from '../../noona/logger/logUtils.mjs';

let interval = null;

/**
 * 📂 Loads previously notified item IDs from Vault (MongoDB-based).
 *
 * @function loadNotifiedIds
 * @returns {Promise<Set<string>>} - Set of previously notified item IDs.
 */
async function loadNotifiedIds() {
    printStep('[Notifier] 📥 Loading previously notified item IDs from Vault...');
    try {
        const ids = await vault.getNotifiedIds();
        printResult(`[Notifier] ✅ Loaded ${ids.length} previously notified items`);
        return new Set(ids);
    } catch (err) {
        printError('[Notifier] ❌ Failed to load notified IDs:', err?.response?.data || err.message);
        return new Set();
    }
}

/**
 * 🔁 Executes a single library check and saves updated notified IDs if any.
 *
 * @function runCheck
 * @param {import('discord.js').Client} discordClient - The active Discord client instance.
 * @param {Set<string>} notifiedIds - Set of already-notified Kavita item IDs.
 * @param {string} label - Tag to identify the run context (e.g., "manual", "initial", "scheduled").
 * @returns {Promise<void>}
 */
async function runCheck(discordClient, notifiedIds, label = 'manual') {
    const newItems = await sendNewItemNotifications(discordClient, notifiedIds);

    if (newItems.length > 0) {
        try {
            await vault.saveNotifiedIds([...notifiedIds]);
            printResult(`[Notifier] ✅ Saved ${notifiedIds.size} notified IDs after "${label}" check`);
        } catch (err) {
            printError('[Notifier] ❌ Failed to save updated IDs:', err?.response?.data || err.message);
        }
    } else {
        printDebug(`[Notifier] 📭 No new items found during "${label}" check.`);
    }
}

/**
 * 🛎️ Sets up the library notification service with scheduled checks.
 *
 * This will:
 * - Load previous notification state from Vault
 * - Run an initial check after 10 seconds
 * - Schedule recurring checks every `CHECK_INTERVAL_HOURS` hours
 *
 * @function setupLibraryNotifications
 * @param {import('discord.js').Client} discordClient - The active Discord client instance.
 * @returns {Promise<void>}
 */
export async function setupLibraryNotifications(discordClient) {
    printSection('📡 Library Notification Service Booting...');

    if (!discordClient) {
        printError('[Notifier] ⚠️ Discord client is not ready. Notifications skipped.');
        return;
    }

    if (interval) {
        clearInterval(interval);
        printDebug('[Notifier] 🔄 Existing interval cleared.');
    }

    const intervalHours = parseInt(process.env.CHECK_INTERVAL_HOURS, 10);
    if (isNaN(intervalHours) || intervalHours < 1) {
        printError('[Notifier] ❌ Invalid CHECK_INTERVAL_HOURS in environment.');
        return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;
    const notifiedIds = await loadNotifiedIds();

    // Run the initial check shortly after startup
    setTimeout(() => runCheck(discordClient, notifiedIds, 'initial'), 10_000);

    // Schedule recurring checks
    interval = setInterval(() => runCheck(discordClient, notifiedIds, 'scheduled'), intervalMs);

    printResult(`[Notifier] ✅ Service initialized — running every ${intervalHours} hour(s)`);
}
