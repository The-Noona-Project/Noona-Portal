import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class KavitaAPI {
    constructor() {
        this.baseUrl = process.env.KAVITA_URL;
        this.apiKey = process.env.KAVITA_API_KEY;
        this.jwtToken = null;
        
        this.authenticate().catch(error => {
            console.error('❌ Initial Kavita authentication failed:', error);
        });
    }

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

    async getLibraries() {
        console.log(`📡 Fetching library list from Kavita...`);
        return await this.fetchData('/api/Library/libraries');
    }

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

    async searchSeries(term) {
        return await this.fetchData(`/api/Search/search`, 'GET', null, {
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
        console.log(`📡 Looking up user ID for email: ${email}`);
        const users = await this.fetchData('/api/Users');
        if (!users) return null;
        
        const user = users.find(u => u.email === email);
        return user ? user.id : null;
    }

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

    async scanLibrary(libraryId) {
        console.log(`🔍 Initiating scan for library ID ${libraryId}...`);
        return await this.fetchData(`/api/Library/scan`, 'POST', null, {
            libraryId: parseInt(libraryId)
        });
    }

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
}

export default new KavitaAPI();
