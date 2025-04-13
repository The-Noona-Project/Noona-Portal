/**
 * @fileoverview
 * Discord Role Enforcement Middleware for Noona-Portal
 *
 * Enforces per-command role validation using environment variables.
 *
 * @module roleManager
 */

import {
    printError,
    printResult
} from '../noona/logger/logUtils.mjs';

/**
 * Map of command names to required environment role keys.
 * These environment variables should contain the role ID (as a string).
 *
 * Example:
 * - /admin → process.env.REQUIRED_ROLE_ADMIN
 * - /scan → process.env.REQUIRED_ROLE_MOD
 */
const restrictedCommands = {
    admin: 'REQUIRED_ROLE_ADMIN',
    scan: 'REQUIRED_ROLE_MOD',
    search: 'REQUIRED_ROLE_USER',
    join: 'REQUIRED_ROLE_USER',
    ding: 'REQUIRED_ROLE_USER'
};

/**
 * Validates whether the user invoking the command has the appropriate role.
 * Handles and replies to the interaction if the check fails.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - The Discord interaction object
 * @returns {boolean} True if the user is authorized to use the command, false if denied and handled.
 */
export function hasRequiredRole(interaction) {
    const commandName = interaction.commandName;
    const requiredEnvKey = restrictedCommands[commandName];

    // If no restriction for this command, allow by default
    if (!requiredEnvKey) return true;

    const requiredRoleID = process.env[requiredEnvKey];
    const requiredGuildID = process.env.REQUIRED_GUILD_ID;

    // Validate guild (server) origin
    if (requiredGuildID && interaction.guildId !== requiredGuildID) {
        printError(`[RoleCheck] ❌ Guild mismatch for /${commandName}`);
        interaction.reply({
            content: '❌ This command can only be used in the official server.',
            ephemeral: true
        });
        return false;
    }

    // Validate that the role environment variable is defined
    if (!requiredRoleID) {
        printError(`[RoleCheck] ❌ ENV missing: ${requiredEnvKey}`);
        interaction.reply({
            content: '❌ Role for this command is not configured. Please contact an admin.',
            ephemeral: true
        });
        return false;
    }

    // Fetch member from the guild and check if the role exists
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
