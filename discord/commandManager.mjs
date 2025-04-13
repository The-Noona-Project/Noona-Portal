/**
 * @fileoverview
 * Slash Command Manager for Noona-Portal
 *
 * Loads, validates, and registers all Discord slash commands from `/commands`.
 * Provides an in-memory collection for bot runtime access and supports full registration via Discord API.
 *
 * @module commandManager
 */

import { SlashCommandBuilder, REST, Routes, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { printStep, printResult, printError, printDivider } from '../noona/logger/logUtils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Dynamically loads all slash commands from the `/commands` directory.
 *
 * @async
 * @function loadCommands
 * @returns {Promise<{ commandJSON: object[], commandCollection: Collection, commandNames: string[] }>}
 */
export async function loadCommands() {
    printStep('📦 Loading commands...');

    const commandJSON = [];
    const commandCollection = new Collection();
    const commandNames = [];

    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.mjs'));

    for (const file of commandFiles) {
        try {
            const commandModule = await import(`file://${path.join(commandsPath, file)}`);
            const command = commandModule.default;

            if (!command || !command.data || !command.execute) {
                printError(`⚠️ Invalid command format in file: ${file}`);
                continue;
            }

            commandJSON.push(command.data.toJSON());
            commandCollection.set(command.data.name, command);
            commandNames.push(command.data.name);
        } catch (err) {
            printError(`❌ Failed to load command "${file}": ${err.message}`);
        }
    }

    global.__commandCollection = commandCollection;

    printResult(`✅ Loaded ${commandCollection.size} commands.`);
    printResult(`Commands: [ ${commandNames.join(', ')} ]`);
    printDivider();

    return { commandJSON, commandCollection, commandNames };
}

/**
 * Registers slash commands with the Discord API globally.
 *
 * @async
 * @function registerCommands
 * @param {object[]} commandJSON - Array of command JSON payloads.
 * @returns {Promise<number>} Number of registered commands
 */
export async function registerCommands(commandJSON) {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        const data = await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commandJSON }
        );
        printResult(`✅ Registered ${data.length} slash commands with Discord.`);
        return data.length;
    } catch (err) {
        printError(`❌ Failed to register commands: ${err.message}`);
        return 0;
    }
}

/**
 * Returns the number of currently loaded commands.
 *
 * @function getCommandCount
 * @returns {number}
 */
export function getCommandCount() {
    return global.__commandCollection?.size || 0;
}
