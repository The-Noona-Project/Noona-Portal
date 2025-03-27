// ✅ /initmain.mjs — Noona-Portal Boot Logic (Warden-Aware, Vault-Resilient)

import { setupDiscord } from './discord/discord.mjs';
import { setupLibraryNotifications } from './discord/tasks/libraryNotifications.mjs';
import { authenticateWithKavita } from './kavita/kavita.mjs';
import { getVaultToken, waitForVaultReady } from './noona/vault/vault.mjs';
import { verifyKeys } from './noona/vault/auth.mjs';
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

const SKIP_KEY_CHECK = process.env.SKIP_KEY_CHECK === 'true';
const VAULT_URL = process.env.VAULT_URL || 'http://localhost:3120';

// ─────────────────────────────────────────────
// 🌐 Validate Environment Variables
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
// 🌙 Runtime State
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

    // 1. 📡 Vault Availability Check
    printStep('📡 Checking Vault availability...');
    let vaultReachable = false;
    try {
        vaultReachable = await waitForVaultReady();
        if (vaultReachable) {
            printResult('✅ Vault is online.');
            summary.push({ name: 'Vault Connection', info: 'Responding at /health', ready: true });
        } else {
            throw new Error('Timeout or network failure');
        }
    } catch (err) {
        printError(`❌ Vault check failed: ${err.message}`);
        summary.push({ name: 'Vault Connection', info: err.message, ready: false });
    }

    // 2. 🔐 JWT Key Pair Check
    printStep('🔐 Verifying JWT key pair...');
    try {
        const keysOk = await verifyKeys();
        if (keysOk) {
            summary.push({ name: 'JWT Keys', info: 'Key pair is valid', ready: true });
        } else {
            throw new Error('Key pair mismatch or invalid');
        }
    } catch (err) {
        printError(`❌ JWT Key check failed: ${err.message}`);
        summary.push({ name: 'JWT Keys', info: err.message, ready: false });
    }

    // 3. 🗝️ Vault Token Fetch (optional in dev)
    printStep('🔑 Getting Vault token from Redis...');
    try {
        vaultToken = await getVaultToken();
        if (vaultToken) {
            printResult('✅ Vault token retrieved.');
            summary.push({ name: 'Vault Auth', info: 'Token loaded from Redis', ready: true });
        } else {
            throw new Error('Token is null');
        }
    } catch (err) {
        printError(`❌ Vault token failed: ${err.message}`);
        summary.push({ name: 'Vault Auth', info: err.message, ready: false });
    }

    // 4. 📚 Kavita API
    printStep('📚 Authenticating with Kavita...');
    try {
        const success = await authenticateWithKavita();
        if (success) {
            printResult('✅ Kavita authentication successful.');
            summary.push({ name: 'Kavita API', info: 'Authenticated successfully', ready: true });
        } else {
            throw new Error('Authentication failed');
        }
    } catch (err) {
        printError(`❌ Kavita auth failed: ${err.message}`);
        summary.push({ name: 'Kavita API', info: err.message, ready: false });
    }

    // 5. 🤖 Discord Bot
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

    // 6. 🔔 Library Notifications
    printStep('🔔 Initializing notification service...');
    try {
        if (discordClient) {
            await setupLibraryNotifications(discordClient);
            const interval = process.env.CHECK_INTERVAL_HOURS || '2';
            printDebug(`CHECK_INTERVAL_HOURS=${interval} [NODE_ENV: ${process.env.NODE_ENV}]`);
            summary.push({
                name: 'Library Notifier',
                info: `Initialized (interval: ${interval}hr)`,
                ready: true
            });
        } else {
            throw new Error('Skipped (no Discord client)');
        }
    } catch (err) {
        printError(`❌ Library notifier failed: ${err.message}`);
        summary.push({ name: 'Library Notifier', info: err.message, ready: false });
    }

    // ✅ Final Summary
    printBootSummary(summary);
})();
