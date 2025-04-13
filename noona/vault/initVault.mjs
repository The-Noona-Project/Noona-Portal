/**
 * @fileoverview
 * /noona/vault/initVault.mjs — Vault Integration Module
 * v2.0.0 — MongoDB, HTTP-Only, PublicKey-Only
 *
 * Handles Vault health checks, public key fetch, and MongoDB-backed storage for notifications.
 *
 * @module vault/initVault
 */

import axios from 'axios';
import {
    printStep,
    printDebug,
    printResult,
    printError
} from '../logger/logUtils.mjs';
import { getPublicKeyFromMemory } from './auth/initAuth.mjs';
import { postVault } from './auth/postVault.mjs';

const VAULT_URL = process.env.VAULT_URL || 'http://localhost:3120';
const SERVICE_NAME = process.env.SERVICE_NAME || 'noona-portal';

/**
 * 🩺 Waits for Vault's health check endpoint to confirm readiness.
 *
 * @function waitForVaultReady
 * @param {number} [timeoutMs=10000] - Timeout duration in milliseconds.
 * @returns {Promise<boolean>} - Resolves true if Vault is ready, false otherwise.
 */
export async function waitForVaultReady(timeoutMs = 10000) {
    const start = Date.now();
    const healthEndpoint = `${VAULT_URL}/v2/system/health/databaseHealth`;

    printStep(`⏳ Waiting for Vault at ${healthEndpoint}...`);

    while (Date.now() - start < timeoutMs) {
        try {
            const res = await axios.get(healthEndpoint);

            if (res.status === 200 && typeof res.data === 'object') {
                const { mongo, redis, mariadb } = res.data;

                const allOnline = [mongo, redis, mariadb].every(db =>
                    db?.status?.toLowerCase() === 'online'
                );

                if (allOnline) {
                    printDebug('[Vault] ✅ Vault v2 health check passed (all DBs online)');
                    return true;
                }
            }
        } catch {
            // silent retry
        }

        await new Promise(res => setTimeout(res, 500));
    }

    printError('[Vault] ❌ Vault did not become ready in time');
    return false;
}

/**
 * 🔓 Returns the cached public key from memory (set during initAuth).
 *
 * @function getPublicKey
 * @returns {Promise<string|null>} - The public key string or null if unavailable.
 */
export async function getPublicKey() {
    return getPublicKeyFromMemory();
}

/**
 * 📬 Constructs authorization headers for Vault requests.
 *
 * @function getAuthHeaders
 * @param {string} [target='noona-vault'] - The receiving service name.
 * @returns {Promise<object>} - Standardized headers used for Vault API communication.
 */
export async function getAuthHeaders(target = 'noona-vault') {
    return {
        fromTo: `${SERVICE_NAME}::${target}`,
        timestamp: new Date().toISOString()
    };
}

/**
 * 📥 Fetches previously notified Kavita item IDs from Vault (via MongoDB).
 *
 * @function getNotifiedIds
 * @returns {Promise<string[]>} - Array of previously notified IDs, or empty if failed.
 */
export async function getNotifiedIds() {
    const ready = await waitForVaultReady();
    if (!ready) {
        printError('[Vault] Aborting request — Vault unavailable');
        return [];
    }

    const headers = await getAuthHeaders();
    const url = `${VAULT_URL}/v2/mongodb/notifications/read`;

    printStep(`[Vault] 📥 Reading notified IDs from ${url}`);

    try {
        const res = await axios.post(
            url,
            {
                database: 'mongodb',
                collection: 'notifications',
                action: 'read',
                payload: { source: 'kavita' }
            },
            { headers }
        );

        const ids = res.data?.ids ?? [];
        printResult(`[Vault] ✅ Retrieved ${ids.length} notified IDs`);
        return ids;
    } catch (err) {
        printError(`[Vault] ❌ Failed to read notified IDs: ${err?.response?.data?.message || err.message}`);
        return [];
    }
}

/**
 * 📤 Saves updated notified Kavita item IDs to Vault (via MongoDB).
 *
 * @function saveNotifiedIds
 * @param {string[]} ids - Array of Kavita item IDs to persist to Vault.
 * @returns {Promise<boolean>} - True if successful, false if an error occurred.
 */
export async function saveNotifiedIds(ids = []) {
    const ready = await waitForVaultReady();
    if (!ready) {
        printError('[Vault] Aborting request — Vault unavailable');
        return false;
    }

    const headers = await getAuthHeaders();
    const url = `${VAULT_URL}/v2/mongodb/notifications/update`;

    printStep(`[Vault] 📤 Updating notified IDs via ${url}`);

    try {
        const res = await axios.post(
            url,
            {
                database: 'mongodb',
                collection: 'notifications',
                action: 'update',
                payload: {
                    source: 'kavita',
                    ids
                }
            },
            { headers }
        );

        printResult('[Vault] ✅ Notified IDs updated successfully');
        return res.data?.success === true;
    } catch (err) {
        printError(`[Vault] ❌ Failed to update notified IDs: ${err?.response?.data?.message || err.message}`);
        return false;
    }
}
