// ✅ /initmain.mjs — Noona-Portal Boot Logic (Warden-Aware, Redis-Based Vault Auth)

import { setupDiscord } from './discord/discord.mjs';
import { setupLibraryNotifications } from './discord/tasks/libraryNotifications.mjs';
import { authenticateWithKavita } from './kavita/kavita.mjs';
import { getVaultToken } from './noona/vault/vault.mjs';
import { printBootSummary } from './noona/logger/printBootSummary.mjs';
import {
    printHeader,
    printStep,
    printResult,
    printError,
    printDebug,
    printDivider
} from './noona/logger/logUtils.mjs';
import { validateEnv } from './noona/logger/validateEnv.mjs';

// ─────────────────────────────────────────────
// 🧪 Validate Env First
// ─────────────────────────────────────────────
validateEnv(
    [
        'KAVITA_URL',
        'KAVITA_API_KEY',
        'KAVITA_LIBRARY_IDS',
        'DISCORD_TOKEN',
        'DISCORD_CLIENT_ID',
        'REQUIRED_GUILD_ID',
        'REQUIRED_ROLE_ADMIN',
        'REQUIRED_ROLE_MOD',
        'REQUIRED_ROLE_USER',
        'NOTIFICATION_CHANNEL_ID',
        'VAULT_URL',
        'JWT_PRIVATE_KEY',
        'PORTAL_PORT'
    ],
    ['CHECK_INTERVAL_HOURS', 'KAVITA_LOOKBACK_HOURS']
);

// ─────────────────────────────────────────────
// 🌙 Boot State Vars
// ─────────────────────────────────────────────
let vaultToken = null;
let discordClient = null;
let shutdownInProgress = false;

// ─────────────────────────────────────────────
// 💥 Graceful Shutdown
// ─────────────────────────────────────────────
async function gracefulShutdown(signal) {
    if (shutdownInProgress) return;
    shutdownInProgress = true;

    printDivider();
    printStep(`⚠️  Received ${signal}. Shutting down Noona-Portal...`);

    try {
        if (discordClient) {
            printStep('Destroying Discord client...');
            await discordClient.destroy();
            printResult('✅ Discord client shut down.');
        }

        printResult('🧼 Cleanup complete.');
        printDivider();
        printResult('🌙 Noona-Portal exited gracefully.');
    } catch (err) {
        printError(`❌ Error during shutdown: ${err.message}`);
    } finally {
        process.exit(0);
    }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ─────────────────────────────────────────────
// 🚀 Main Boot
// ─────────────────────────────────────────────
(async () => {
    console.log('');
    printHeader('Noona-Portal');

    const summary = [];

    // 1. 🔐 Vault Token (from Redis)
    printStep('🔐 Getting Vault token...');
    try {
        vaultToken = await getVaultToken();
        if (vaultToken) {
            printResult('✅ Vault token received.');
            summary.push({ name: 'Vault Auth', info: 'Token retrieved via Redis', ready: true });
        } else {
            throw new Error('Token is null');
        }
    } catch (err) {
        printError(`❌ Vault token failed: ${err.message}`);
        summary.push({ name: 'Vault Auth', info: err.message, ready: false });
    }

    // 2. 🤖 Discord Bot
    printStep('🤖 Starting Discord bot...');
    try {
        const result = await setupDiscord();
        discordClient = result.client;
        summary.push({
            name: 'Discord Bot',
            info: `Client logged in (${result.commandCount} commands)`,
            ready: true
        });
    } catch (err) {
        printError(`❌ Discord bot init failed: ${err.message}`);
        summary.push({ name: 'Discord Bot', info: err.message, ready: false });
    }

    // 3. 🔔 Library Notifications
    printStep('🔔 Setting up notification system...');
    try {
        if (discordClient) {
            await setupLibraryNotifications(discordClient);
            const interval = process.env.CHECK_INTERVAL_HOURS || '2';
            printDebug(`Using CHECK_INTERVAL_HOURS=${interval}`);
            summary.push({
                name: 'Library Notifier',
                info: `Initialized (interval: ${interval}hr)`,
                ready: true
            });
        } else {
            summary.push({
                name: 'Library Notifier',
                info: 'Skipped (no Discord client)',
                ready: false
            });
        }
    } catch (err) {
        printError(`❌ Library Notifier failed: ${err.message}`);
        summary.push({ name: 'Library Notifier', info: err.message, ready: false });
    }

    // 4. 📚 Kavita Auth
    printStep('📚 Authenticating with Kavita...');
    try {
        const success = await authenticateWithKavita();
        if (success) {
            printResult('✅ Authenticated with Kavita.');
            summary.push({
                name: 'Kavita API',
                info: 'Authenticated successfully',
                ready: true
            });
        } else {
            throw new Error('Authentication failed');
        }
    } catch (err) {
        printError(`❌ Kavita auth failed: ${err.message}`);
        summary.push({ name: 'Kavita API', info: err.message, ready: false });
    }

    // ✅ Final Summary Table
    printBootSummary(summary);
})();
