# 🚀 Noona-Portal  

Welcome to **Noona-Portal**, a multi-purpose, self-hosted **Discord bot** designed to integrate with [Kavita](https://www.kavitareader.com/), giving you seamless access to your comics and manga libraries directly from Discord.  

🔹 **Open-source** | 🔹 **Containerized with Docker** | 🔹 **Powered by Node.js**  

---

## 📚 Overview  

**Noona-Portal** simplifies library management, enhances user interactions, and provides automated notifications for your **Kavita** instance. With Discord's rich APIs and Kavita's powerful library system, this bot allows you to:  

✅ **Search & Retrieve** manga, comics, or series from your Kavita libraries.  
✅ **Receive Real-time Updates** about new additions to your collection.  
✅ **Administer User Roles & Permissions** with ease.  
✅ **Trigger Server Maintenance Tasks** directly from Discord.  
✅ **Engage Users** via interactive buttons & commands.  

🔗 **GitHub Repository:** [The-Noona-Project/Noona-Portal](https://github.com/The-Noona-Project/Noona-Portal)  
📝 **License:** [GNU GPL v2](LICENSE)  

---

## 🎯 Project Goals  

1. **🔗 Seamless Integration** – Bridge Discord & Kavita for library management.  
2. **💬 Enhanced User Interaction** – Intuitive commands & workflows.  
3. **🤖 Automation** – Notifications & maintenance features.  
4. **🛠 Customizability** – Role-based access & permissions.  
5. **🧩 Extendable** – Open-source & ready for community contributions.  

---

## ✨ Features  

### 📖 Library Interaction  
🔍 **`/search`** – Look up series by title with Discord embeds.  
📢 **Notification System** – Auto-post updates about new library additions.  

### ⚙️ Admin & Maintenance  
🛠 **`/admin` commands** – Manage users, roles, and perform server maintenance.  
📊 **Server Stats** – Monitor Kavita server health & status.  

### 🎛️ User Engagement  
📌 **Interactive Scanning** – Use `/scan` to pick & scan libraries via Discord buttons.  
🔑 **Role-based Permissions** – Secure bot usage with customizable role restrictions.  
📜 **Slash Commands** – Organized and efficient Discord bot command system.  

---

## 📦 Installation & Setup  

This bot is fully containerized with **Docker** for easy deployment.  

### 🔧 Prerequisites  
Before installing, make sure you have:  
- [Docker](https://docs.docker.com/get-docker/) installed.  
- A running [Kavita](https://www.kavitareader.com/) instance.  
- A **Discord Bot Token** from the [Discord Developer Portal](https://discord.com/developers/applications).  

### 🏗️ Docker Installation  

1️⃣ **Pull the Docker image:**
```bash
docker pull captainpax/noona-portal
```
2️⃣ **Run the container:**
```bash
docker run -d \
  --name='noona-portal' \
  --net='bridge' \
  -e TZ="America/Los_Angeles" \
  -e HOST_CONTAINERNAME="noona-portal" \
  -e 'DISCORD_TOKEN'='<your_discord_token>' \
  -e 'REQUIRED_GUILD_ID'='<your_guild_id>' \
  -e 'REQUIRED_ROLE_ADMIN'='<your_admin_role_id>' \
  -e 'REQUIRED_ROLE_MOD'='<your_mod_role_id>' \
  -e 'REQUIRED_ROLE_USER'='<your_user_role_id>' \
  -e 'NOTIFICATION_CHANNEL_ID'='<your_notification_channel_id>' \
  -e 'KAVITA_URL'='<your_kavita_url>' \
  -e 'KAVITA_API_KEY'='<your_kavita_api_key>' \
  -e 'KAVITA_LIBRARY_IDS'='<library_ids>' \
  captainpax/noona-portal
```
3️⃣ **Replace placeholders** (`<your_discord_token>`, etc.) with actual values.

---

## ⚙️ Configuration

### 🌍 Environment Variables

| Variable                  | Description                                   |
|---------------------------|-----------------------------------------------|
| `DISCORD_TOKEN`           | **Required.** Your **Discord bot token**.    |
| `REQUIRED_GUILD_ID`       | **Required.** ID of your **Discord server**. |
| `REQUIRED_ROLE_ADMIN`     | **Required.** Role ID for **Admin commands**. |
| `REQUIRED_ROLE_MOD`       | **Optional.** Role ID for **Moderator access**. |
| `REQUIRED_ROLE_USER`      | **Optional.** Role ID for **General users**. |
| `NOTIFICATION_CHANNEL_ID` | **Required.** Channel ID for **library updates**. |
| `KAVITA_URL`             | **Required.** URL to your **Kavita instance**. |
| `KAVITA_API_KEY`         | **Required.** API key for **Kavita authentication**. |
| `KAVITA_LIBRARY_IDS`     | **Optional.** Library IDs to give to new users. |

📌 See `.env.example` for a full template.

---

## 💻 Development Setup

For local development:
```bash
npm install  # Install dependencies
node initmain.mjs  # Run bot locally
```
Test commands in your Discord server after setup.

---

## ⚡ Command Reference

### 🏠 General Commands

| Command      | Description                                         |
|--------------|-----------------------------------------------------|
| `/search`    | Search for a series by title.                      |
| `/scan`      | Display libraries and initiate a scan.             |
| `/join`      | Create a Kavita account and provide an invite link. |
| `/ding`      | Test if the bot is responsive.                     |

### 🛠 Admin Commands

| Command                 | Description                                  |
|-------------------------|----------------------------------------------|
| `/admin role`           | Assign or manage roles for a Kavita user.   |
| `/admin server-status`  | Display Kavita server statistics.           |
| `/admin server-maintenance` | Trigger maintenance tasks for Kavita.  |

---

## 🤝 Contributing

We welcome contributions! 🚀

### 🛠 How to Contribute:
1️⃣ **Fork** the repository.  
2️⃣ **Create a new branch** for your feature.  
3️⃣ **Submit a pull request** for review.

**🔗 Issues & Feature Requests:** [GitHub Issues](https://github.com/The-Noona-Project/Noona-Portal/issues)

---

## 📜 License

**Noona-Portal** is open-source under the [GNU General Public License v2](LICENSE).

---

## 🎉 Acknowledgments

💙 Thanks to:
- **[Kavita](https://www.kavitareader.com/)** – Robust library management platform.
- **[Discord.js](https://discord.js.org/)** – Powerful Discord API library.
- **The Noona Project Community** – For ideas, testing, and contributions.

---

## 🚀 Get Started Now!

🔗 **[GitHub Repo](https://github.com/The-Noona-Project/Noona-Portal)**  
🛠 **[Docker Hub](https://hub.docker.com/r/captainpax/noona-portal)**  
💬 **[Discord Community](https://discord.com/)** (coming soon!)

Happy reading & managing with **Noona-Portal**! 📚✨  
