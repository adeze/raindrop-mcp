import { config } from 'dotenv';
import { beforeEach, describe, expect, it } from 'vitest';
import RaindropService, { isApiError } from '../src/services/raindrop.service.js';
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
    const highlights = await service.getAllHighlights();
    expect(Array.isArray(highlights)).toBe(true);
  });

  it('fetches all collections', async () => {
    const collections = await service.getCollections();
    expect(collections).toBeDefined();
    expect(collections).toHaveProperty('result');
    expect(Array.isArray(collections.result)).toBe(true);
    if (collections.result.length > 0) {
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

  // it('creates, updates, and deletes a collection', async () => {
  //   const created = await service.createCollection('Test Collection', false);
  //   expect(created).toBeDefined();
  //   expect(isApiSuccess(created)).toBe(true);
  //   if (isApiSuccess(created)) {
  //     const collectionId = created.data._id;
  //     expect(typeof collectionId).toBe('number');
  //     const updated = await service.updateCollection(collectionId, { title: 'Updated Title' });
  //     expect(updated).toBeDefined();
  //     expect(isApiSuccess(updated)).toBe(true);
  //     if (isApiSuccess(updated)) {
  //       expect(updated.data.title).toBe('Updated Title');
  //     }
  //     const deleted = await service.deleteCollection(collectionId);
  //     expect(deleted).toBeDefined();
  //     expect(isApiSuccess(deleted)).toBe(true);
  //   }
  // });

  // it('creates, updates, and deletes a bookmark', async () => {
  //   const collections = await service.getCollections();
  //   expect(isApiSuccess(collections)).toBe(true);
  //   if (isApiSuccess(collections) && Array.isArray(collections.data) && collections.data.length > 0 && collections.data[0]) {
  //     const collectionId = collections.data[0]._id;
  //     expect(typeof collectionId).toBe('number');
  //     const created = await service.createBookmark(collectionId, {
  //       link: 'https://example.com',
  //       title: 'Example',
  //       tags: ['test'],
  //       important: true
  //     });
  //     expect(created).toBeDefined();
  //     expect(isApiSuccess(created)).toBe(true);
  //     if (isApiSuccess(created)) {
  //       const bookmarkId = created.data._id;
  //       expect(typeof bookmarkId).toBe('number');
  //       const updated = await service.updateBookmark(bookmarkId, { title: 'Updated Example' });
  //       expect(updated).toBeDefined();
  //       expect(isApiSuccess(updated)).toBe(true);
  //       if (isApiSuccess(updated)) {
  //         expect(updated.data.title).toBe('Updated Example');
  //       }
  //       const deleted = await service.deleteBookmark(bookmarkId);
  //       expect(deleted).toBeDefined();
  //       expect(isApiSuccess(deleted)).toBe(true);
  //     }
  //   }
  // });

  // it('renames, merges, and deletes tags', async () => {
  //   const collections = await service.getCollections();
  //   expect(isApiSuccess(collections)).toBe(true);
  //   if (isApiSuccess(collections) && Array.isArray(collections.data) && collections.data.length > 0 && collections.data[0]) {
  //     const collectionId = collections.data[0]._id;
  //     expect(typeof collectionId).toBe('number');
  //     const rename = await service.renameTag(collectionId, 'test', 'test-renamed');
  //     expect(rename).toBeDefined();
  //     expect(isApiSuccess(rename)).toBe(true);
  //     const merge = await service.mergeTags(collectionId, ['test-renamed'], 'merged-tag');
  //     expect(merge).toBeDefined();
  //     expect(isApiSuccess(merge)).toBe(true);
  //     const del = await service.deleteTags(collectionId, ['merged-tag']);
  //     expect(del).toBeDefined();
  //     expect(isApiSuccess(del)).toBe(true);
  //   }
  // });

  // it('creates, updates, and deletes a highlight', async () => {
  //   const collections = await service.getCollections();
  //   expect(isApiSuccess(collections)).toBe(true);
  //   if (isApiSuccess(collections) && Array.isArray(collections.data) && collections.data.length > 0 && collections.data[0]) {
  //     const collectionId = collections.data[0]._id;
  //     expect(typeof collectionId).toBe('number');
  //     const bookmarks = await service.getBookmarks({ collection: collectionId });
  //     expect(isApiSuccess(bookmarks)).toBe(true);
  //     if (isApiSuccess(bookmarks) && Array.isArray(bookmarks.data.items) && bookmarks.data.items.length > 0 && bookmarks.data.items[0]) {
  //       const bookmarkId = bookmarks.data.items[0]._id;
  //       expect(typeof bookmarkId).toBe('number');
  //       const created = await service.createHighlight(bookmarkId, {
  //         text: 'Highlight text',
  //         color: 'yellow'
  //       });
  //       expect(created).toBeDefined();
  //       expect(isApiSuccess(created)).toBe(true);
  //       if (isApiSuccess(created)) {
  //         const highlightId = created.data._id;
  //         expect(typeof highlightId).toBe('number');
  //         const updated = await service.updateHighlight(Number(highlightId), { text: 'Updated highlight' });
  //         expect(updated).toBeDefined();
  //         expect(isApiSuccess(updated)).toBe(true);
  //         if (isApiSuccess(updated)) {
  //           expect(updated.data.text).toBe('Updated highlight');
  //         }
  //         const deleted = await service.deleteHighlight(Number(highlightId));
  //         expect(deleted).toBeDefined();
  //         expect(isApiSuccess(deleted)).toBe(true);
  //       }
  //     }
  //   }
  // });

  it('handles error for invalid bookmark id in getHighlights', async () => {
    const result = await service.getHighlights(-1);
    expect(isApiError(result)).toBe(true);
  });

  it('handles error for invalid highlight id in updateHighlight', async () => {
    const result = await service.updateHighlight(-1, { text: 'fail' });
    expect(isApiError(result)).toBe(true);
  });

  it('handles error for invalid highlight id in deleteHighlight', async () => {
    const result = await service.deleteHighlight(-1);
    expect(isApiError(result)).toBe(true);
  });
});