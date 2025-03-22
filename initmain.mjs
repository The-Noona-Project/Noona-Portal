// ✅ /initmain.mjs — Boot logic for Noona-Portal

import dotenv from 'dotenv';
import chalk from 'chalk';
import Table from 'cli-table3';

import { authenticateWithKavita } from './kavita/kavita.mjs';
import { setupDiscord } from './discord/discord.mjs';
import { setupLibraryNotifications } from './discord/tasks/libraryNotifications.mjs';
import { getVaultToken } from './noona/vault.mjs';

dotenv.config();

console.log('');
console.log(chalk.bold.cyan('[Noona-Portal] 🚀 Booting up...'));
console.log('');

let vaultToken = null;
let discordClient = null;
let kavitaStatus = false;

(async () => {
    // Step 1: Get Vault token
    process.stdout.write(chalk.gray('🔐 Requesting Vault token... '));
    try {
        vaultToken = await getVaultToken();
        console.log(chalk.green('OK'));
    } catch (err) {
        console.log(chalk.red('FAIL'));
        console.error(chalk.red('[Vault Auth] ❌ Failed to fetch JWT token from Vault:'), err.message);
    }

    // Step 2: Initialize Discord client
    try {
        console.log(chalk.gray('🤖 Starting Discord client...'));
        discordClient = await setupDiscord();
    } catch (err) {
        console.log(chalk.red('FAIL'));
        console.error(chalk.red('❌ Discord bot failed to initialize:'), err.message);
    }

    // Step 3: Start Library Notification system
    try {
        if (discordClient) {
            setupLibraryNotifications(discordClient);
        } else {
            console.log(chalk.yellow('⚠️  Discord client is not ready. Notifications skipped.'));
        }
    } catch (err) {
        console.error(chalk.red('❌ Notification system failed to initialize:'), err.message);
    }

    // Step 4: Authenticate with Kavita
    try {
        console.log(chalk.gray('🔄 Authenticating with Kavita API...'));
        await authenticateWithKavita();
        kavitaStatus = true;
    } catch (err) {
        console.error(chalk.red('❌ Kavita authentication failed:'), err.message);
    }

    // Boot Summary
    console.log('');
    console.log(chalk.bold.cyan('[Noona-Portal] 🧩 Boot Summary\n'));

    const bootTable = new Table({
        head: ['Component', 'Info', 'Status'],
        colWidths: [18, 42, 14],
    });

    bootTable.push(
        ['Vault Auth', vaultToken ? 'Token received successfully' : 'Token is null', vaultToken ? '🟢 Ready' : '🔴 Failed'],
        ['Discord Bot', discordClient ? 'Client logged in and ready' : 'Initialization failed', discordClient ? '🟢 Ready' : '🔴 Failed'],
        ['Kavita API', kavitaStatus ? 'Authenticated successfully' : 'Auth failed', kavitaStatus ? '🟢 Ready' : '🔴 Failed']
    );

    console.log(bootTable.toString());
    console.log('');

    if (!vaultToken || !discordClient || !kavitaStatus) {
        console.log(chalk.yellow('⚠️  One or more components failed to start.'));
    } else {
        console.log(chalk.bold.green('🧠  Noona-Portal is online. All systems go.'));
    }

    console.log('');
})();
