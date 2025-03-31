// /discord/roleManager.mjs — Warden-Style Role Enforcement

import {
    printError,
    printResult
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
 * Enforces role-based access control for Discord commands.
 * @param {import('discord/initDiscord.mjs').ChatInputCommandInteraction} interaction
 * @returns {boolean}
 */
export function hasRequiredRole(interaction) {
    const commandName = interaction.commandName;
    const requiredEnvKey = restrictedCommands[commandName];

    // ✅ Unrestricted command
    if (!requiredEnvKey) return true;

    const requiredRoleID = process.env[requiredEnvKey];
    const requiredGuildID = process.env.REQUIRED_GUILD_ID;

    if (requiredGuildID && interaction.guildId !== requiredGuildID) {
        printError(`[RoleCheck] ❌ Guild mismatch for /${commandName}`);
        interaction.reply({
            content: '❌ This command can only be used in the official server.',
            ephemeral: true
        });
        return false;
    }

    if (!requiredRoleID) {
        printError(`[RoleCheck] ❌ ENV missing: ${requiredEnvKey}`);
        interaction.reply({
            content: '❌ Role for this command is not configured. Please contact an admin.',
            ephemeral: true
        });
        return false;
    }

    const member = interaction.guild.members.cache.get(interaction.user.id);
    const hasRole = member?.roles.cache.has(requiredRoleID) ?? false;

    if (!hasRole) {
        printResult(`[RoleCheck] ❌ Unauthorized attempt: ${interaction.user.tag} tried /${commandName}`);
        interaction.reply({
            content: '❌ You do not have permission to use this command.',
            ephemeral: true
        });
        return false;
    }

    return true;
}
