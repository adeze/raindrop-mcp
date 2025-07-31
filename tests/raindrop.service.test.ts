
import { config } from 'dotenv';
import { describe, expect, it } from 'vitest';
import RaindropService from '../src/services/raindrop.service.js';
config(); // Load .env file

describe('RaindropService API Integration', () => {
  it('should fetch all highlights (static method)', async () => {
    const highlights = await RaindropService.getAllHighlights();
    expect(Array.isArray(highlights)).toBe(true);
    // Optionally log for debug
    // console.log(`Fetched ${highlights.length} highlights`);
  });

  it('should fetch collections', async () => {
    const collections = await RaindropService.getCollections();
    expect(Array.isArray(collections)).toBe(true);
    if (collections.length > 0) {
      expect(collections[0]).toHaveProperty('_id');
    }
  });

  it('should fetch user info', async () => {
    const user = await RaindropService.getUserInfo();
    expect(user).toBeDefined();
    expect(user).toHaveProperty('email');
  });

  it('should search bookmarks (may be empty)', async () => {
    const { items, count } = await RaindropService.search({ search: 'test' });
    expect(Array.isArray(items)).toBe(true);
    expect(typeof count).toBe('number');
  });

  it('should fetch tags (may be empty)', async () => {
    const tags = await RaindropService.getTags();
    expect(Array.isArray(tags)).toBe(true);
  });
});