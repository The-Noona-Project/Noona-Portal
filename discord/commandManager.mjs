import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {Map<string, any>} */
const commands = new Map();

/**
 * Registers a command.
 * @param {string} name - The command name.
 * @param {Function} execute - The command execution function.
 */
export function registerCommand(name, execute) {
    commands.set(name, execute);
    console.log(`✅ Registered command: ${name}`);
}

/**
 * Loads all commands from the `commands/` folder.
 * @returns {Promise<Map<string, any>>} - The loaded commands.
 */
export async function loadCommands() {
    console.log('🔄 Loading commands...');
    const commandsDir = join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.mjs'));

    if (commandFiles.length === 0) {
        console.warn('⚠️ No command files found.');
        return commands;
    }

    await Promise.all(
        commandFiles.map(async (file) => {
            try {
                const module = await import(`file://${join(commandsDir, file)}`);
                console.log(`🔹 Imported module from ${file}:`, module);

                if (module.command && module.command.data && typeof module.command.data.toJSON === 'function') {
                    console.log(`✅ Command structure in ${file}:`, module.command);
                    registerCommand(module.command.data.name, module.command.execute);
                } else {
                    console.warn(`⚠️ Skipping ${file} - Invalid command structure.`);
                }
            } catch (error) {
                console.error(`❌ Failed to load command ${file}:`, error);
            }
        })
    );

    console.log(`✅ Loaded ${commands.size} commands.`);
    return commands;
}

/**
 * Handles command execution when a user interacts with the bot.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction instance.
 */
export async function handleCommand(interaction) {
    console.log(`🔹 Command received: /${interaction.commandName} by ${interaction.user.tag}`);

    const command = commands.get(interaction.commandName);
    if (!command) {
        console.warn(`⚠️ Unknown command: /${interaction.commandName}`);
        return interaction.reply('❌ Command not found.');
    }

    try {
        await command(interaction);
        console.log(`✅ Successfully executed /${interaction.commandName}`);
    } catch (error) {
        console.error(`❌ Error executing /${interaction.commandName}:`, error);
        interaction.reply('❌ There was an error executing this command.');
    }
}
