/**
 * @fileoverview
 * Kavita API Handler for Noona-Portal (Initialization & Read Operations)
 *
 * Handles authentication, library search, recently added content, and user info lookup.
 * This module provides a singleton Kavita API instance and wraps safe calls with auto-auth fallback.
 *
 * @module initKavita
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { printStep, printDebug, printResult, printError } from '../noona/logger/logUtils.mjs';

dotenv.config();

class KavitaAPI {
    constructor() {
        this.baseUrl = process.env.KAVITA_URL;
        this.apiKey = process.env.KAVITA_API_KEY;
        this.jwtToken = null;
    }

    /**
     * Authenticates with Kavita and stores the JWT token.
     * @returns {Promise<boolean>}
     */
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

    /**
     * Sends an authenticated request to Kavita API.
     * Auto re-authenticates if token is missing or expired.
     *
     * @param {string} endpoint - API endpoint to hit
     * @param {'GET'|'POST'|'PUT'} [method='GET'] - HTTP method
     * @param {object|null} [data=null] - Optional payload
     * @param {object|null} [queryParams=null] - Optional query params
     * @returns {Promise<any|null>}
     */
    async fetchData(endpoint, method = 'GET', data = null, queryParams = null) {
        if (!this.jwtToken) {
            printDebug('[Kavita] No token cached — authenticating...');
            const authSuccess = await this.authenticate();
            if (!authSuccess) {
                printError('[Kavita] ❌ Failed to authenticate before request');
                return null;
            }
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
                const authSuccess = await this.authenticate();
                if (!authSuccess) {
                    printError('[Kavita] ❌ Failed to re-authenticate after token expiration');
                    return null;
                }
                config.headers.Authorization = `Bearer ${this.jwtToken}`;
                const retry = await axios(config);
                return retry.data;
            }
            printError(`[Kavita] ❌ Request to ${endpoint} failed:`, err.message);
            return null;
        }
    }

    /** @returns {Promise<any[]>} */
    async getLibraries() {
        return await this.fetchData('/api/Library/libraries');
    }

    /**
     * @param {string} term - Search term
     * @returns {Promise<any[]>}
     */
    async searchSeries(term) {
        return await this.fetchData('/api/Search/search', 'GET', null, {
            queryString: encodeURIComponent(term)
        });
    }

    /**
     * @param {number|null} libraryId
     * @param {number} [days=7]
     * @returns {Promise<any[]>}
     */
    async getRecentlyAdded(libraryId = null, days = 7) {
        const endpoint = libraryId
            ? `/api/Series/recently-added?libraryId=${libraryId}&days=${days}`
            : `/api/Series/recently-added?days=${days}`;
        return await this.fetchData(endpoint);
    }

    /**
     * @param {number} userId
     * @returns {Promise<any[]>}
     */
    async getUserRoles(userId) {
        return await this.fetchData(`/api/Users/${userId}/roles`);
    }

    /**
     * @param {string} email
     * @returns {Promise<number|null>} User ID or null
     */
    async getUserIdByEmail(email) {
        const users = await this.fetchData('/api/Users');
        if (!users) return null;
        const user = users.find(u => u.email === email);
        return user?.id || null;
    }
}

const instance = new KavitaAPI();

export default instance;
export const authenticateWithKavita = () => instance.authenticate();
export const getLibraries = () => instance.getLibraries();
export const searchSeries = (term) => instance.searchSeries(term);
export const getRecentlyAdded = (libraryId, days) => instance.getRecentlyAdded(libraryId, days);
export const getUserRoles = (userId) => instance.getUserRoles(userId);
export const getUserIdByEmail = (email) => instance.getUserIdByEmail(email);
