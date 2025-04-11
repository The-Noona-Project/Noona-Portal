// /noona/vault/getPublicKey.mjs — Fetches public key from Vault v2
import { printDebug, printError } from '../../logger/logUtils.mjs';
import { postVault } from './postVault.mjs';

/**
 * Fetches a public key from Vault for this service (noona-portal).
 * @returns {Promise<string|null>}
 */
export async function fetchPublicKeyFromVault() {
    const endpoint = '/v2/redis/publicKey/create';
    const payload = { service: 'noona-portal' };

    try {
        const result = await postVault(endpoint, payload, 'POST');
        if (!result?.success || !result.publicKey) {
            printError('[Auth] Failed to fetch public key: invalid response');
            return null;
        }

        printDebug('[Auth] ✅ Fetched and received public key from Vault');
        return result.publicKey;
    } catch (err) {
        printError(`[Auth] Error fetching public key from Vault: ${err.message}`);
        return null;
    }
}
