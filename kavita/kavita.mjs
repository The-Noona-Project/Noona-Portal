import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Class representing the Kavita API integration.
 */
class KavitaAPI {
    /**
     * Initializes a new instance of the KavitaAPI class.
     * Automatically attempts authentication on initialization.
     */
    constructor() {
        this.baseUrl = process.env.KAVITA_URL;
        this.apiKey = process.env.KAVITA_API_KEY;
        this.jwtToken = null;

        this.authenticate().catch(error => {
            console.error('❌ Initial Kavita authentication failed:', error);
        });
    }

    /**
     * Authenticates with Kavita API using the provided API key and retrieves a JWT token.
     * @returns {Promise<void>} A promise that resolves after authentication.
     * @example
     * const kavitaAPI = new KavitaAPI();
     * await kavitaAPI.authenticate();
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
     * Fetches the list of libraries available in Kavita.
     * @returns {Promise<Object[]>} A promise that resolves to an array of library objects.
     * @example
     * const libraries = await kavitaAPI.getLibraries();
     * console.log(libraries);
     */
    async getLibraries() {
        console.log(`📡 Fetching library list from Kavita...`);
        return await this.fetchData('/api/Library/libraries');
    }

    /**
     * Fetches data from a specified Kavita API endpoint.
     * Automatically retries authentication if the token is expired (401 error).
     *
     * @param {string} endpoint - The API endpoint to call.
     * @param {string} [method='GET'] - The HTTP method to use.
     * @param {Object|null} [data=null] - Optional data payload for POST/PUT requests.
     * @param {Object|null} [queryParams=null] - Optional query parameters.
     * @returns {Promise<Object|null>} A promise that resolves to the response data or null on error.
     *
     * @example
     * const data = await kavitaAPI.fetchData('/api/Library/libraries');
     * console.log(data);
     */
    async fetchData(endpoint, method = 'GET', data = null, queryParams = null) {
        if (!this.jwtToken) {
            await this.authenticate();
        }

        try {
            let url = `${this.baseUrl}${endpoint}`;

            if (queryParams) {
                const params = new URLSearchParams();
                for (const [key, value] of Object.entries(queryParams)) {
                    params.append(key, value);
                }
                url += `?${params.toString()}`;
            }

            console.log(`🔗 Making ${method} request to: ${url}`);

            const config = {
                method: method,
                url: url,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.jwtToken}`
                }
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            if (error.response) {
                console.error(`❌ API Error (${error.response.status}):`);
                console.error('📄 Error response data:', JSON.stringify(error.response.data));
                console.error('🔍 Request that caused error:', {
                    url: error.config.url,
                    method: error.config.method,
                    data: error.config.data
                });

                if (error.response.status === 401) {
                    console.log('🔄 Token expired, reauthenticating...');
                    await this.authenticate();

                    config.headers.Authorization = `Bearer ${this.jwtToken}`;

                    try {
                        const retryResponse = await axios(config);
                        return retryResponse.data;
                    } catch (retryError) {
                        console.error('❌ API Error after reauthentication:', retryError.message);
                        return null;
                    }
                }
            } else if (error.request) {
                console.error('❌ No response received:', error.message);
            } else {
                console.error('❌ Request setup error:', error.message);
            }
            return null;
        }
    }

    /**
     * Searches for a series matching a search term.
     * @param {string} term - The search query.
     * @returns {Promise<Object[]>} A promise that resolves to an array of series matching the query.
     * @example
     * const results = await kavitaAPI.searchSeries('One Piece');
     * console.log(results);
     */
    async searchSeries(term) {
        return await this.fetchData(`/api/Search/search`, 'GET', null, {
            queryString: encodeURIComponent(term)
        });
    }

    /**
     * Retrieves recently added series from a specific library or all libraries.
     * @param {number|null} [libraryId=null] - The ID of the library to filter by (optional).
     * @param {number} [days=7] - The number of past days to consider.
     * @returns {Promise<Object[]>} A promise that resolves to an array of recently added series.
     * @example
     * const recent = await kavitaAPI.getRecentlyAdded(1, 14);
     * console.log(recent);
     */
    async getRecentlyAdded(libraryId = null, days = 7) {
        const endpoint = libraryId
            ? `/api/Series/recently-added?libraryId=${libraryId}&days=${days}`
            : `/api/Series/recently-added?days=${days}`;

        return await this.fetchData(endpoint);
    }

    /**
     * Retrieves the roles assigned to a specific user.
     * @param {number} userId - The ID of the user.
     * @returns {Promise<string[]>} A promise that resolves to an array of user roles.
     * @example
     * const roles = await kavitaAPI.getUserRoles(123);
     * console.log(roles);
     */
    async getUserRoles(userId) {
        return await this.fetchData(`/api/Users/${userId}/roles`);
    }

    /**
     * Updates the roles assigned to a user.
     * @param {number} userId - The ID of the user.
     * @param {string[]} roles - The new roles to assign to the user.
     * @returns {Promise<Object>} A promise that resolves to the API response.
     * @example
     * const response = await kavitaAPI.updateUserRoles(123, ['Admin', 'Editor']);
     * console.log(response);
     */
    async updateUserRoles(userId, roles) {
        return await this.fetchData(`/api/Users/${userId}/update-roles`, 'POST', {roles});
    }

    /**
     * Fetches the user ID associated with a given email.
     * @param {string} email - The email of the user.
     * @returns {Promise<number|null>} A promise that resolves to the user ID or null if not found.
     * @example
     * const userId = await kavitaAPI.getUserIdByEmail('user@example.com');
     * console.log(userId);
     */
    async getUserIdByEmail(email) {
        console.log(`📡 Looking up user ID for email: ${email}`);
        const users = await this.fetchData('/api/Users');
        if (!users) return null;

        const user = users.find(u => u.email === email);
        return user ? user.id : null;
    }

    /**
     * Fetches all series in a specific library.
     * @param {number} libraryId - The ID of the library.
     * @returns {Promise<Object[]>} A promise that resolves to an array of series in the library.
     * @example
     * const series = await kavitaAPI.getSeriesByLibrary(1);
     * console.log(series);
     */
    async getSeriesByLibrary(libraryId) {
        console.log(`📡 Fetching series from library ID ${libraryId}...`);

        try {
            const result = await this.fetchData('/api/Series/all-v2', 'POST', {
                libraryId: parseInt(libraryId)
            });

            if (!result) {
                console.error('❌ No data returned from API');
                return [];
            }

            const filteredResults = result.filter(series => {
                return series.libraryId === parseInt(libraryId);
            });

            return filteredResults;
        } catch (error) {
            console.error(`❌ Error fetching series for library ID ${libraryId}:`, error);
            return [];
        }
    }

    /**
     * Initiates a scan for a specific library.
     * @param {number} libraryId - The ID of the library to scan.
     * @returns {Promise<Object>} A promise that resolves to the scan result.
     * @example
     * const scanResult = await kavitaAPI.scanLibrary(1);
     * console.log(scanResult);
     */
    async scanLibrary(libraryId) {
        console.log(`🔍 Initiating scan for library ID ${libraryId}...`);
        return await this.fetchData(`/api/Library/scan`, 'POST', null, {
            libraryId: parseInt(libraryId)
        });
    }

    /**
     * Invites a new user to Kavita by sending an invitation email.
     * @param {string} email - The email address of the new user.
     * @returns {Promise<string|null>} A promise that resolves to the invitation link or null on failure.
     * @example
     * const inviteLink = await kavitaAPI.createUser('user@example.com');
     * console.log(inviteLink);
     */
    async createUser(email) {
        console.log(`📡 Inviting new user with email: ${email}`);

        let libraryIds = [];
        if (process.env.KAVITA_LIBRARY_IDS) {
            try {
                libraryIds = process.env.KAVITA_LIBRARY_IDS.split(',').map(id => parseInt(id.trim(), 10));
                console.log(`📚 Using library IDs: ${libraryIds.join(', ')}`);
            } catch (error) {
                console.error('❌ Error parsing KAVITA_LIBRARY_IDS:', error.message);
            }
        } else {
            console.log('⚠️ No KAVITA_LIBRARY_IDS found in environment variables. User will have no library access.');
        }

        const inviteData = {
            email: email,
            roles: ["User", "Login", "Change Password", "Bookmark"],
            libraries: libraryIds,
            ageRestriction: {
                ageRating: 0,
                includeUnknowns: true
            }
        };

        try {
            console.log(`📡 Sending invite request with data: ${JSON.stringify(inviteData)}`);
            const response = await this.fetchData('/api/Account/invite', 'POST', inviteData);

            if (response) {
                if (response.emailLink) {
                    console.log(`✅ Invite created successfully. Email sent: ${response.emailSent}`);
                    return response.emailLink;
                } else if (typeof response === 'string') {
                    if (response.startsWith('http')) {
                        return response;
                    } else if (this.baseUrl) {
                        return `${this.baseUrl}/invite?token=${response}`;
                    }
                } else {
                    console.error('❌ Failed to create invite URL: No valid link in response', response);
                    return null;
                }
            } else {
                console.error('❌ Failed to create user invitation: Invalid response');
                return null;
            }
        } catch (error) {
            console.error('❌ Failed to invite user:', error.message);
            return null;
        }
    }

    async scanAllLibraries() {
        console.log(`🔍 Initiating scan for all configured libraries...`);
        
        let libraryIds = [];
        if (process.env.KAVITA_LIBRARY_IDS) {
            try {
                libraryIds = process.env.KAVITA_LIBRARY_IDS.split(',').map(id => parseInt(id.trim(), 10));
                console.log(`📚 Scanning library IDs: ${libraryIds.join(', ')}`);
            } catch (error) {
                console.error('❌ Error parsing KAVITA_LIBRARY_IDS:', error.message);
                return null;
            }
        } else {
            console.error('❌ No KAVITA_LIBRARY_IDS found in environment variables.');
            return null;
        }
        
        if (libraryIds.length === 0) {
            console.error('❌ No valid library IDs to scan.');
            return null;
        }
        
        const requestBody = {
            ids: libraryIds,
            force: true
        };
        
        return await this.fetchData('/api/Library/scan-multiple', 'POST', requestBody);
    }
}

export default new KavitaAPI();