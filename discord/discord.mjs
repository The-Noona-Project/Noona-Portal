import { Client, Events, REST, Routes } from 'discord.js';
import { loadCommands } from './commandManager.mjs';
import { setupLibraryNotifications } from './tasks/libraryNotifications.mjs';
import dotenv from 'dotenv';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import kavita from '../kavita/kavita.mjs';
import { handleScanButton, handleLibrarySelection, handleSeriesPage } from './commands/scan.mjs';

dotenv.config();

export async function setupDiscord(client) {
    console.log('🔄 Setting up Discord bot...');
    
    const commands = await loadCommands();
    console.log('Commands loaded:', Array.from(commands.entries()).map(([name, cmd]) => ({
        name,
        hasData: Boolean(cmd && cmd.data),
        hasToJSON: Boolean(cmd && cmd.data && typeof cmd.data.toJSON === 'function')
    })));

    const commandArray = Array.from(commands.entries())
        .filter(([name, cmd]) => cmd && cmd.data && typeof cmd.data.toJSON === 'function')
        .map(([name, cmd]) => cmd.data.toJSON());

    console.log(`Found ${commandArray.length} valid commands to register`);
    
    client.commands = commands;
    
    client.once(Events.ClientReady, async () => {
        console.log(`✅ Bot logged in as ${client.user.tag}!`);
        
        try {
            const rest = new REST().setToken(process.env.DISCORD_TOKEN);
            
            console.log(`Attempting to register ${commandArray.length} commands with Discord API...`);
            
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commandArray }
            );
            
            console.log(`✅ Registered ${commandArray.length} slash commands!`);
            
            setupLibraryNotifications(client);
        } catch (error) {
            console.error('❌ Error during slash command registration:', error);
        }
    });
    
    client.on(Events.InteractionCreate, async interaction => {
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}`);
                console.error(error);
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
                }
            }
        } else if (interaction.isButton()) {
            const customId = interaction.customId;
            
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
            }
        }
    });
    
    client.login(process.env.DISCORD_TOKEN);
}

async function handleLibraryScan(interaction) {
    await interaction.deferUpdate();
    
    const libraryId = interaction.customId.split('_')[1];
    const pageNumber = 0;
    const pageSize = 10;
    
    await displayLibrarySeries(interaction, libraryId, pageNumber, pageSize);
}

async function handleSeriesPagination(interaction) {
    await interaction.deferUpdate();
    
    const [_, __, libraryId, pageNumber] = interaction.customId.split('_');
    const pageSize = 10;
    
    await displayLibrarySeries(interaction, libraryId, parseInt(pageNumber), pageSize);
}

async function displayLibrarySeries(interaction, libraryId, pageNumber = 0, pageSize = 10) {
    try {        
        const response = await kavita.getSeriesByLibrary(libraryId);
        
        if (!response || !response.items) {
            return interaction.editReply({
                content: '❌ Error fetching series from this library.',
                components: []
            });
        }
        
        const filteredItems = response.items.filter(series => 
            series.libraries && series.libraries.some(lib => lib.id === parseInt(libraryId))
        );
        
        if (filteredItems.length === 0) {
            return interaction.editReply({
                content: '❌ No series found in this library.',
                components: []
            });
        }
        
        const { totalPages, totalCount } = response;
        
        const embed = new EmbedBuilder()
            .setTitle(`Library Series (${pageNumber + 1}/${totalPages})`)
            .setDescription(`Showing ${filteredItems.length} of ${totalCount} total series`)
            .setColor(0x0099FF);
        
        filteredItems.forEach((series, index) => {
            embed.addFields({
                name: `${index + 1}. ${series.name}`,
                value: series.summary 
                    ? (series.summary.length > 100 ? series.summary.substring(0, 97) + '...' : series.summary)
                    : 'No summary available'
            });
        });
        
        const navigationRow = new ActionRowBuilder();
        
        if (pageNumber > 0) {
            navigationRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`series_page_${libraryId}_${pageNumber - 1}`)
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        
        navigationRow.addComponents(
            new ButtonBuilder()
                .setCustomId('scan')
                .setLabel('Back to Libraries')
                .setStyle(ButtonStyle.Danger)
        );
        
        if (pageNumber < totalPages - 1) {
            navigationRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`series_page_${libraryId}_${pageNumber + 1}`)
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
            );
        }
        
        const seriesActionRows = [];
        const seriesButtons = filteredItems.map((series, index) => 
            new ButtonBuilder()
                .setCustomId(`series_${series.id}`)
                .setLabel(`${index + 1}. ${series.name.substring(0, 15)}${series.name.length > 15 ? '...' : ''}`)
                .setStyle(ButtonStyle.Success)
        );
        
        for (let i = 0; i < seriesButtons.length; i += 5) {
            const row = new ActionRowBuilder()
                .addComponents(seriesButtons.slice(i, Math.min(i + 5, seriesButtons.length)));
            seriesActionRows.push(row);
        }
        
        const componentsToSend = [navigationRow, ...seriesActionRows].slice(0, 5);
        
        await interaction.editReply({
            embeds: [embed],
            components: componentsToSend
        });
        
    } catch (error) {
        console.error('❌ Error displaying library series:', error);
        await interaction.editReply({
            content: '❌ Error fetching series from this library.',
            components: []
        });
    }
}
