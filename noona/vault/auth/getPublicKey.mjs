// /noona/vault/getPublicKey.mjs — Fetches public key from Vault system route
import { printDebug, printError } from '../../logger/logUtils.mjs';
import { postVault } from './postVault.mjs';

export async function getPublicKey() {
    const endpoint = '/v1/system/token';

    try {
        const result = await postVault(endpoint, {}, 'GET');
        if (!result?.success || !result.publicKey) {
            printError('[Auth] Failed to fetch public key: invalid response');
            return null;
        }

        printDebug('[Auth] Fetched public key from Vault');
        return result.publicKey;
    } catch (err) {
        printError(`[Auth] Error fetching public key from Vault: ${err.message}`);
        return null;
    }
}
