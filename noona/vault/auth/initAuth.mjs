// ✅ /noona/vault/auth/initAuth.mjs — Public-Key Auth Logic for Noona-Portal

import axios from 'axios';
import { printStep, printDebug, printResult, printError } from '../../logger/logUtils.mjs';

const VAULT_URL = process.env.VAULT_URL || 'http://noona-vault:3120';
const SERVICE_NAME = process.env.SERVICE_NAME || 'noona-portal';

let cachedPublicKey = null;
let authMode = 'unknown'; // 'public' | 'token' | 'fail'

/**
 * Initializes the public key auth flow by requesting a new key from Vault.
 * Result is cached in memory.
 *
 * @returns {Promise<boolean>} True if key fetched and verified, false otherwise.
 */
export async function initAuth() {
    printStep('[Auth] Initializing authentication module...');

    const url = `${VAULT_URL}/v2/redis/publicKey/create`;

    try {
        printStep(`[Vault] POST to Vault at ${url}...`);
        const res = await axios.post(url, {
            service: SERVICE_NAME
        });

        const key = res?.data?.publicKey;

        if (!key || !key.startsWith('-----BEGIN PUBLIC KEY-----')) {
            printError('[Auth] ❌ Invalid public key received from Vault');
            authMode = 'fail';
            return false;
        }

        cachedPublicKey = key;
        authMode = 'public';

        printDebug('[Auth] ✅ Fetched and received public key from Vault');
        printResult('[Auth] ✅ Public key stored for JWT verification');
        return true;
    } catch (err) {
        printError('[Vault] Error during POST to Vault: ' + (err?.message || 'Unknown Error'));
        printError('[Auth] ❌ Failed to retrieve public key from Vault');
        authMode = 'fail';
        return false;
    }
}

/**
 * Returns the currently cached public key string.
 *
 * @returns {string|null}
 */
export function getPublicKeyFromMemory() {
    return cachedPublicKey;
}

/**
 * Returns the current auth mode (public, token, fail, unknown).
 *
 * @returns {string}
 */
export function getAuthMode() {
    return authMode;
}
