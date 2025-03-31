// ✅ /discord/commandManager.mjs — Slash Command Loader + Registrar

import { SlashCommandBuilder, REST, Routes, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { printStep, printResult, printError, printDivider } from '../noona/logger/logUtils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Loads all slash commands from the /commands directory.
 * @returns {Promise<{ commandJSON: Array, commandCollection: Collection, commandNames: string[] }>}
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
 * Registers slash commands with the Discord API.
 * @param {Array} commandJSON - Array of slash command JSON payloads.
 * @returns {Promise<number>} Number of commands registered
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
 * Returns the number of loaded commands.
 * @returns {number}
 */
export function getCommandCount() {
    return global.__commandCollection?.size || 0;
}
