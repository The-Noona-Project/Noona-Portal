// ✅ /noona/logger/validateEnv.mjs

import {
    printResult,
    printError,
    printDebug,
    printSection,
    printDivider
} from './logUtils.mjs';

/**
 * Validates required and optional environment variables.
 *
 * @param {string[]} requiredVars - Required environment variable keys
 * @param {string[]} optionalVars - Optional keys to show in logs if present
 */
export function validateEnv(requiredVars = [], optionalVars = []) {
    printDivider();
    printSection('🔍 Validating Environment Variables');

    let hasMissing = false;

    for (const key of requiredVars) {
        if (!process.env[key]) {
            printError(`❌ Missing required env: ${key}`);
            hasMissing = true;
        } else {
            printResult(`✓ ${key} = ${process.env[key]}`);
        }
    }

    for (const key of optionalVars) {
        if (!process.env[key]) {
            printDebug(`optional / unset → ${key}`);
        } else {
            printResult(`✓ ${key} = ${process.env[key]}`);
        }
    }

    if (hasMissing) {
        printDivider();
        printError('Environment validation failed. Exiting...');
        printDivider();
        process.exit(1);
    }

    printDivider();
    printResult('All required environment variables are set.');
    printDivider();
}
