import { describe, it, expect } from 'vitest';
import RaindropService from '../src/services/raindrop.service.js';
// At the entry point of your application
import { config } from 'dotenv';
config(); // Load .env file

// Check if the token exists
const raindropAccessToken = process.env.RAINDROP_ACCESS_TOKEN;
if (!raindropAccessToken) {
  // Use more graceful handling in production
  throw new Error('RAINDROP_ACCESS_TOKEN environment variable is required. Please check your .env file or environment settings.');
}



// This test requires a valid access token in your config
describe('Raindrop API Endpoints', () => {
  it('should fetch highlights from /highlights endpoint', async () => {
    try {
      // Access the singleton instance and call getAllHighlights
      const highlights = await RaindropService.getAllHighlights();
      
      // We're just checking that it returns an array (may be empty if you have no highlights)
      expect(Array.isArray(highlights)).toBe(true);
      
      // Log the result to the test output for inspection
      console.log(`Fetched ${highlights.length} highlights`);
    } catch (error) {
      // This will make the test fail with the API error message
      expect(error).toBeUndefined();
    }
  });
});