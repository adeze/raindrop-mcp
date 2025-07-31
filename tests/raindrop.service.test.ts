

import { config } from 'dotenv';
import { describe, expect, it } from 'vitest';
import RaindropService from '../src/services/raindrop.service.js';
config();

describe('RaindropService API Integration', () => {
  it('fetches highlights, collections, user info, bookmarks, and tags', async () => {
    const highlights = await RaindropService.getAllHighlights();
    expect(Array.isArray(highlights)).toBe(true);

    const collections = await RaindropService.getCollections();
    expect(Array.isArray(collections)).toBe(true);
    if (collections.length > 0) expect(collections[0]).toHaveProperty('_id');

    const user = await RaindropService.getUserInfo();
    expect(user).toBeDefined();
    expect(user).toHaveProperty('email');

    const { items, count } = await RaindropService.search({ search: 'test' });
    expect(Array.isArray(items)).toBe(true);
    expect(typeof count).toBe('number');

    const tags = await RaindropService.getTags();
    expect(Array.isArray(tags)).toBe(true);
  });
});