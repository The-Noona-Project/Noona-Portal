// ✅ /kavita/kavita.mjs — Kavita API Handler

import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

class KavitaAPI {
    constructor() {
        this.baseUrl = process.env.KAVITA_URL;
        this.apiKey = process.env.KAVITA_API_KEY;
        this.jwtToken = null;
    }

    async authenticate() {
        const url = `${this.baseUrl}/api/Plugin/authenticate?apiKey=${this.apiKey}&pluginName=NoonaPortal`;

        try {
            const response = await axios.post(url);
            this.jwtToken = response.data.token;
            return true;
        } catch (error) {
            return false;
        }
    }

    async fetchData(endpoint, method = 'GET', data = null, queryParams = null) {
        if (!this.jwtToken) await this.authenticate();

        let url = `${this.baseUrl}${endpoint}`;
        if (queryParams) {
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(queryParams)) {
                params.append(key, value);
            }
            url += `?${params.toString()}`;
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

        if (data && (method === 'POST' || 'PUT')) config.data = data;

        try {
            const response = await axios(config);
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 401) {
                await this.authenticate();
                config.headers.Authorization = `Bearer ${this.jwtToken}`;
                const retry = await axios(config);
                return retry.data;
            }
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
        return user ? user.id : null;
    }

    async getSeriesByLibrary(libraryId) {
        try {
            const result = await this.fetchData('/api/Series/all-v2', 'POST', {
                libraryId: parseInt(libraryId)
            });
            return result?.filter(series => series.libraryId === parseInt(libraryId)) || [];
        } catch (err) {
            return [];
        }
    }

    async scanLibrary(libraryId) {
        return await this.fetchData(`/api/Library/scan`, 'POST', null, {
            libraryId: parseInt(libraryId)
        });
    }

    async scanAllLibraries() {
        let libraryIds = [];
        if (process.env.KAVITA_LIBRARY_IDS) {
            libraryIds = process.env.KAVITA_LIBRARY_IDS.split(',').map(id => parseInt(id.trim()));
        } else {
            return null;
        }
        const requestBody = { ids: libraryIds, force: true };
        return await this.fetchData('/api/Library/scan-multiple', 'POST', requestBody);
    }

    async createUser(email) {
        let libraryIds = [];

        if (process.env.KAVITA_LIBRARY_IDS) {
            libraryIds = process.env.KAVITA_LIBRARY_IDS.split(',').map(id => parseInt(id.trim()));
        }

        const inviteData = {
            email,
            roles: ['User', 'Login', 'Change Password', 'Bookmark'],
            libraries: libraryIds,
            ageRestriction: { ageRating: 0, includeUnknowns: true }
        };

        try {
            const res = await this.fetchData('/api/Account/invite', 'POST', inviteData);
            if (!res) return null;

            if (res.emailLink) return res.emailLink;
            if (typeof res === 'string') {
                if (res.startsWith('http')) return res;
                else return `${this.baseUrl}/invite?token=${res}`;
            }

            return null;
        } catch (err) {
            return null;
        }
    }

    async checkForNewItems(libraryId, lookbackDays = 7) {
        const recentItems = await this.getRecentlyAdded(libraryId, lookbackDays);
        return recentItems || [];
    }
}

const instance = new KavitaAPI();
export default instance;
export const authenticateWithKavita = () => instance.authenticate();
export const checkForNewItems = (...args) => instance.checkForNewItems(...args);
