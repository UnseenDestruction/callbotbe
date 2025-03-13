const axios = require('axios');

const ZENDESK_SUBDOMAIN = 'your_subdomain';
const ZENDESK_EMAIL = 'your_email@example.com';
const ZENDESK_API_TOKEN = 'your_api_token';

const zendeskAPI = axios.create({
    baseURL: `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2`,
    auth: {
        username: `${ZENDESK_EMAIL}/token`,
        password: ZENDESK_API_TOKEN,
    },
    headers: { 'Content-Type': 'application/json' },
});

async function createTicket(subject, description) {
    try {
        const response = await zendeskAPI.post('/tickets.json', {
            ticket: {
                subject,
                description,
                priority: 'normal',
            },
        });
        console.log('Ticket Created:', response.data);
    } catch (error) {
        console.error('Error creating ticket:', error.response?.data || error.message);
    }
}

module.exports = { createTicket };
