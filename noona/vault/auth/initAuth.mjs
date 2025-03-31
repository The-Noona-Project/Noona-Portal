// /noona/vault/initAuth.mjs — JWT Key Validator & Accessor (Noona-Style + Debug Enhancements)
import { printStep, printResult, printError } from '../../logger/logUtils.mjs';
import { checkKeys } from './checkKeys.mjs';

export async function initAuth() {
    printStep('[Auth] Initializing authentication module...');
    const keysValid = await checkKeys();
    if (!keysValid) {
        printError('[Auth] ❌ JWT key pair verification failed. Auth init aborted.');
        return false;
    }
    printResult('[Auth] ✅ JWT keys verified and loaded');
    return true;
}
