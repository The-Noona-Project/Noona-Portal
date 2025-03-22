// ✅ /initmain.mjs — Noona-Portal Boot Logic (Vault-Style Themed)

import dotenv from 'dotenv';
import chalk from 'chalk';
import { printBootSummary } from './noona/utils/printBootSummary.mjs';
import { getVaultToken } from './noona/vault/vault.mjs';
import { setupDiscord } from './discord/discord.mjs';
import { setupLibraryNotifications } from './discord/tasks/libraryNotifications.mjs';
import { authenticateWithKavita } from './kavita/kavita.mjs';

dotenv.config();

let vaultToken = null;
let discordClient = null;
let kavitaStatus = false;
let shutdownInProgress = false;

function logDivider() {
    console.log(chalk.gray('────────────────────────────────────────'));
}

function logSection(title) {
    console.log(chalk.cyan(`[Init] Starting ${title}...`));
    logDivider();
}

async function gracefulShutdown(signal) {
    if (shutdownInProgress) return;
    shutdownInProgress = true;

    console.log('');
    console.log(chalk.yellow(`⚠️  Received ${signal}. Shutting down Noona-Portal...`));
    logDivider();

    try {
        if (discordClient) {
            console.log(chalk.gray('[Shutdown] Destroying Discord client...'));
            await discordClient.destroy();
            console.log(chalk.green('[Shutdown] ✅ Discord client shut down.'));
        }

        console.log(chalk.green('[Shutdown] 🧼 Cleanup complete.'));
        logDivider();
        console.log(chalk.gray('[Shutdown] Noona-Portal exited gracefully.'));
    } catch (err) {
        console.error(chalk.red('[Shutdown] ❌ Error during shutdown:'), err.message);
    } finally {
        process.exit(0);
    }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

(async () => {
    console.log('');
    console.log(chalk.bold.cyan('[Noona-Portal] 🚀 Booting up...'));
    logDivider();

    const summary = [];

    // 1. Vault Auth
    logSection('Vault Auth');
    try {
        vaultToken = await getVaultToken();
        if (vaultToken) {
            console.log(chalk.green('✅ Vault token received successfully.'));
            summary.push({ name: 'Vault Auth', info: 'Token received successfully', ready: true });
        } else {
            throw new Error('Token is null');
        }
    } catch (err) {
        summary.push({ name: 'Vault Auth', info: err.message, ready: false });
    }

    // 2. Discord Bot
    logSection('Discord Bot');
    try {
        const result = await setupDiscord();
        discordClient = result.client;
        const commandCount = result.commandCount;
        summary.push({
            name: 'Discord Bot',
            info: `Client logged in, ${commandCount} commands`,
            ready: true
        });
    } catch (err) {
        console.error(chalk.red('❌ Discord bot failed to initialize:'), err.message);
        summary.push({
            name: 'Discord Bot',
            info: err.message,
            ready: false
        });
    }

    // 3. Notification System
    logSection('Library Notification System');
    try {
        if (discordClient) {
            await setupLibraryNotifications(discordClient);
            summary.push({
                name: 'Library Notifier',
                info: 'Initialized (2hr interval)',
                ready: true
            });
        } else {
            console.log(chalk.yellow('⚠️  Discord client not ready. Notifications skipped.'));
            summary.push({
                name: 'Library Notifier',
                info: 'Skipped (no Discord client)',
                ready: false
            });
        }
    } catch (err) {
        console.error(chalk.red('❌ Notification system failed:'), err.message);
        summary.push({
            name: 'Library Notifier',
            info: err.message,
            ready: false
        });
    }

    // 4. Kavita API
    logSection('Kavita API');
    try {
        const success = await authenticateWithKavita();
        if (success) {
            console.log(chalk.green('✅ Successfully authenticated with Kavita API.'));
            kavitaStatus = true;
            summary.push({
                name: 'Kavita API',
                info: 'Authenticated successfully',
                ready: true
            });
        } else {
            throw new Error('Auth failed');
        }
    } catch (err) {
        console.error(chalk.red('❌ Kavita authentication failed:'), err.message);
        summary.push({
            name: 'Kavita API',
            info: err.message,
            ready: false
        });
    }

    // Final Boot Summary
    printBootSummary(summary);
})();
