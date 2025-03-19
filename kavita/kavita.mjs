import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

/**
 * Kavita API integration module.
 */
class KavitaAPI {
    /**
     * Initializes the KavitaAPI instance.
     */
    constructor() {
        this.baseUrl = process.env.KAVITA_URL;
        this.apiKey = process.env.KAVITA_API_KEY;
        this.jwtToken = null;
    }

    /**
     * Authenticates with the Kavita API to obtain a JWT token.
     * @returns {Promise<void>}
     */
    async authenticate() {
        const url = `${this.baseUrl}/api/Plugin/authenticate?apiKey=${this.apiKey}&pluginName=NoonaPortal`;
        console.log(`🔄 Authenticating with Kavita API...`);

        try {
            const response = await axios.post(url);
            this.jwtToken = response.data.token;
            console.log('✅ Successfully authenticated with Kavita API.');
        } catch (error) {
            console.error('❌ Kavita authentication failed:', error.message);
        }
    }

    /**
     * Fetches all libraries from Kavita.
     * @returns {Promise<Array>} - List of library objects.
     */
    async getLibraries() {
        console.log('📡 Fetching library list from Kavita...');
        return await this.fetchData('/api/Library');
    }

    /**
     * Makes an authenticated request to Kavita's API.
     * @param {string} endpoint - The API endpoint.
     * @param {string} [method='GET'] - HTTP method.
     * @param {Object} [body=null] - Request body.
     * @returns {Promise<any>}
     */
    async fetchData(endpoint, method = 'GET', body = null) {
        if (!this.jwtToken) await this.authenticate();

        const url = `${this.baseUrl}${endpoint}`;
        console.log(`🔄 API request: ${method} ${url}`);

        try {
            const response = await axios({
                method,
                url,
                headers: { Authorization: `Bearer ${this.jwtToken}` },
                data: body,
            });

            console.log(`✅ API response received from ${endpoint}`);
            return response.data;
        } catch (error) {
            console.error(`❌ API request failed for ${endpoint}:`, error.message);
            return null;
        }
    }
}

export default new KavitaAPI();
