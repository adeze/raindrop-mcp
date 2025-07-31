
import axios from 'axios';
import { config } from 'dotenv';
import { describe, expect, it } from 'vitest';

config();
const raindropAccessToken = process.env.RAINDROP_ACCESS_TOKEN;



describe('.env configuration', () => {
  it('should load RAINDROP_ACCESS_TOKEN from environment variables and emit its value', () => {
    const accessToken = process.env.RAINDROP_ACCESS_TOKEN;
  
    // Emit the value for debugging (will show in Vitest output if test fails)
    expect(accessToken, `RAINDROP_ACCESS_TOKEN value: ${accessToken}`).toBeDefined();
  });
});

describe('Raindrop API Integration', () => {
  it('fetches highlights from the API', async () => {
    if (!raindropAccessToken) {
      throw new Error('RAINDROP_ACCESS_TOKEN environment variable is required. Please check your .env file or environment settings.');
    }

    const api = axios.create({
      baseURL: 'https://api.raindrop.io/rest/v1',
      headers: {
        Authorization: `Bearer ${raindropAccessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const userHighlightsResponse = await api.get('/highlights');
    expect(userHighlightsResponse.status).toBe(200);
    expect(userHighlightsResponse.data).toHaveProperty('items');
    expect(Array.isArray(userHighlightsResponse.data.items)).toBe(true);
  });
});