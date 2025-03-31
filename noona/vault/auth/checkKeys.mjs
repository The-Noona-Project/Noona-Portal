// /noona/vault/checkKeys.mjs — Verifies private/public JWT key pair
import jwt from 'jsonwebtoken';
import { printStep, printError, printDebug } from '../../logger/logUtils.mjs';
import { getPublicKey } from './getPublicKey.mjs';

export async function checkKeys() {
    printStep('[Auth] Verifying JWT key pair...');

    const privateKey = process.env.JWT_PRIVATE_KEY;
    if (!privateKey) {
        printError('[Auth] Private key is missing in environment');
        return false;
    }
    printDebug('[Auth] Loaded private key from environment');

    const publicKey = await getPublicKey();
    if (!publicKey) {
        printError('[Auth] Public key could not be retrieved from Vault');
        return false;
    }

    try {
        const testToken = jwt.sign(
            { sub: 'noona-test', scope: 'verify' },
            privateKey,
            { algorithm: 'RS256', expiresIn: '5m' }
        );

        const decoded = jwt.verify(testToken, publicKey, { algorithms: ['RS256'] });
        printDebug(`[Auth] JWT test token verified: ${decoded.sub}`);
        return true;
    } catch (err) {
        printError(`[Auth] JWT key verification failed: ${err.message}`);
        return false;
    }
}
