// /noona/vault/postVault.mjs — Standardized request to Vault API (GET or POST)
import { printStep, printDebug, printResult, printError } from '../../logger/logUtils.mjs';

/**
 * Send a standardized request to the Vault API.
 * @param {string} endpoint - The Vault endpoint (e.g. "/v1/system/token")
 * @param {object} payload - Request body for POST or query for GET
 * @param {'POST' | 'GET'} method - HTTP method (default: POST)
 * @returns {Promise<object|null>}
 */
export async function postVault(endpoint, payload = {}, method = 'POST') {
    const VAULT_URL = process.env.VAULT_URL;
    if (!VAULT_URL) {
        printError('[Vault] VAULT_URL not set in environment');
        return null;
    }

    const url = `${VAULT_URL}${endpoint}`;
    printStep(`[Vault] ${method} to Vault at ${url}...`);

    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'fromto': 'noona-portal->noona-vault',
                'time': Date.now().toString()
            }
        };

        if (method === 'POST') {
            options.body = JSON.stringify(payload);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            printError(`[Vault] Request failed: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        printResult(`[Vault] ✅ ${method} successful`);
        return data;
    } catch (err) {
        printError(`[Vault] Error during ${method} to Vault: ${err.message}`);
        return null;
    }
}
