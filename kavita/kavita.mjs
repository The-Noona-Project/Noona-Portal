// ✅ /kavita/kavita.mjs — Kavita API Handler (Noona Style)

import axios from 'axios';
import dotenv from 'dotenv';
import { EmbedBuilder } from 'discord.js';
import {
    printStep,
    printDebug,
    printResult,
    printError
} from '../noona/logger/logUtils.mjs';

dotenv.config();

class KavitaAPI {
    constructor() {
        this.baseUrl = process.env.KAVITA_URL;
        this.apiKey = process.env.KAVITA_API_KEY;
        this.jwtToken = null;
    }

    async authenticate() {
        const url = `${this.baseUrl}/api/Plugin/authenticate?apiKey=${this.apiKey}&pluginName=NoonaPortal`;
        printStep('[Kavita] Authenticating with Kavita...');

        try {
            const res = await axios.post(url);
            this.jwtToken = res.data.token;
            printResult('[Kavita] ✅ Authentication successful');
            return true;
        } catch (err) {
            printError('[Kavita] ❌ Authentication failed:', err.message);
            return false;
        }
    }

    async fetchData(endpoint, method = 'GET', data = null, queryParams = null) {
        if (!this.jwtToken) {
            printDebug('[Kavita] No token cached — authenticating...');
            await this.authenticate();
        }

        let url = `${this.baseUrl}${endpoint}`;
        if (queryParams) {
            const params = new URLSearchParams(queryParams).toString();
            url += `?${params}`;
        }

        const config = {
            method,
            url,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.jwtToken}`
            }
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            config.data = data;
        }

        try {
            const res = await axios(config);
            return res.data;
        } catch (err) {
            if (err.response?.status === 401) {
                printDebug('[Kavita] Token expired — reauthenticating...');
                await this.authenticate();
                config.headers.Authorization = `Bearer ${this.jwtToken}`;
                const retry = await axios(config);
                return retry.data;
            }

            printError(`[Kavita] ❌ Request to ${endpoint} failed:`, err.message);
            return null;
        }
    }

    async getLibraries() {
        return await this.fetchData('/api/Library/libraries');
    }

    async searchSeries(term) {
        return await this.fetchData('/api/Search/search', 'GET', null, {
            queryString: encodeURIComponent(term)
        });
    }

    async getRecentlyAdded(libraryId = null, days = 7) {
        const endpoint = libraryId
            ? `/api/Series/recently-added?libraryId=${libraryId}&days=${days}`
            : `/api/Series/recently-added?days=${days}`;
        return await this.fetchData(endpoint);
    }

    async getUserRoles(userId) {
        return await this.fetchData(`/api/Users/${userId}/roles`);
    }

    async updateUserRoles(userId, roles) {
        return await this.fetchData(`/api/Users/${userId}/update-roles`, 'POST', { roles });
    }

    async getUserIdByEmail(email) {
        const users = await this.fetchData('/api/Users');
        if (!users) return null;
        const user = users.find(u => u.email === email);
        return user?.id || null;
    }

    async getSeriesByLibrary(libraryId) {
        const result = await this.fetchData('/api/Series/all-v2', 'POST', {
            libraryId: parseInt(libraryId)
        });

        return Array.isArray(result)
            ? result.filter(series => series.libraryId === parseInt(libraryId))
            : [];
    }

    async scanLibrary(libraryId) {
        return await this.fetchData(`/api/Library/scan`, 'POST', null, {
            libraryId: parseInt(libraryId)
        });
    }

    async scanAllLibraries() {
        const ids = process.env.KAVITA_LIBRARY_IDS?.split(',').map(id => parseInt(id.trim())) || [];
        if (!ids.length) return null;

        return await this.fetchData('/api/Library/scan-multiple', 'POST', {
            ids,
            force: true
        });
    }

    async createUser(email) {
        const libraryIds = process.env.KAVITA_LIBRARY_IDS?.split(',').map(id => parseInt(id.trim())) || [];

        const payload = {
            email,
            roles: ['User', 'Login', 'Change Password', 'Bookmark'],
            libraries: libraryIds,
            ageRestriction: { ageRating: 0, includeUnknowns: true }
        };

        const res = await this.fetchData('/api/Account/invite', 'POST', payload);
        if (!res) return null;

        if (res.emailLink) return res.emailLink;
        if (typeof res === 'string') {
            return res.startsWith('http') ? res : `${this.baseUrl}/invite?token=${res}`;
        }

        return null;
    }

    async checkForNewItems(libraryId, lookbackDays = null) {
        const allSeries = await this.getSeriesByLibrary(libraryId);
        if (!Array.isArray(allSeries)) return [];

        const hours = parseInt(process.env.KAVITA_LOOKBACK_HOURS, 10) || 168;
        const days = lookbackDays || hours / 24;
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        return allSeries.filter(series => {
            const created = new Date(series.created);
            return created >= cutoff;
        });
    }

    async sendNewItemNotifications(discordClient, notifiedIds) {
        const channelId = process.env.NOTIFICATION_CHANNEL_ID;
        if (!channelId) {
            printError('[Kavita] ❌ NOTIFICATION_CHANNEL_ID not set');
            return [];
        }

        const channel = await discordClient.channels.fetch(channelId);
        if (!channel) {
            printError(`[Kavita] ❌ Discord channel not found: ${channelId}`);
            return [];
        }

        const libraries = await this.getLibraries();
        if (!libraries?.length) return [];

        let newItems = [];

        for (const library of libraries) {
            const items = await this.checkForNewItems(library.id);
            const fresh = (items || []).filter(item => !notifiedIds.has(item.id));

            for (const item of fresh) {
                newItems.push({ ...item, libraryName: library.name });
            }
        }

        if (!newItems.length) return [];

        newItems.sort((a, b) => new Date(b.created) - new Date(a.created));
        const batches = Array.from({ length: Math.ceil(newItems.length / 10) }, (_, i) =>
            newItems.slice(i * 10, i * 10 + 10)
        );

        for (let i = 0; i < batches.length; i++) {
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`📚 New Series Added (${i + 1}/${batches.length})`)
                .setDescription(`${newItems.length} new series have been added to the library!`)
                .setTimestamp();

            batches[i].forEach(item => {
                embed.addFields({
                    name: item.name,
                    value: `**Library:** ${item.libraryName}\n**Added:** ${new Date(item.created).toLocaleDateString()}`,
                    inline: false
                });

                notifiedIds.add(item.id);
            });

            await channel.send({ embeds: [embed] });
        }

        return newItems;
    }
}

const instance = new KavitaAPI();
export default instance;
export const authenticateWithKavita = () => instance.authenticate();
export const checkForNewItems = (...args) => instance.checkForNewItems(...args);
export const sendNewItemNotifications = (...args) => instance.sendNewItemNotifications(...args);
