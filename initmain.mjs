/**
 * @fileoverview
 * Noona-Portal Boot Logic (v1.0.2)
 *
 * Starts the Portal service with resilience checks for:
 * - Vault availability and public key sync
 * - Kavita API authentication
 * - Discord bot setup
 * - Library notification service
 * - Graceful shutdown handling
 *
 * @module initmain
 */

import { setupDiscord } from './discord/initDiscord.mjs';
import { setupLibraryNotifications } from './discord/tasks/libraryNotifications.mjs';
import { authenticateWithKavita } from './kavita/initKavita.mjs';
import { waitForVaultReady } from './noona/vault/initVault.mjs';
import { initAuth } from './noona/vault/auth/initAuth.mjs';
import { printBootSummary } from './noona/logger/printBootSummary.mjs';
import {
    printHeader,
    printStep,
    printResult,
    printError,
    printDebug,
    printDivider,
    printSection
} from './noona/logger/logUtils.mjs';
import { validateEnv } from './noona/logger/validateEnv.mjs';

const SKIP_KEY_CHECK = process.env.SKIP_KEY_CHECK === 'true';
const VAULT_URL = process.env.VAULT_URL || 'http://localhost:3120';

// ─────────────────────────────────────────────
// 🧪 Validate Environment Variables
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
let discordClient = null;
let shutdownInProgress = false;

// ─────────────────────────────────────────────
// 💥 Graceful Shutdown
// ─────────────────────────────────────────────

/**
 * Handles termination signals and cleanly shuts down Discord bot.
 * @param {string} signal - OS signal string
 */
async function gracefulShutdown(signal) {
    if (shutdownInProgress) return;
    shutdownInProgress = true;

    printDivider();
    printStep(`⚠️  Received ${signal}. Shutting down Noona-Portal...`);

    try {
        if (discordClient) {
            printStep('🧼 Destroying Discord client...');
            await discordClient.destroy();
            printResult('✅ Discord client shut down.');
        }

        printResult('🌙 Cleanup complete.');
    } catch (err) {
        printError(`❌ Error during shutdown: ${err.message}`);
    } finally {
        printDivider();
        printResult('👋 Noona-Portal exited gracefully.');
        process.exit(0);
    }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ─────────────────────────────────────────────
// 🚀 Main Boot Sequence
// ─────────────────────────────────────────────
(async () => {
    console.log('');
    printHeader('Noona-Portal');
    printSection('🛠️ Initializing Portal Environment...');

    const summary = [];

    // 1. 📡 Vault Availability Check
    printStep('📡 Checking Vault availability...');
    try {
        const vaultReady = await waitForVaultReady();
        if (!vaultReady) throw new Error('Timeout or network failure');
        printResult('✅ Vault is online.');
        summary.push({ name: 'Vault Connection', info: 'Responding at /health', ready: true });
    } catch (err) {
        printError(`❌ Vault check failed: ${err.message}`);
        summary.push({ name: 'Vault Connection', info: err.message, ready: false });
    }

    // 2. 🔐 Initialize Auth (includes publicKey fetch + pair check)
    printStep('🔐 Initializing Auth...');
    try {
        const authReady = await initAuth();
        if (!authReady) throw new Error('Auth setup failed');
        printResult('✅ Auth system initialized');
        summary.push({ name: 'Auth', info: 'JWT keys verified and cached', ready: true });
    } catch (err) {
        printError(`❌ Auth init failed: ${err.message}`);
        summary.push({ name: 'Auth', info: err.message, ready: false });
    }

    // 3. 🔑 Vault Auth (No longer uses token — now tracked via public key only)
    printStep('🔑 Skipping Vault token logic (public-key-only system)');
    summary.push({ name: 'Vault Auth', info: 'Token removed — using publicKey only', ready: false });

    // 4. 📚 Kavita Authentication
    printStep('📚 Authenticating with Kavita...');
    try {
        const success = await authenticateWithKavita();
        if (!success) throw new Error('Authentication failed');
        printResult('✅ Kavita authentication successful.');
        summary.push({ name: 'Kavita API', info: 'Authenticated successfully', ready: true });
    } catch (err) {
        printError(`❌ Kavita auth failed: ${err.message}`);
        summary.push({ name: 'Kavita API', info: err.message, ready: false });
    }

    // 5. 🤖 Discord Bot Startup
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

    // 6. 🔔 Notification Scheduler
    printStep('🔔 Initializing notification service...');
    try {
        if (!discordClient) throw new Error('Skipped (no Discord client)');
        await setupLibraryNotifications(discordClient);
        const interval = process.env.CHECK_INTERVAL_HOURS || '168';
        printDebug(`CHECK_INTERVAL_HOURS=${interval} [NODE_ENV: ${process.env.NODE_ENV}]`);
        summary.push({
            name: 'Library Notifier',
            info: `Initialized (interval: ${interval}hr)`,
            ready: true
        });
    } catch (err) {
        printError(`❌ Library notifier failed: ${err.message}`);
        summary.push({ name: 'Library Notifier', info: err.message, ready: false });
    }

    // ✅ Boot Summary Table
    printBootSummary(summary);
})();
