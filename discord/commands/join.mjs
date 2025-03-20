import {SlashCommandBuilder} from 'discord.js';
import kavita from '../../kavita/kavita.mjs';

/**
 * Command configuration for creating a Kavita account and providing an invite link.
 */
export const command = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Creates a Kavita account and provides an invite link.')
        .addStringOption(option =>
            option.setName('email')
                .setDescription('Your email address')
                .setRequired(true)
        ),

    /**
     * Executes the 'join' command to create a Kavita account and send an invite link.
     *
     * @param {import('discord.js').CommandInteraction} interaction - The interaction object provided by Discord.
     * @returns {Promise<void>} Resolves when the interaction is completed.
     *
     * @example
     * // User runs /join with email set to valid@example.com
     * const interaction = ...; // Interaction provided by Discord client
     * command.execute(interaction);
     */
    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});
        const email = interaction.options.getString('email');
        console.log(`📡 Creating user in Kavita for email: ${email}`);

        if (!validateEmail(email)) {
            return interaction.editReply('❌ Invalid email address. Please try again with a valid one.');
        }

        try {
            const inviteLink = await kavita.createUser(email);
            if (!inviteLink || inviteLink.includes('<html')) {
                return interaction.editReply('❌ Failed to create Kavita account. Invalid response from the API.');
            }

            await interaction.editReply(`✅ Account created! Finish setup here: ${inviteLink}`);
        } catch (error) {
            console.error(`Error while creating user: ${error.message}`);
            return interaction.editReply('❌ An error occurred while creating your account. Please try again later.');
        }
    }
};

/**
 * Validates an email address using a regular expression.
 *
 * @param {string} email - The email address to validate.
 * @returns {boolean} True if the email is valid, otherwise false.
 *
 * @example
 * validateEmail('valid@example.com'); // true
 * validateEmail('invalid-email'); // false
 */
function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}
