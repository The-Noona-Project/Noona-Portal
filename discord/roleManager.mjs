// ✅ /discord/roleManager.mjs — Warden-Style Role Enforcement

import {
    printError,
    printResult,
} from '../noona/logger/logUtils.mjs';

/**
 * Map of restricted commands and the required ENV role key.
 */
const restrictedCommands = {
    admin: 'REQUIRED_ROLE_ADMIN',
    scan: 'REQUIRED_ROLE_MOD',
    search: 'REQUIRED_ROLE_USER',
    join: 'REQUIRED_ROLE_USER',
    ding: 'REQUIRED_ROLE_USER'
};

/**
 * Checks if the user has the required role to run a command.
 * Replies with appropriate feedback if blocked.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @returns {boolean}
 */
export function hasRequiredRole(interaction) {
    const commandName = interaction.commandName;
    const requiredEnvKey = restrictedCommands[commandName];

    // ✅ Unrestricted command — allow execution
    if (!requiredEnvKey) return true;

    const requiredRoleID = process.env[requiredEnvKey];
    const requiredGuildID = process.env.REQUIRED_GUILD_ID;

    // 🔐 Guild lock
    if (requiredGuildID && interaction.guildId !== requiredGuildID) {
        printError(`Guild check failed for /${commandName} — blocked`);
        interaction.reply({
            content: `❌ This command can only be used in the authorized server.`,
            ephemeral: true
        });
        return false;
    }

    // 🧪 Missing role configuration
    if (!requiredRoleID) {
        printError(`Missing ENV: ${requiredEnvKey} required for /${commandName}`);
        interaction.reply({
            content: `❌ This command requires a role that hasn't been configured. Please contact the administrator.`,
            ephemeral: true
        });
        return false;
    }

    // 🔍 Look up user in guild & check roles
    const member = interaction.guild.members.cache.get(interaction.user.id);
    const hasRole = member?.roles.cache.has(requiredRoleID) ?? false;

    if (!hasRole) {
        printResult(`❌ Unauthorized attempt: ${interaction.user.tag} tried /${commandName}`);
        interaction.reply({
            content: `❌ You do not have the required role to use this command.`,
            ephemeral: true
        });
        return false;
    }

    // ✅ Passed all checks
    return true;
}
