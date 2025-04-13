/**
 * @fileoverview
 * Initializes the Noona-Portal Discord bot client.
 *
 * Loads and registers all slash commands, attaches interaction handlers,
 * and enforces role-based command access using `roleManager`.
 *
 * @module initDiscord
 */

import { Client, GatewayIntentBits, Events } from 'discord.js';
import { loadCommands, registerCommands } from './commandManager.mjs';
import { hasRequiredRole } from './roleManager.mjs';
import {
    handleLibrarySelection,
    handleSeriesPage,
    handleSeriesSelection
} from './commands/scan.mjs';
import {
    printStep,
    printResult,
    printError,
    printDebug,
    printDivider,
    printSection
} from '../noona/logger/logUtils.mjs';

/**
 * Discord client instance shared across commands.
 * @type {import('discord.js').Client}
 */
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

/**
 * Bootstraps the Discord bot and all slash command interactions.
 *
 * - Loads commands
 * - Registers them with Discord
 * - Attaches interaction listeners
 *
 * @async
 * @function setupDiscord
 * @returns {Promise<{ client: import('discord.js').Client, commandCount: number }>}
 */
export async function setupDiscord() {
    printSection('🤖 Discord Bot Setup');

    return new Promise(async (resolve, reject) => {
        try {
            printStep('📦 Loading slash commands...');
            const { commandJSON, commandCollection, commandNames } = await loadCommands();

            if (commandCollection.size === 0) {
                return reject(new Error('No valid commands loaded.'));
            }

            // Bind commands to client
            client.commands = commandCollection;
            printResult(`✅ Commands loaded: [ ${commandNames.join(', ')} ]`);

            // 🔗 On bot ready
            client.once(Events.ClientReady, async () => {
                printResult(`✅ Bot logged in as ${client.user.tag}`);
                printStep('📡 Registering commands with Discord API...');
                const count = await registerCommands(commandJSON);
                printResult(`✅ Registered ${count} slash commands`);
                printDivider();
                resolve({ client, commandCount: count });
            });

            // 📥 On interaction create
            client.on(Events.InteractionCreate, async interaction => {
                try {
                    // 💬 Slash command
                    if (interaction.isChatInputCommand()) {
                        const command = client.commands.get(interaction.commandName);
                        if (!command) return;

                        if (!hasRequiredRole(interaction)) return;

                        printDebug(`🔧 [Discord] ${interaction.user.tag} used /${interaction.commandName}`);
                        await command.execute(interaction);
                    }

                    // 🧠 Autocomplete
                    else if (interaction.isAutocomplete()) {
                        const command = client.commands.get(interaction.commandName);
                        if (command?.autocomplete) {
                            await command.autocomplete(interaction);
                        }
                    }

                    // 🔘 Button interactions (used in scan)
                    else if (interaction.isButton()) {
                        const [prefix, ...args] = interaction.customId.split('_');
                        const scan = client.commands.get('scan');
                        if (!scan) return;

                        if (prefix === 'scan' && args.length === 0) {
                            await scan.execute(interaction);
                        } else if (prefix === 'scan') {
                            const libraryId = args[0];
                            await handleLibrarySelection(interaction, libraryId);
                        } else if (prefix === 'series' && args[0] === 'page') {
                            const [, libraryId, page] = args;
                            await handleSeriesPage(interaction, libraryId, parseInt(page), false);
                        } else if (prefix === 'series') {
                            const seriesId = args[0];
                            await handleSeriesSelection(interaction, seriesId);
                        }
                    }
                } catch (err) {
                    printError(`❌ Interaction error: ${err.message}`);
                    if (interaction.isRepliable()) {
                        try {
                            if (!interaction.replied && !interaction.deferred) {
                                await interaction.reply({
                                    content: '❌ An error occurred while executing that action.',
                                    ephemeral: true
                                });
                            } else {
                                await interaction.editReply({
                                    content: '❌ Something went wrong.'
                                });
                            }
                        } catch (e) {
                            printError(`❌ Failed to reply to interaction: ${e.message}`);
                        }
                    }
                }
            });

            // 🔐 Login with bot token
            printStep('🔐 Logging in with bot token...');
            await client.login(process.env.DISCORD_TOKEN);
        } catch (err) {
            printError(`❌ Discord setup failed: ${err.message}`);
            reject(err);
        }
    });
}
