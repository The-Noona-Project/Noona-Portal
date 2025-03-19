import { Client, GatewayIntentBits } from 'discord.js';
import { setupDiscord } from './discord/discord.mjs';
import dotenv from 'dotenv';

dotenv.config();

console.log('🚀 Starting Noona-Portal...');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

setupDiscord(client)
    .catch(error => {
        console.error('❌ Failed to setup Discord bot:', error);
        process.exit(1);
    });
