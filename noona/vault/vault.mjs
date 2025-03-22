// ✅ /noona/vault/vault.mjs — Clean Vault Token Logic (Silent, Cached)

import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const VAULT_URL = process.env.VAULT_URL || 'http://localhost:3120';
let cachedToken = null;

/**
 * Get a Vault token (from cache or from Vault endpoint).
 * @param {string} service - Name of the calling service (default: 'noona-portal')
 * @returns {Promise<string|null>}
 */
export async function getVaultToken(service = 'noona-portal') {
    if (cachedToken) return cachedToken;

    try {
        const res = await axios.get(`${VAULT_URL}/v1/system/getToken/${service}`);
        cachedToken = res.data?.token || null;
        return cachedToken;
    } catch (err) {
        return null; // Let caller handle logging
    }
}

/**
 * Get list of previously notified item IDs.
 * Requires token to have been fetched first.
 * @returns {Promise<string[]>}
 */
export async function getNotifiedIds() {
    if (!cachedToken) return [];

    try {
        const res = await axios.get(`${VAULT_URL}/v1/notifications/kavita`, {
            headers: { Authorization: `Bearer ${cachedToken}` }
        });
        return res.data?.notifiedIds || [];
    } catch {
        return [];
    }
}

/**
 * Save updated list of notified item IDs.
 * @param {string[]} ids
 * @returns {Promise<boolean>}
 */
export async function saveNotifiedIds(ids = []) {
    if (!cachedToken) return false;

    try {
        await axios.post(`${VAULT_URL}/v1/notifications/kavita`, { ids }, {
            headers: { Authorization: `Bearer ${cachedToken}` }
        });
        return true;
    } catch {
        return false;
    }
}
