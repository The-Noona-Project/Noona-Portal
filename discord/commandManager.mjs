import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = new Map();

export function registerCommand(name, commandObject) {
    console.log(`✅ Registering command: ${name}`);
    commands.set(name, commandObject);
}

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
                    commands.set(module.command.data.name, module.command);
                    console.log(`✅ Registered command: ${module.command.data.name}`);
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
