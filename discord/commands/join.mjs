import { SlashCommandBuilder } from 'discord.js';
import kavita from '../../kavita/kavita.mjs';

export const command = {
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
        console.log(`📡 Creating user in Kavita for email: ${email}`);

        const inviteLink = await kavita.createUser(email);
        if (!inviteLink || inviteLink.includes('<html')) {
            return interaction.editReply('❌ Failed to create Kavita account. Invalid response from API.');
        }

        await interaction.editReply(`✅ Account created! Finish setup here: ${inviteLink}`);
    }
};
