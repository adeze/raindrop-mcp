import { config } from 'dotenv';
import { beforeEach, describe, expect, it } from 'vitest';
import RaindropService from '../src/services/raindrop.service.js';
import type { components } from '../src/types/raindrop.schema.js';
type Collection = components['schemas']['Collection'];
type Bookmark = components['schemas']['Bookmark'];
type Highlight = components['schemas']['Highlight'];
type Tag = components['schemas']['Tag'];
config();

// Test constants for known collection and raindrop IDs (populate these as needed)
const TEST_COLLECTION_ID = 55725911; // <-- set your known collection ID here
const TEST_RAINDROP_ID = 1286757883;   // <-- set your known raindrop/bookmark ID here

describe('RaindropService Read-Only API Integration', () => {
  let service: RaindropService;

  beforeEach(() => {
    service = new RaindropService();
  });

  it('fetches user info', async () => {
    const user = await service.getUserInfo();
    expect(user).toBeDefined();
    expect(user).toHaveProperty('email');
  });

  it('fetches highlights for a specific bookmark', async () => {
    const highlights = await service.getHighlights(TEST_RAINDROP_ID);
    expect(Array.isArray(highlights)).toBe(true);
  });

  it('fetches all highlights', async () => {
    const highlights = await service.getAllHighlights();
    expect(Array.isArray(highlights)).toBe(true);
  });

  it('handles error for invalid bookmark id in getHighlights', async () => {
    await expect(service.getHighlights(-1)).rejects.toThrow();
  });
});