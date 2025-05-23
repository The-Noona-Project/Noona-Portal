// /discord/commands/join.mjs — Account Creation via Kavita API

import { SlashCommandBuilder } from 'discord.js';
import { createUser } from '../../kavita/postKavita.mjs';
import { printDebug, printError } from '../../noona/logger/logUtils.mjs';

const command = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Creates a Kavita account and provides an invite link.')
        .addStringOption(option =>
            option.setName('email')
                .setDescription('Your email address')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const email = interaction.options.getString('email');
        printDebug(`[Join] Request from ${interaction.user.tag} → Email: ${email}`);

        if (!validateEmail(email)) {
            return interaction.editReply('❌ Invalid email address. Please try again with a valid one.');
        }

        try {
            const inviteLink = await createUser(email);
            if (!inviteLink || inviteLink.includes('<html')) {
                return interaction.editReply('❌ Failed to create Kavita account. Invalid response from the API.');
            }

            await interaction.editReply(`✅ Account created! Finish setup here: ${inviteLink}`);
        } catch (error) {
            printError('❌ Error while creating user:', error);
            return interaction.editReply('❌ An error occurred while creating your account. Please try again later.');
        }
    }
};

export default command;

// ———————————————————————————————————————————————————————————————————
// Helpers

function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}
