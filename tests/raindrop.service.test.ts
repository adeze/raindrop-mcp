

describe('RaindropService API Integration', () => {
import { config } from 'dotenv';
import { describe, expect, it } from 'vitest';
import RaindropService from '../src/services/raindrop.service.js';
config();

describe('RaindropService Read-Only API Integration', () => {
  it('fetches all highlights', async () => {
    const highlights = await RaindropService.getAllHighlights();
    expect(Array.isArray(highlights)).toBe(true);
  });

  it('fetches all collections', async () => {
    const collections = await RaindropService.getCollections();
    expect(Array.isArray(collections)).toBe(true);
    if (collections.length > 0) {
      expect(collections[0]).toHaveProperty('_id');
    }
  });

  it('fetches user info', async () => {
    const user = await RaindropService.getUserInfo();
    expect(user).toBeDefined();
    expect(user).toHaveProperty('email');
  });

  it('searches for bookmarks (read-only)', async () => {
    const { items, count } = await RaindropService.search({ search: 'test' });
    expect(Array.isArray(items)).toBe(true);
    expect(typeof count).toBe('number');
  });

  it('fetches all tags', async () => {
    const tags = await RaindropService.getTags();
    expect(Array.isArray(tags)).toBe(true);
  });

  it('fetches tags for a valid collection (if any exist)', async () => {
    const collections = await RaindropService.getCollections();
    if (collections.length > 0) {
      const tags = await RaindropService.getTagsByCollection(collections[0]._id);
      expect(Array.isArray(tags)).toBe(true);
    }
  });

  it('fetches highlights for a valid collection (if any exist)', async () => {
    const collections = await RaindropService.getCollections();
    if (collections.length > 0) {
      const highlights = await RaindropService.getHighlightsByCollection(collections[0]._id);
      expect(Array.isArray(highlights)).toBe(true);
    }
  });

  it('handles error for invalid collection id in getTagsByCollection', async () => {
    await expect(RaindropService.getTagsByCollection(-1)).rejects.toBeInstanceOf(Error);
  });

  it('handles error for invalid collection id in getHighlightsByCollection', async () => {
    await expect(RaindropService.getHighlightsByCollection(-1)).rejects.toBeInstanceOf(Error);
  });
});