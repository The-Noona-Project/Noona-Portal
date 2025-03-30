// /noona/vault/auth.mjs — JWT Key Validator & Accessor (Noona-Style + Debug Enhancements)

import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import {
    printStep,
    printDebug,
    printResult,
    printError
} from '../logger/logUtils.mjs';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const SKIP_KEY_CHECK = process.env.SKIP_KEY_CHECK === 'true';

let cachedPublicKey = null;
let cachedPrivateKey = null;

/**
 * 🔓 Get the public key from Redis (or fallback to env)
 */
export async function getPublicKey() {
    if (cachedPublicKey) {
        printDebug('[Auth] Using cached public key');
        return cachedPublicKey;
    }

    if (process.env.JWT_PUBLIC_KEY) {
        printDebug('[Auth] Loaded public key from env');
        cachedPublicKey = process.env.JWT_PUBLIC_KEY;
        return cachedPublicKey;
    }

    printStep('[Auth] Connecting to Redis to fetch public key...');
    const client = createClient({ url: REDIS_URL });

    try {
        await client.connect();
        const key = await client.get('NOONA:JWT:PUBLIC_KEY');

        if (!key) {
            printError('[Auth] ❌ Public key not found in Redis or env');
            return null;
        }

        cachedPublicKey = key;
        printResult('[Auth] ✅ Public key loaded from Redis');
        return key;
    } catch (err) {
        printError('[Auth] ❌ Redis error while fetching public key:', err.message);
        return null;
    } finally {
        await client.disconnect();
        printDebug('[Auth] Redis client disconnected');
    }
}

/**
 * 🔐 Get the private key from environment
 */
export async function getPrivateKey() {
    if (cachedPrivateKey) {
        printDebug('[Auth] Using cached private key');
        return cachedPrivateKey;
    }

    const key = process.env.JWT_PRIVATE_KEY;
    if (!key) {
        printError('[Auth] ❌ Private key not set in environment');
        return null;
    }

    cachedPrivateKey = key;
    printDebug('[Auth] Loaded private key from env');
    return key;
}

/**
 * 🧪 Verify that the public/private key pair works correctly
 */
export async function verifyKeys() {
    printStep('[Auth] 🔐 Verifying JWT key pair...');

    if (SKIP_KEY_CHECK) {
        printDebug('[Auth] Skipping key check — SKIP_KEY_CHECK is true');
        return true;
    }

    const privateKey = await getPrivateKey();
    const publicKey = await getPublicKey();

    if (!privateKey || !publicKey) {
        printError('[Auth] ❌ Missing one or both keys — verification failed');
        return false;
    }

    // Show prefix of keys for debugging mismatches
    printDebug(`[Auth] Private Key Start: ${privateKey.slice(0, 12)}...`);
    printDebug(`[Auth] Public Key Start:  ${publicKey.slice(0, 12)}...`);

    try {
        const testPayload = { sub: 'noona-test', iat: Math.floor(Date.now() / 1000) };
        // Use RS256 for signing and verification
        const token = jwt.sign(testPayload, privateKey, { algorithm: 'RS256' });
        jwt.verify(token, publicKey, { algorithms: ['RS256'] });

        printResult('[Auth] ✅ Key pair is valid — signing & verification succeeded');
        return true;
    } catch (err) {
        printError('[Auth] ❌ Key verification failed:', err.message);
        return false;
    }
}
