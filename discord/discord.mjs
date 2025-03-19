const validCommands = [];

console.log('🔍 Debugging command registration...');

commandMap.forEach((cmd, name) => {
    console.log(`🔹 Checking command: ${name}`);

    if (!cmd || !cmd.data) {
        console.warn(`⚠️ Skipping ${name} - Missing .data property`);
        return;
    }

    if (typeof cmd.data.toJSON !== 'function') {
        console.warn(`⚠️ Skipping ${name} - .data.toJSON() is not a function`);
        return;
    }

    console.log(`✅ Valid command: ${name}`);
    validCommands.push(cmd.data.toJSON());
});

console.log(`🔄 Registering ${validCommands.length} slash commands with Discord...`);

if (validCommands.length === 0) {
    console.error('❌ No valid commands found. Aborting registration.');
} else {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    rest.put(Routes.applicationCommands(client.user.id), { body: validCommands })
        .then(() => console.log('✅ Successfully registered slash commands.'))
        .catch(error => console.error('❌ Failed to register commands with Discord:', error));
}
