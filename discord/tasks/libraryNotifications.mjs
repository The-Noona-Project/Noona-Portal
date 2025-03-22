// ✅ /discord/tasks/libraryNotifications.mjs

import {sendNewItemNotifications} from '../../kavita/kavita.mjs';
import * as vault from '../../noona/vault/vault.mjs';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

let interval = null;

async function loadNotifiedIds() {
    try {
        const ids = await vault.getNotifiedIds();
        console.log(chalk.gray(`📂 Loaded ${ids.length} previously notified items from Vault`));
        return new Set(ids);
    } catch (err) {
        console.error(chalk.red('❌ Failed to load notification IDs from Vault:'), err?.response?.data || err.message);
        return new Set();
    }
}

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

    loadNotifiedIds().then((loaded) => {
        notifiedIds = loaded;
    });

    const intervalHours = parseInt(process.env.CHECK_INTERVAL_HOURS, 10) || 2;
    const intervalMs = 1000 * 60 * 60 * intervalHours;

    interval = setInterval(async () => {
        const newItems = await sendNewItemNotifications(discordClient, notifiedIds);
        
        if (newItems.length > 0) {
            try {
                await vault.saveNotifiedIds(Array.from(notifiedIds));
                console.log(chalk.green(`✅ Saved ${notifiedIds.size} notified IDs to Vault`));
            } catch (err) {
                console.error(chalk.red('❌ Failed to save notification IDs to Vault:'), err?.response?.data || err.message);
            }
        }
    }, intervalMs);

    setTimeout(async () => {
        await sendNewItemNotifications(discordClient, notifiedIds);
    }, 10000);

    console.log(chalk.green(`✅ Library notification service initialized - checking every ${intervalHours} hour(s)`));
}
