// ✅ /noona/vault/vault.mjs — Redis-Native Vault Integration for Noona-Portal

import axios from 'axios';
import { createClient } from 'redis';
import {
    printStep,
    printDebug,
    printResult,
    printError
} from '../logger/logUtils.mjs';

const VAULT_URL = process.env.VAULT_URL || 'http://localhost:3120';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const SERVICE_NAME = 'noona-portal';

let cachedToken = null;
let cachedPublicKey = null;

/**
 * 🕒 Utility to wait until Vault HTTP server is up (max 10 seconds).
 */
async function waitForVaultReady(timeoutMs = 10000) {
    const start = Date.now();
    printStep(`⏳ Waiting for Vault to become ready at ${VAULT_URL}...`);

    while (Date.now() - start < timeoutMs) {
        try {
            await axios.get(`${VAULT_URL}/v1/system/health`);
            printDebug('Vault is reachable');
            return true;
        } catch {
            await new Promise(res => setTimeout(res, 500));
        }
    }

    printError('❌ Vault did not become ready in time');
    return false;
}

/**
 * 🔑 Fetch JWT token for Noona-Portal from Redis directly.
 */
export async function getVaultToken() {
    if (cachedToken) {
        printDebug('[Vault] Using cached Vault token');
        return cachedToken;
    }

    const client = createClient({ url: REDIS_URL });
    printStep(`🧠 Connecting to Redis at ${REDIS_URL} to fetch token for ${SERVICE_NAME}`);

    try {
        await client.connect();
        const token = await client.get(`NOONA:TOKEN:${SERVICE_NAME}`);

        if (!token) {
            printError('[Vault] ❌ Token not found in Redis');
            return null;
        }

        cachedToken = token;
        printResult('[Vault] ✅ Vault token loaded from Redis');
        return token;
    } catch (err) {
        printError('[Vault] ❌ Redis token fetch failed:', err.message);
        return null;
    } finally {
        await client.disconnect();
        printDebug('[Vault] Redis client disconnected');
    }
}

/**
 * 🔓 Get the public JWT key from Redis (set by Warden).
 */
export async function getPublicKey() {
    if (cachedPublicKey) {
        printDebug('[Vault] Using cached public key');
        return cachedPublicKey;
    }

    const client = createClient({ url: REDIS_URL });
    printStep(`🔐 Connecting to Redis at ${REDIS_URL} to fetch public JWT key`);

    try {
        await client.connect();
        const key = await client.get('NOONA:JWT:PUBLIC_KEY');

        if (!key) {
            printError('[Vault] ❌ Public key not found in Redis');
            return null;
        }

        cachedPublicKey = key;
        printResult('[Vault] ✅ Public key loaded from Redis');
        return cachedPublicKey;
    } catch (err) {
        printError('[Vault] ❌ Redis public key fetch failed:', err.message);
        return null;
    } finally {
        await client.disconnect();
        printDebug('[Vault] Redis client disconnected');
    }
}

/**
 * 📬 Returns headers for internal Noona-to-Noona auth communication.
 */
export async function getAuthHeaders(target = 'noona-vault') {
    const jwt = await getVaultToken();
    if (!jwt) {
        printError('[Vault] ❌ No JWT token available for auth headers');
        return {};
    }

    return {
        Authorization: `Bearer ${jwt}`,
        fromTo: `${SERVICE_NAME}::${target}`,
        timestamp: new Date().toISOString(),
        jwt // legacy field for older consumers
    };
}

/**
 * 📥 Retrieve list of previously notified Kavita item IDs.
 */
export async function getNotifiedIds() {
    const ready = await waitForVaultReady();
    if (!ready) return [];

    const headers = await getAuthHeaders();
    const url = `${VAULT_URL}/v1/notifications/kavita`;

    printStep(`📥 Fetching notified IDs from ${url}`);

    try {
        const res = await axios.get(url, { headers });
        printResult(`[Vault] ✅ Retrieved ${res.data?.notifiedIds?.length || 0} notified IDs`);
        return res.data?.notifiedIds || [];
    } catch (err) {
        printError('[Vault] ❌ Failed to get notified IDs:', err?.response?.data || err.message);
        return [];
    }
}

/**
 * 📤 Save updated list of notified item IDs to Vault.
 */
export async function saveNotifiedIds(ids = []) {
    const ready = await waitForVaultReady();
    if (!ready) return false;

    const headers = await getAuthHeaders();
    const url = `${VAULT_URL}/v1/notifications/kavita`;

    printStep(`📤 Saving ${ids.length} notified IDs to ${url}`);

    try {
        await axios.post(url, { ids }, { headers });
        printResult('[Vault] ✅ Notified IDs saved successfully');
        return true;
    } catch (err) {
        printError('[Vault] ❌ Failed to save notified IDs:', err?.response?.data || err.message);
        return false;
    }
}
