import axios from 'axios';

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'x-apisports-key': API_KEY,
  },
});

export const apiFootball = {
  // Get all fixtures for the World Cup 2026
  getMatches: async () => {
    try {
      const response = await apiClient.get('/fixtures', {
        params: {
          league: 1, // World Cup
          season: 2026,
        },
      });
      return response.data.response;
    } catch (error) {
      console.error('Error fetching matches:', error);
      throw error;
    }
  },

  // Get odds for a specific fixture
  getOdds: async (fixtureId: number) => {
    try {
      const response = await apiClient.get('/odds', {
        params: {
          fixture: fixtureId,
          bookmaker: 8, // Bet365 or similar standard bookmaker
        },
      });
      return response.data.response;
    } catch (error) {
      console.error(`Error fetching odds for fixture ${fixtureId}:`, error);
      throw error;
    }
  },
};
