// ✅ /discord/discord.mjs

import {
    Client,
    GatewayIntentBits,
    Events,
    REST,
    Routes,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import dotenv from 'dotenv';
import { loadCommands } from './commandManager.mjs';
import { setupLibraryNotifications } from './tasks/libraryNotifications.mjs';
import { hasRequiredRole } from './roleManager.mjs';
import { handleScanButton, handleLibrarySelection, handleSeriesPage } from './commands/scan.mjs';

dotenv.config();

/**
 * Initializes and sets up the Discord bot.
 * Returns the Discord client once ready.
 */
export async function setupDiscord() {
    console.log('🔄 Setting up Discord bot...');

    const client = new Client({
        intents: [GatewayIntentBits.Guilds]
    });

    try {
        // Load commands from the "commands" directory
        const commands = await loadCommands();
        console.log('Commands loaded:', Array.from(commands.keys()));

        const commandArray = Array.from(commands.values())
            .filter(cmd => cmd.data && typeof cmd.data.toJSON === 'function')
            .map(cmd => cmd.data.toJSON());

        console.log(`Registering ${commandArray.length} commands with Discord API...`);

        // Store commands in client for interaction handling
        client.commands = commands;

        client.once(Events.ClientReady, async () => {
            console.log(`✅ Bot logged in as ${client.user.tag}!`);

            try {
                const rest = new REST().setToken(process.env.DISCORD_TOKEN);
                await rest.put(
                    Routes.applicationCommands(client.user.id),
                    { body: commandArray }
                );
                console.log(`✅ Registered ${commandArray.length} slash commands!`);
            } catch (error) {
                console.error('❌ Error during slash command registration:', error);
            }
        });

        // Interaction handlers
        client.on(Events.InteractionCreate, async interaction => {
            if (interaction.isCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) {
                    console.error(`No command matching ${interaction.commandName} was found.`);
                    return;
                }

                if (!hasRequiredRole(interaction)) return;

                try {
                    await command.execute(interaction);
                } catch (error) {
                    console.error(`Error executing ${interaction.commandName}:`, error);
                    await interaction.reply({
                        content: '⚠️ An error occurred while executing this command!',
                        ephemeral: true
                    });
                }
            } else if (interaction.isAutocomplete()) {
                const command = client.commands.get(interaction.commandName);
                if (command?.autocomplete) {
                    try {
                        await command.autocomplete(interaction);
                    } catch (error) {
                        console.error(`Error handling autocomplete for ${interaction.commandName}:`, error);
                    }
                }
            } else if (interaction.isButton()) {
                const { customId } = interaction;

                if (customId === 'scan') {
                    await handleScanButton(interaction);
                } else if (customId.startsWith('scan_')) {
                    await handleLibrarySelection(interaction, customId.split('_')[1]);
                } else if (customId.startsWith('series_page_')) {
                    const [_, __, libraryId, pageNumber] = customId.split('_');
                    await handleSeriesPage(interaction, libraryId, parseInt(pageNumber));
                } else if (customId.startsWith('series_')) {
                    const seriesId = customId.split('_')[1];
                    await handleSeriesSelection(interaction, seriesId);
                } else if (
                    customId.startsWith('library_next_') ||
                    customId.startsWith('library_prev_')
                ) {
                    if (client.libraryNotifications) {
                        await client.libraryNotifications.handlePaginationButton(interaction);
                    } else {
                        await interaction.reply({
                            content: '⚠️ Library notification service not available.',
                            ephemeral: true
                        });
                    }
                }
            }
        });

        // Finally, log in
        await client.login(process.env.DISCORD_TOKEN);

        return client;
    } catch (error) {
        console.error('❌ Discord bot failed to initialize:', error);
        console.log('FAIL');
        return null;
    }
}
