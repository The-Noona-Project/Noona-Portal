// ✅ /discord/discord.mjs

import { Client, GatewayIntentBits, Events } from 'discord.js';
import { loadCommands, registerCommands, getCommandCount } from './commandManager.mjs';
import { hasRequiredRole } from './roleManager.mjs';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
    ],
});

/**
 * Initializes the Discord bot.
 * @returns {Promise<{ client: import('discord.js').Client, commandCount: number }>}
 */
export async function setupDiscord() {
    return new Promise(async (resolve, reject) => {
        try {
            const { commandJSON, commandCollection } = await loadCommands();

            if (commandCollection.size === 0) {
                return reject(new Error('No valid commands loaded.'));
            }

            client.commands = commandCollection;

            client.once(Events.ClientReady, async () => {
                console.log(`✅ Bot logged in as ${client.user.tag}!`);
                const count = await registerCommands(commandJSON);
                resolve({ client, commandCount: count });
            });

            client.on(Events.InteractionCreate, async interaction => {
                if (interaction.isChatInputCommand()) {
                    const command = client.commands.get(interaction.commandName);
                    if (!command) return;

                    if (!hasRequiredRole(interaction)) return;

                    try {
                        await command.execute(interaction);
                    } catch (err) {
                        console.error(`❌ Error executing /${interaction.commandName}:`, err);
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                content: '❌ An error occurred while executing the command.',
                                ephemeral: true,
                            });
                        } else {
                            await interaction.editReply({
                                content: '❌ An error occurred while executing the command.',
                            });
                        }
                    }
                } else if (interaction.isAutocomplete()) {
                    const command = client.commands.get(interaction.commandName);
                    if (command?.autocomplete) {
                        try {
                            await command.autocomplete(interaction);
                        } catch (err) {
                            console.error(`❌ Autocomplete failed for /${interaction.commandName}:`, err);
                        }
                    }
                } else if (interaction.isButton()) {
                    const [prefix, ...args] = interaction.customId.split('_');
                    try {
                        const scan = client.commands.get('scan');
                        if (!scan) return;

                        if (prefix === 'scan') {
                            await scan.execute(interaction); // Return to library selection
                        } else if (prefix === 'series' && args[0] === 'page') {
                            const [, libraryId, page] = args;
                            await scan.handleSeriesPage(interaction, libraryId, parseInt(page), false);
                        } else if (prefix === 'scan') {
                            const libraryId = args[0];
                            await scan.handleLibrarySelection(interaction, libraryId);
                        } else if (prefix === 'series') {
                            const seriesId = args[0];
                            await scan.handleSeriesSelection(interaction, seriesId);
                        }
                    } catch (err) {
                        console.error(`❌ Button interaction failed:`, err);
                    }
                }
            });

            await client.login(process.env.DISCORD_TOKEN);
        } catch (err) {
            reject(err);
        }
    });
}
