// /noona/vault/initVault.mjs — Vault Integration Module (v1.0.1 - Redisless, PublicKey-Only)

import axios from 'axios';
import {
    printStep,
    printDebug,
    printResult,
    printError
} from '../logger/logUtils.mjs';
import { getPublicKeyFromMemory } from './auth/initAuth.mjs';
import { postVault } from './auth/postVault.mjs';

const VAULT_URL = process.env.VAULT_URL || 'http://localhost:3130';
const SERVICE_NAME = process.env.SERVICE_NAME || 'noona-portal';

/**
 * 🩺 Waits for Vault's /v2/system/health/databaseHealth endpoint
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns {Promise<boolean>}
 */
export async function waitForVaultReady(timeoutMs = 10000) {
    const start = Date.now();
    const healthEndpoint = `${VAULT_URL}/v2/system/health/databaseHealth`;

    printStep(`⏳ Waiting for Vault at ${healthEndpoint}...`);

    while (Date.now() - start < timeoutMs) {
        try {
            const res = await axios.get(healthEndpoint);
            if (res.status === 200 && res.data?.success) {
                printDebug('[Vault] ✅ Vault v2 health check passed');
                return true;
            }
        } catch {
            // retry silently
        }

        await new Promise(res => setTimeout(res, 500));
    }

    printError('[Vault] ❌ Vault did not become ready in time');
    return false;
}

/**
 * 🔓 Returns the cached public key from memory (populated by initAuth)
 * @returns {Promise<string|null>}
 */
export async function getPublicKey() {
    return getPublicKeyFromMemory();
}

/**
 * 📬 Returns minimal service headers for Vault calls (no JWT required in v1.0.1)
 * @param {string} target - Receiving service (default: 'noona-vault')
 * @returns {Promise<object>}
 */
export async function getAuthHeaders(target = 'noona-vault') {
    return {
        fromTo: `${SERVICE_NAME}::${target}`,
        timestamp: new Date().toISOString()
    };
}

/**
 * 📥 Fetches previously notified Kavita item IDs from Vault
 * @returns {Promise<string[]>}
 */
export async function getNotifiedIds() {
    const ready = await waitForVaultReady();
    if (!ready) {
        printError('[Vault] Aborting request — Vault unavailable');
        return [];
    }

    const headers = await getAuthHeaders();
    const url = `${VAULT_URL}/v2/redis/notifications/kavita`;

    printStep(`[Vault] 📥 Fetching notified IDs from ${url}`);

    try {
        const res = await axios.get(url, { headers });
        const ids = res.data?.notifiedIds || [];
        printResult(`[Vault] ✅ Retrieved ${ids.length} notified IDs`);
        return ids;
    } catch (err) {
        printError(`[Vault] ❌ Failed to get notified IDs: ${err?.response?.data?.message || err.message}`);
        return [];
    }
}

/**
 * 📤 Saves updated notified Kavita item IDs to Vault
 * @param {string[]} ids
 * @returns {Promise<boolean>}
 */
export async function saveNotifiedIds(ids = []) {
    const ready = await waitForVaultReady();
    if (!ready) {
        printError('[Vault] Aborting request — Vault unavailable');
        return false;
    }

    const url = '/v2/redis/notifications/kavita';
    printStep(`[Vault] 📤 Saving ${ids.length} notified IDs to ${url}`);

    try {
        const result = await postVault(url, { ids });
        return !!result?.success;
    } catch (err) {
        printError(`[Vault] ❌ Failed to save notified IDs: ${err?.response?.data?.message || err.message}`);
        return false;
    }
}
