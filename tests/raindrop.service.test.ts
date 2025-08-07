import { config } from 'dotenv';
import { beforeEach, describe, expect, it } from 'vitest';
import RaindropService from '../src/services/raindrop.service.js';
config();

describe('RaindropService Read-Only API Integration', () => {
  let service: RaindropService;

  beforeEach(() => {
    service = new RaindropService();
  });

  it('fetches all highlights', async () => {
    const highlights = await RaindropService.getAllHighlights();
    expect(Array.isArray(highlights)).toBe(true);
  });

  it('fetches all collections', async () => {
    const collections = await service.getCollections();
    expect(Array.isArray(collections)).toBe(true);
    if (collections.length > 0) {
      expect(collections[0]).toHaveProperty('_id');
    }
  });

  it('fetches user info', async () => {
    const user = await service.getUserInfo();
    expect(user).toBeDefined();
    expect(user).toHaveProperty('email');
  });

  it('searches for bookmarks (read-only)', async () => {
    const { items, count } = await service.search({ search: 'test' });
    expect(Array.isArray(items)).toBe(true);
    expect(typeof count).toBe('number');
  });

  it('fetches all tags', async () => {
    const tags = await service.getTags();
    expect(Array.isArray(tags)).toBe(true);
  });

  it('fetches tags for a valid collection (if any exist)', async () => {
    const collections = await service.getCollections();
    if (collections.length > 0 && collections[0]) {
      const tags = await service.getTagsByCollection(collections[0]._id);
      expect(Array.isArray(tags)).toBe(true);
    }
  });

  it('fetches highlights for a valid collection (if any exist)', async () => {
    const collections = await service.getCollections();
    if (collections.length > 0 && collections[0]) {
      const highlights = await service.getHighlightsByCollection(collections[0]._id);
      expect(Array.isArray(highlights)).toBe(true);
    }
  });

  it('handles error for invalid collection id in getTagsByCollection', async () => {
    await expect(service.getTagsByCollection(-1)).rejects.toBeInstanceOf(Error);
  });

  it('handles error for invalid collection id in getHighlightsByCollection', async () => {
    await expect(service.getHighlightsByCollection(-1)).rejects.toBeInstanceOf(Error);
  });
});
// No changes needed here. The test is correct.