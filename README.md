# Noona-Portal

Welcome to **Noona-Portal**, a multi-purpose, self-hosted Discord bot designed to integrate with [Kavita](https://www.kavitareader.com/), providing users with an enhanced way to interact with their comics and manga libraries directly via Discord.

---

## 📚 Overview

**Noona-Portal** is aimed at simplifying library management, user interaction, and notifications for your Kavita instance. By leveraging Discord's APIs and Kavita's capabilities, this bot allows you to:
- Search for manga, comics, or series in your Kavita libraries.
- Receive real-time notifications about new additions to the library.
- Administer user roles and permissions.
- Perform server maintenance tasks directly from a Discord interface.
- Engage users via interactive commands and buttons within your Discord server.

This project is fully open-source and licensed under the [GNU General Public License v2](LICENSE).

---

## 🚀 Project Goals

1. **Seamless Integration:** Provide a bridge between Kavita and Discord for users to manage and access their libraries effectively.
2. **Enhanced User Interaction:** Offer user-friendly and interactive commands for searching and scanning libraries.
3. **Automation:** Automate notifications for changes to your Kavita library and server maintenance tasks.
4. **Customizability:** Allow server admins to define specific roles and permissions for command execution.
5. **Open and Extendable:** Encourage contributions and integrations with other tools or platforms.

---

## 🛠 Features

- **Library Search:** Execute `/search` commands to find series by title and receive results via embeds in Discord.
- **Notification System:** Automatically post updates about new additions to your library in a configured Discord channel.
- **Admin Commands:** Manage Kavita user roles, trigger server maintenance tasks, and check server statistics with `/admin`.
- **Interactive Scanning:** Use `/scan` commands to select and scan libraries with intuitive button workflows.
- **Role-Based Permissions:** Restrict commands to specified roles (e.g., Admin, Mod, User) for better security and management.
- **Discord Slash Commands:** Efficient slash command registration and clear organization of bot commands.

---

## 📦 Installation & Setup

This project has been containerized for easy deployment. You can run it using **Docker**. Follow these steps:

### Prerequisites
1. Make sure you have the following installed:
   - [Docker](https://docs.docker.com/get-docker/)
   - A running instance of [Kavita](https://www.kavitareader.com/)
   - A Discord bot token (register your bot in the [Discord Developer Portal](https://discord.com/developers/applications))
2. Clone the repository:
   ```bash
   git clone https://github.com/The-Noona-Project/Noona-Portal.git
   cd Noona-Portal
   ```
3. Create and configure a `.env` file based on the sample `.env.example`.

### Docker Installation

To get started with **Noona-Portal** using Docker:
1. Build the image:
   ```bash
   docker build -t noona-portal .
   ```
2. Run the container:
   ```bash
   docker run -d --name noona-portal -p 3000:3000 --env-file .env noona-portal
   ```
3. The bot will automatically authenticate with Kavita and register slash commands with Discord.

---

## 🧩 Environment Variables

The bot uses a `.env` file to configure essential parameters. Below is a list of variables required for proper functionality:

| Variable                | Description                                  |
|-------------------------|----------------------------------------------|
| `KAVITA_URL`            | URL to the Kavita instance.                 |
| `KAVITA_API_KEY`        | API key for authenticating with Kavita.      |
| `DISCORD_TOKEN`         | Discord bot token.                          |
| `REQUIRED_GUILD_ID`     | ID of the Discord server to restrict usage. |
| `REQUIRED_ROLE_ADMIN`   | Role ID for Administrator commands.         |
| `REQUIRED_ROLE_MOD`     | Role ID for Moderator commands.             |
| `REQUIRED_ROLE_USER`    | Role ID for general User commands.          |
| `NOTIFICATION_CHANNEL_ID` | Channel ID to send library notifications. |

Refer to the provided `.env.example` for a template.

---

## 💻 Development Setup

1. After cloning the repository, install dependencies:
   ```bash
   npm install
   ```
2. Run the bot locally:
   ```bash
   node initmain.mjs
   ```
3. For updates or changes, test commands in your Discord server.

---

## ⚡ Commands

Here are some notable slash commands the bot supports:

### General Commands
| Command      | Description                                         |
|--------------|-----------------------------------------------------|
| `/search`    | Search for a series by title.                      |
| `/scan`      | Display libraries and initiate a scan.             |
| `/join`      | Create a Kavita account and provide an invite link. |
| `/ding`      | A fun command to test if the bot is responsive.    |

### Admin Commands
| Command                 | Description                                  |
|-------------------------|----------------------------------------------|
| `/admin role`           | Assign or manage roles for a Kavita user.   |
| `/admin server-status`  | Display Kavita server statistics.           |
| `/admin server-maintenance` | Trigger maintenance tasks for Kavita.  |

---

## 🤝 Contributing

We welcome contributions to **Noona-Portal**! To get started:
1. Fork the repository and create a new branch.
2. Make your changes and submit a pull request for review.

Feel free to open issues for bugs, feature requests, or general help.

---

## 📜 License

This project is licensed under the [GNU General Public License v2](LICENSE). See the file for the full text.

---

## ✨ Acknowledgments

Special thanks to:
- The [Kavita](https://www.kavitareader.com/) team for their robust library management solution.
- The Discord.js community for their continued contributions to the library.
- Everyone contributing and supporting the **Noona-Portal**.

---

Happy reading and managing your library with **Noona-Portal**! 🚀

