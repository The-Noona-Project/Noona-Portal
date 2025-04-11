// /noona/vault/checkKeys.mjs — Verifies private/public JWT key pair
import jwt from 'jsonwebtoken';
import { printStep, printError, printDebug } from '../../logger/logUtils.mjs';

/**
 * Validates the private/public key pair using a signed test token.
 * @param {string} privateKey
 * @param {string} publicKey
 * @returns {Promise<boolean>}
 */
export async function checkKeyPair(privateKey, publicKey) {
    printStep('[Auth] Verifying JWT key pair...');

    if (!privateKey || !publicKey) {
        printError('[Auth] ❌ One or both keys are missing');
        return false;
    }

    try {
        const testToken = jwt.sign(
            { sub: 'noona-test', scope: 'verify' },
            privateKey,
            { algorithm: 'RS256', expiresIn: '5m' }
        );

        const decoded = jwt.verify(testToken, publicKey, { algorithms: ['RS256'] });
        printDebug(`[Auth] ✅ JWT key pair valid — test token: ${decoded.sub}`);
        return true;
    } catch (err) {
        printError(`[Auth] ❌ JWT key verification failed: ${err.message}`);
        return false;
    }
}
