// ✅ /noona/vaultAuth.mjs
import axios from 'axios';

const VAULT_URL = process.env.VAULT_URL || 'http://192.168.50.7:3120';

/**
 * Fetches the JWT from Vault's Redis store.
 * @returns {Promise<string|null>}
 */
export async function getVaultToken() {
    try {
        const response = await axios.get(`${VAULT_URL}/v1/system/getToken/noona-portal`);
        return response.data?.token || null;
    } catch (err) {
        console.error('[Vault] ❌ Failed to fetch JWT token from Redis:', err.response?.data || err.message);
        return null;
    }
}
