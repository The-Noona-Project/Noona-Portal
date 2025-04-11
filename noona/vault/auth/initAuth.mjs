// /noona/vault/initAuth.mjs — JWT Key Loader & Verifier (Runtime Ready)
import { printStep, printResult, printError } from '../../logger/logUtils.mjs';
import { checkKeyPair } from './checkKeys.mjs';
import { fetchPublicKeyFromVault } from './getPublicKey.mjs';

let publicKeyInMemory = null;

export async function initAuth() {
    printStep('[Auth] Initializing authentication module...');

    const privateKey = process.env.JWT_PRIVATE_KEY;
    if (!privateKey) {
        printError('[Auth] ❌ Private key not found in environment');
        return false;
    }

    const fetchedPublicKey = await fetchPublicKeyFromVault();
    if (!fetchedPublicKey) {
        printError('[Auth] ❌ Failed to retrieve public key from Vault');
        return false;
    }

    const isValid = await checkKeyPair(privateKey, fetchedPublicKey);
    if (!isValid) {
        printError('[Auth] ❌ JWT key pair failed verification');
        return false;
    }

    publicKeyInMemory = fetchedPublicKey;
    printResult('[Auth] ✅ JWT keys verified and stored in memory');
    return true;
}

/**
 * Getter for the currently loaded public key (after init).
 */
export function getPublicKeyFromMemory() {
    return publicKeyInMemory;
}
