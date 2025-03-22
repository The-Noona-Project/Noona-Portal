// ✅ /noona/auth/vault.mjs — Vault token + notifications handler for Noona-Portal

import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const VAULT_URL = process.env.VAULT_URL || 'http://localhost:3120';
let cachedToken = null;

/**
 * Fetches a JWT token for this service from Vault.
 * Caches the token for use in other requests.
 */
export async function getVaultToken(service = 'noona-portal') {
    console.log('🔐 Requesting Vault token...');
    try {
        const res = await axios.get(`${VAULT_URL}/v1/system/getToken/${service}`);
        cachedToken = res.data.token;
        console.log('OK');
        return cachedToken;
    } catch (err) {
        console.error(`[Vault Auth] ❌ Failed to fetch JWT token from Vault:`, err.message);
        return null;
    }
}

/**
 * Retrieves the list of previously notified IDs for Kavita library updates.
 */
export async function getNotifiedIds() {
    if (!cachedToken) {
        console.warn(`⚠️ No cached Vault token. getVaultToken() must be called first.`);
        return [];
    }

    try {
        const res = await axios.get(`${VAULT_URL}/v1/notifications/kavita`, {
            headers: {
                Authorization: `Bearer ${cachedToken}`
            }
        });
        return res.data?.notifiedIds || [];
    } catch (err) {
        console.error(`❌ Failed to get notified IDs:`, err.message);
        return [];
    }
}

/**
 * Saves the list of newly notified IDs to Vault for persistence.
 */
export async function saveNotifiedIds(ids = []) {
    if (!cachedToken) {
        console.warn(`⚠️ No cached Vault token. getVaultToken() must be called first.`);
        return false;
    }

    try {
        await axios.post(`${VAULT_URL}/v1/notifications/kavita`, { ids }, {
            headers: {
                Authorization: `Bearer ${cachedToken}`
            }
        });
        return true;
    } catch (err) {
        console.error(`❌ Failed to save notified IDs:`, err.message);
        return false;
    }
}
