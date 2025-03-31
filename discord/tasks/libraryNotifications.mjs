// /discord/tasks/libraryNotifications.mjs — Warden-Aware Notifier (Vault Auth + Structured Logging)

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
 * 📂 Load notified item IDs from Vault.
 */
async function loadNotifiedIds() {
    printStep('[Notifier] 📥 Loading previously notified item IDs from Vault...');
    try {
        const ids = await vault.getNotifiedIds();
        printResult(`[Notifier] ✅ Loaded ${ids.length} previously notified items from Vault`);
        return new Set(ids);
    } catch (err) {
        printError('[Notifier] ❌ Failed to load notified IDs:', err?.response?.data || err.message);
        return new Set();
    }
}

/**
 * 🔁 Run notification cycle: check and notify.
 */
async function runCheck(discordClient, notifiedIds, label = 'manual/initial') {
    const newItems = await sendNewItemNotifications(discordClient, notifiedIds);

    if (newItems.length > 0) {
        try {
            await vault.saveNotifiedIds([...notifiedIds]);
            printResult(`[Notifier] ✅ Saved ${notifiedIds.size} notified IDs to Vault after "${label}" check`);
        } catch (err) {
            printError('[Notifier] ❌ Failed to save notified IDs:', err?.response?.data || err.message);
        }
    } else {
        printDebug(`[Notifier] 📭 No new items found during "${label}" check.`);
    }
}

/**
 * 🛎️ Set up scheduled library notification service.
 */
export async function setupLibraryNotifications(discordClient) {
    printSection('📡 Library Notification Service Booting...');

    if (!discordClient) {
        printError('[Notifier] ⚠️ Discord client is not ready. Notifications skipped.');
        return;
    }

    if (interval) {
        clearInterval(interval);
        printDebug('[Notifier] 🔄 Existing notification interval cleared.');
    }

    const intervalHours = parseInt(process.env.CHECK_INTERVAL_HOURS, 10);
    if (isNaN(intervalHours) || intervalHours < 1) {
        printError('[Notifier] ❌ Invalid CHECK_INTERVAL_HOURS in environment.');
        return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;
    const notifiedIds = await loadNotifiedIds();

    // Run first check shortly after boot
    setTimeout(() => runCheck(discordClient, notifiedIds, 'initial'), 10_000);

    // Start scheduled interval
    interval = setInterval(() => runCheck(discordClient, notifiedIds, 'scheduled'), intervalMs);

    printResult(`[Notifier] ✅ Library notification service initialized — checking every ${intervalHours} hour(s)`);
}
