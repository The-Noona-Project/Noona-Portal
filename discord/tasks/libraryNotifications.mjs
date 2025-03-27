// ✅ /discord/tasks/libraryNotifications.mjs — Warden-Aware Notifier (Redis Auth + Logger)

import { sendNewItemNotifications } from '../../kavita/kavita.mjs';
import * as vault from '../../noona/vault/vault.mjs';
import {
    printStep,
    printDebug,
    printResult,
    printError
} from '../../noona/logger/logUtils.mjs';

let interval = null;

/**
 * 📥 Load previously notified item IDs from Vault via Redis-auth.
 */
async function loadNotifiedIds() {
    printStep('📂 Loading previously notified item IDs from Vault...');

    try {
        const ids = await vault.getNotifiedIds();
        printResult(`📂 Loaded ${ids.length} previously notified items from Vault`);
        return new Set(ids);
    } catch (err) {
        printError('[Vault] ❌ Failed to load notified IDs:', err?.response?.data || err.message);
        return new Set();
    }
}

/**
 * 🛎️ Set up the scheduled library notification service.
 */
export async function setupLibraryNotifications(discordClient) {
    if (!discordClient) {
        printError('⚠️  Discord client is not ready. Notifications skipped.');
        return;
    }

    if (interval) {
        clearInterval(interval);
        printDebug('🔁 Existing notification interval cleared.');
    }

    const intervalHours = parseInt(process.env.CHECK_INTERVAL_HOURS, 10);
    if (isNaN(intervalHours) || intervalHours < 1) {
        printError('❌ Invalid CHECK_INTERVAL_HOURS provided.');
        return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;
    const notifiedIds = await loadNotifiedIds();

    /**
     * 🔄 Check for new items and notify users.
     */
    async function runCheck(label = 'manual/initial') {
        const newItems = await sendNewItemNotifications(discordClient, notifiedIds);

        if (newItems.length > 0) {
            try {
                await vault.saveNotifiedIds([...notifiedIds]);
                printResult(`✅ Saved ${notifiedIds.size} notified IDs to Vault after ${label} check.`);
            } catch (err) {
                printError('[Vault] ❌ Failed to save notified IDs:', err?.response?.data || err.message);
            }
        } else {
            printDebug(`📭 No new items found during ${label} check.`);
        }
    }

    // Run once shortly after boot
    setTimeout(() => runCheck('initial'), 10_000);

    // Start scheduled loop
    interval = setInterval(() => runCheck('scheduled'), intervalMs);

    printResult(`✅ Library notification service initialized - checking every ${intervalHours} hour(s)`);
}
