const axios = require('axios');

const SERVER_TITAN_API_KEY = 'your_api_key';
const SERVER_TITAN_URL = 'https://api.servertitan.com/v1';

const serverTitanAPI = axios.create({
    baseURL: SERVER_TITAN_URL,
    headers: { Authorization: `Bearer ${SERVER_TITAN_API_KEY}` },
});

async function initiateCall(toNumber, fromNumber) {
    try {
        const response = await serverTitanAPI.post('/calls', {
            to: toNumber,
            from: fromNumber,
            ai_enabled: true,
        });
        console.log('Call initiated:', response.data);
    } catch (error) {
        console.error('Error initiating call:', error.response?.data || error.message);
    }
}

module.exports = { initiateCall };
