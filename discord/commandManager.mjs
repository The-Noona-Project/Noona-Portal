import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = new Map();

/**
 * Registers a command and stores it in the internal commands map.
 *
 * @param {string} name - The name of the command to register.
 * @param {Object} commandObject - The command object containing the execution logic.
 * @example
 * registerCommand('ping', {
 *   execute: async (interaction) => {
 *     await interaction.reply('Pong!');
 *   }
 * });
 */
export function registerCommand(name, commandObject) {
    console.log(`Registering command: ${name}`);
    commands.set(name, commandObject);
}

/**
 * Loads command files from the "commands" directory and registers them.
 *
 * @returns {Promise<Map<string, Object>>} - A promise that resolves with the map of loaded commands.
 * @example
 * const commands = await loadCommands();
 * console.log(`Loaded ${commands.size} commands.`);
 */
export async function loadCommands() {
    console.log('Loading commands...');
    const commandsDir = join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.mjs'));

    if (commandFiles.length === 0) {
        console.warn('No command files found.');
        return commands;
    }

    await Promise.all(
        commandFiles.map(async (file) => {
            try {
                const module = await import(`file://${join(commandsDir, file)}`);
                if (module.command && module.command.data && typeof module.command.data.toJSON === 'function') {
                    commands.set(module.command.data.name, module.command);
                } else {
                    console.warn(`Skipping ${file} - Invalid command structure.`);
                }
            } catch (error) {
                console.error(`Failed to load command ${file}:`, error);
            }
        })
    );

    console.log(`Loaded ${commands.size} commands.`);
    return commands;
}

/**
 * Handles the execution of a received command interaction.
 *
 * @param {import('discord.js').Interaction} interaction - The interaction object representing the command execution.
 * @returns {Promise<void>}
 * @example
 * client.on('interactionCreate', async interaction => {
 *   if (interaction.isCommand()) {
 *     await handleCommand(interaction);
 *   }
 * });
 */
export async function handleCommand(interaction) {
    console.log(`Command received: /${interaction.commandName} by ${interaction.user.tag}`);

    const command = commands.get(interaction.commandName);
    if (!command) {
        console.warn(`Unknown command: /${interaction.commandName}`);
        return interaction.reply('Command not found.');
    }

    try {
        await command(interaction);
    } catch (error) {
        console.error(`Error executing /${interaction.commandName}:`, error);
        interaction.reply('There was an error executing this command.');
    }
}
