import { config } from 'dotenv';
import { beforeEach, describe, expect, it } from 'vitest';
import RaindropService from '../src/services/raindrop.service.js';
import type { components } from '../src/types/raindrop.schema.js';
type Collection = components['schemas']['Collection'];
type Bookmark = components['schemas']['Bookmark'];
type Highlight = components['schemas']['Highlight'];
type Tag = components['schemas']['Tag'];
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
    expect(Array.isArray(collections.result)).toBe(true);
    if (Array.isArray(collections.result) && collections.result.length > 0) {
      expect(collections.result[0]).toHaveProperty('_id');
    }
  });

  it('fetches user info', async () => {
    const user = await service.getUserInfo();
    expect(user).toBeDefined();
    expect(user).toHaveProperty('email');
  });

  it('searches for bookmarks (read-only)', async () => {
    const result = await service.search({ search: 'test' });
    if (result && typeof result === 'object' && 'result' in result && typeof result.result === 'object') {
      const res = result as { result: { items: any[]; count: number } };
      expect(Array.isArray(res.result.items)).toBe(true);
      expect(typeof res.result.count).toBe('number');
    }
  });

  it('fetches all tags', async () => {
    const tags = await service.getTags();
    expect(Array.isArray(tags)).toBe(true);
  });

  it('fetches tags for a valid collection (if any exist)', async () => {
    const collections = await service.getCollections();
    if (Array.isArray(collections.result) && collections.result.length > 0 && collections.result[0]) {
      const tags = await service.getTagsByCollection(collections.result[0]._id);
      expect(Array.isArray(tags.result)).toBe(true);
    }
  });

  it('fetches highlights for a valid collection (if any exist)', async () => {
    const collections = await service.getCollections();
    if (Array.isArray(collections.result) && collections.result.length > 0 && collections.result[0]) {
      const highlights = await service.getHighlightsByCollection(collections.result[0]._id);
      expect(Array.isArray(highlights.result)).toBe(true);
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