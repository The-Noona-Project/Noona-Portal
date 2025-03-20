/**
 * Initializes the environment variables, starts the Discord client, and sets up the bot.
 */

// Import the required modules
import {Client, GatewayIntentBits} from 'discord.js';
import {setupDiscord} from './discord/discord.mjs';
import dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

/**
 * Entry point to start the Noona-Portal bot.
 *
 * This script initializes a Discord.js client with necessary intents and sets up the bot
 * using the `setupDiscord` function. If the bot fails to set up, the process exits with
 * an error.
 *
 * @example
 * // To run this file, ensure you have a .env file with DISCORD_TOKEN
 * // and execute the script with Node.js:
 * //
 * // node index.js
 */
console.log('🚀 Starting Noona-Portal...');

// Create a Discord client instance with the necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

/**
 * Sets up the bot using the `setupDiscord` function.
 * If an error occurs during setup, it will log the error and exit the process.
 */
setupDiscord(client)
    .catch(error => {
        console.error('❌ Failed to setup Discord bot:', error);
        process.exit(1);
    });
