// ✅ /discord/tasks/libraryNotifications.mjs

import { checkForNewItems } from '../../kavita/kavita.mjs';
import * as vault from '../../noona/vault.mjs';
import chalk from 'chalk';

let interval = null;

/**
 * Loads previously notified IDs from Vault (backed by MongoDB).
 * @returns {Promise<Set<string>>}
 */
async function loadNotifiedIds() {
    try {
        const ids = await vault.getNotifiedIds();
        console.log(chalk.gray(`📂 Loaded ${ids.length} previously notified items from Vault`));
        return new Set(ids);
    } catch (err) {
        console.error(chalk.red('❌ Failed to load notification IDs from Vault:'), err.message);
        return new Set();
    }
}

/**
 * Sets up the scheduled notification checks.
 * @param {Client} discordClient - The initialized Discord bot client
 */
export function setupLibraryNotifications(discordClient) {
    if (!discordClient) {
        console.warn(chalk.yellow('⚠️  Discord client is not ready. Notifications skipped.'));
        return;
    }

    if (interval) {
        clearInterval(interval);
        console.log(chalk.yellow('🔁 Existing notification interval cleared.'));
    }

    let notifiedIds = new Set();

    // Initial load
    loadNotifiedIds().then((loaded) => {
        notifiedIds = loaded;
    });

    // Interval in ms (default: 2 hours)
    const intervalMs = 1000 * 60 * 60 * 2;

    interval = setInterval(async () => {
        await checkForNewItems(discordClient, notifiedIds);
    }, intervalMs);

    console.log(chalk.green('✅ Library notification service initialized - checking every 2 hours'));
}
