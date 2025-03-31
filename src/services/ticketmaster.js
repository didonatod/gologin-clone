import axios from 'axios';

export class TicketmasterService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://app.ticketmaster.com/discovery/v2';
    }

    async searchEvents(keyword) {
        try {
            const response = await axios.get(`${this.baseUrl}/events.json`, {
                params: {
                    apikey: this.apiKey,
                    keyword,
                    size: 20
                }
            });
            return response.data._embedded?.events || [];
        } catch (error) {
            console.error('Failed to search events:', error);
            throw error;
        }
    }

    async getEventDetails(eventId) {
        try {
            const response = await axios.get(`${this.baseUrl}/events/${eventId}`, {
                params: {
                    apikey: this.apiKey
                }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get event details:', error);
            throw error;
        }
    }

    async getPriceRanges(eventId) {
        const event = await this.getEventDetails(eventId);
        return event.priceRanges || [];
    }
} 