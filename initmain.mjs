import { Client, GatewayIntentBits } from 'discord.js';
import { setupDiscord } from './discord/discord.mjs';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Load Discord bot logic
setupDiscord(client);

client.login(process.env.DISCORD_TOKEN);
