import axios from 'axios';
import { createClient } from 'redis';
import { printStep, printDebug, printResult, printError } from '../logger/logUtils.mjs';
import { getPublicKey as fetchPublicKey } from './auth/getPublicKey.mjs';
import { postVault } from './auth/postVault.mjs';

const VAULT_URL = process.env.VAULT_URL || 'http://localhost:3120';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const SERVICE_NAME = process.env.SERVICE_NAME || 'noona-portal';

let cachedToken = null;

/**
 * 🕒 Wait for Vault to respond at /v1/system/health
 */
export async function waitForVaultReady(timeoutMs = 10000) {
    const start = Date.now();
    printStep(`⏳ Waiting for Vault to become ready at ${VAULT_URL}...`);
    while (Date.now() - start < timeoutMs) {
        try {
            await axios.get(`${VAULT_URL}/v1/system/health`);
            printDebug('[Vault] Health check succeeded');
            return true;
        } catch {
            await new Promise(res => setTimeout(res, 500));
        }
    }
    printError('[Vault] ❌ Vault did not become ready in time');
    return false;
}

/**
 * 🔑 Fetch Vault-issued token from Redis for this service
 */
export async function getVaultToken() {
    if (cachedToken) {
        printDebug('[Vault] Using cached Vault token');
        return cachedToken;
    }

    const client = createClient({ url: REDIS_URL });
    const key = `NOONA:TOKEN:${SERVICE_NAME}`;
    printStep(`[Vault] 🧠 Connecting to Redis at ${REDIS_URL} to fetch token for ${SERVICE_NAME}`);

    try {
        await client.connect();
        const token = await client.get(key);

        if (!token) {
            printError(`[Vault] ❌ Token not found in Redis at key: ${key}`);
            return null;
        }

        cachedToken = token;
        printResult('[Vault] ✅ Vault token loaded from Redis');
        return token;
    } catch (err) {
        printError(`[Vault] ❌ Redis token fetch failed: ${err.message}`);
        return null;
    } finally {
        await client.disconnect();
        printDebug('[Vault] Redis client disconnected');
    }
}

/**
 * 🔓 Expose cached public key (delegates to auth/getPublicKey.mjs)
 */
export async function getPublicKey() {
    return await fetchPublicKey();
}

/**
 * 📬 Generate internal service-to-service headers
 */
export async function getAuthHeaders(target = 'noona-vault') {
    const jwtToken = await getVaultToken();
    if (!jwtToken) {
        printError('[Vault] ❌ No JWT token available — cannot create auth headers');
        return {};
    }

    const headers = {
        Authorization: `Bearer ${jwtToken}`,
        fromTo: `${SERVICE_NAME}::${target}`,
        timestamp: new Date().toISOString(),
        jwt: jwtToken // legacy support
    };

    printDebug(`[Vault] Generated auth headers for ${SERVICE_NAME} → ${target}`);
    return headers;
}

/**
 * 📥 Load previously notified Kavita item IDs from Vault
 */
export async function getNotifiedIds() {
    const ready = await waitForVaultReady();
    if (!ready) {
        printError('[Vault] Aborting request — Vault unavailable');
        return [];
    }

    const headers = await getAuthHeaders();
    const url = `${VAULT_URL}/v1/notifications/kavita`;

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
 * 📤 Save updated list of notified item IDs back to Vault
 */
export async function saveNotifiedIds(ids = []) {
    const ready = await waitForVaultReady();
    if (!ready) {
        printError('[Vault] Aborting request — Vault unavailable');
        return false;
    }

    const url = '/v1/notifications/kavita';
    printStep(`[Vault] 📤 Saving ${ids.length} notified IDs to ${url}`);

    try {
        const result = await postVault(url, { ids });
        return !!result?.success;
    } catch (err) {
        printError(`[Vault] ❌ Failed to save notified IDs: ${err?.response?.data?.message || err.message}`);
        return false;
    }
}
