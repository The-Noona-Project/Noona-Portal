/**
 * @fileoverview
 * Key Pair Verifier — Ensures JWT private/public keys are valid
 *
 * Uses a test token to validate the private key can sign and
 * the public key can verify that signature.
 *
 * @module checkKeys
 */

import jwt from 'jsonwebtoken';
import { printStep, printResult, printError } from '../../logger/logUtils.mjs';

/**
 * Verifies a private/public key pair by signing a test token and verifying it.
 *
 * @param {string} privateKey - The RSA private key
 * @param {string} publicKey - The RSA public key
 * @returns {Promise<boolean>} True if valid, false if signature fails
 */
export async function checkKeyPair(privateKey, publicKey) {
    printStep('[Auth] Verifying JWT key pair...');

    const testPayload = {
        test: true,
        iat: Math.floor(Date.now() / 1000)
    };

    try {
        const token = jwt.sign(testPayload, privateKey, { algorithm: 'RS256', expiresIn: '1m' });

        jwt.verify(token, publicKey, { algorithms: ['RS256'] });

        printResult('[Auth] ✅ JWT key verification passed');
        return true;
    } catch (err) {
        printError(`[Auth] ❌ JWT key verification failed: ${err.message}`);
        return false;
    }
}
