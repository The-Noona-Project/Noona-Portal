import dotenv from 'dotenv';

dotenv.config();

/**
 * List of restricted commands and their required roles.
 * If no role ID is found for admin/mod, it logs a warning and prevents command execution.
 */
const restrictedCommands = {
    "admin": "REQUIRED_ROLE_ADMIN",
    "scan": "REQUIRED_ROLE_MOD",
    "search": "REQUIRED_ROLE_USER",
    "join": "REQUIRED_ROLE_USER",
    "ding": "REQUIRED_ROLE_USER" // Always requires a user role
};

/**
 * Checks if a user has the required role ID to execute a command.
 *
 * @param {import('discord.js').Interaction} interaction - The Discord interaction.
 * @returns {boolean} - Returns true if authorized, false otherwise.
 */
export function hasRequiredRole(interaction) {
    const commandName = interaction.commandName;

    // If command isn't restricted, allow execution
    if (!restrictedCommands[commandName]) {
        return true;
    }

    // Get the required role ID and guild ID from environment variables
    let requiredRoleID = process.env[restrictedCommands[commandName]];
    const requiredGuildID = process.env.REQUIRED_GUILD_ID;

    // Check if the interaction is from the correct guild
    if (requiredGuildID && interaction.guildId !== requiredGuildID) {
        console.warn(`❌ Command ${commandName} was attempted from a non-authorized guild.`);
        interaction.reply({
            content: `❌ This command can only be used in the authorized server.`,
            ephemeral: true
        });
        return false;
    }

    // If Admin or Mod role ID is missing, log warning and block command execution
    if (!requiredRoleID && (commandName === "admin" || commandName === "ding")) {
        console.warn(`❌ Missing role ID for ${commandName.toUpperCase()} in .env. Please set ${restrictedCommands[commandName]}!`);
        interaction.reply({
            content: `❌ This command requires a role that has not been set up. Please contact the administrator.`,
            ephemeral: true
        });
        return false;
    }

    // If User role ID is missing, log warning and block user commands
    if (!requiredRoleID && commandName === "scan") {
        console.warn(`❌ Missing REQUIRED_ROLE_USER in .env. Please set it to enforce role checks!`);
        interaction.reply({
            content: `❌ User role ID is not set. Please contact the administrator.`,
            ephemeral: true
        });
        return false;
    }

    // Check if the user has the required role ID in the specified guild
    const member = interaction.guild.members.cache.get(interaction.user.id);
    const hasRole = member ? member.roles.cache.has(requiredRoleID) : false;

    if (!hasRole) {
        interaction.reply({
            content: `❌ You do not have the required role to use this command.`,
            ephemeral: true
        });
        return false;
    }

    return true;
}
