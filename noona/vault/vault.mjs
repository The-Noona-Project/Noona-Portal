// ✅ /noona/vault/vault.mjs — Clean Vault Token Logic (Silent, Cached)

import axios from 'axios';
import dotenv from 'dotenv';
import chalk from 'chalk';
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
        console.log(`Attempting to connect to Vault at: ${VAULT_URL}/v1/system/getToken/${service}`);
        const res = await axios.get(`${VAULT_URL}/v1/system/getToken/${service}`);
        
        if (!res.data?.token) {
            console.error('[Vault] Received empty token from Vault service');
            return null;
        }
        
        cachedToken = res.data.token;
        return cachedToken;
    } catch (err) {
        console.error('[Vault] Connection error:', err.message);
        if (err.response) {
            console.error('[Vault] Response status:', err.response.status);
            console.error('[Vault] Response data:', err.response.data);
        }
        return null;
    }
}

/**
 * Get list of previously notified item IDs.
 * Requires token to have been fetched first.
 * @returns {Promise<string[]>}
 */
export async function getNotifiedIds() {
    if (!cachedToken) {
        console.error(chalk.red('❌ No token available for getNotifiedIds'));
        return [];
    }

    try {
        const res = await axios.get(`${VAULT_URL}/v1/notifications/kavita`, {
            headers: { Authorization: `Bearer ${cachedToken}` }
        });
        return res.data?.notifiedIds || [];
    } catch (err) {
        console.error(chalk.red('❌ Failed to get notified IDs:'), err?.response?.data || err.message);
        return [];
    }
}

/**
 * Save updated list of notified item IDs.
 * @param {string[]} ids
 * @returns {Promise<boolean>}
 */
export async function saveNotifiedIds(ids = []) {
    if (!cachedToken) {
        console.error(chalk.red('❌ No token available for saveNotifiedIds'));
        return false;
    }

    try {
        await axios.post(`${VAULT_URL}/v1/notifications/kavita`, { ids }, {
            headers: { Authorization: `Bearer ${cachedToken}` }
        });
        return true;
    } catch (err) {
        console.error(chalk.red('❌ Failed to save notified IDs:'), err?.response?.data || err.message);
        return false;
    }
}
