// ✅ /discord/commandManager.mjs

import { REST, Routes, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Loads all slash commands from the /commands directory.
 * @returns {Promise<{ commandJSON: Array, commandCollection: Collection }>}
 */
export async function loadCommands() {
    const commandJSON = [];
    const commandCollection = new Collection();

    const commandsPath = path.join(process.cwd(), 'discord', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.mjs'));

    for (const file of commandFiles) {
        try {
            const commandModule = await import(`./commands/${file}`);
            const command = commandModule.command;

            if (!command || !command.data || !command.execute) {
                console.warn(`⚠️ Invalid command format in file: ${file}`);
                continue;
            }

            commandJSON.push(command.data.toJSON());
            commandCollection.set(command.data.name, command);
        } catch (err) {
            console.error(`❌ Failed to load command "${file}":`, err.message);
        }
    }

    // Store in global context for other modules (optional)
    global.__commandCollection = commandCollection;

    return { commandJSON, commandCollection };
}

/**
 * Registers slash commands with the Discord API.
 * @param {Array} commandJSON - Array of slash command JSON payloads.
 * @returns {Promise<number>} Number of commands registered
 */
export async function registerCommands(commandJSON) {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

    try {
        const data = await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commandJSON }
        );
        console.log(`✅ Registered ${data.length} slash commands!`);
        return data.length;
    } catch (err) {
        console.error('❌ Failed to register slash commands:', err.message);
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
