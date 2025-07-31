
import axios from 'axios';
import { config } from 'dotenv';

config(); // Load .env file

// Check if the token exists
const raindropAccessToken = process.env.RAINDROP_ACCESS_TOKEN;
if (!raindropAccessToken) {
  // Use more graceful handling in production
  throw new Error('RAINDROP_ACCESS_TOKEN environment variable is required. Please check your .env file or environment settings.');
}



async function testRaindropAPI() {
  const api = axios.create({
    baseURL: 'https://api.raindrop.io/rest/v1',
    headers: {
      Authorization: `Bearer ${raindropAccessToken}`,
      'Content-Type': 'application/json',
    },
  });

  try {
    // Test different endpoints
    const userHighlightsResponse = await api.get('/highlights');
    console.log('User Highlights Response:', JSON.stringify(userHighlightsResponse.data, null, 2));

    const highlightsResponse = await api.get('/highlights');
    console.log('Highlights Response:', JSON.stringify(highlightsResponse.data, null, 2));
  } catch (error) {
    console.error('API Error:', error.response?.status, error.response?.data || error.message);
  }
}

testRaindropAPI();