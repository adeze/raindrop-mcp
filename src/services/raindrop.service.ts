// Simple, clean openapi-fetch REST client
import createClient from 'openapi-fetch';
import type { components, paths } from '../types/raindrop.schema.js';
import { createLogger } from '../utils/logger.js';

type Bookmark = components['schemas']['Bookmark'];
type Collection = components['schemas']['Collection'];
type Highlight = components['schemas']['Highlight'];


export default class RaindropService {
  private client;

  constructor(token?: string) {
    this.client = createClient<paths>({
      baseUrl: 'https://api.raindrop.io/rest/v1',
      headers: {
        Authorization: `Bearer ${token || process.env.RAINDROP_ACCESS_TOKEN}`,
      },
    });
    this.client.use({
      onRequest({ request }) {
        if (process.env.NODE_ENV === 'development') {
          // Use project logger instead of console to avoid polluting STDIO
          const logger = createLogger('raindrop-service');
          logger.debug(`${request.method} ${request.url}`);
        }
        return request;
      },
      onResponse({ response }) {
        if (!response.ok) {
          let errorMsg = `API Error: ${response.status} ${response.statusText}`;
          if (response.status === 401) {
            errorMsg += '. Check your RAINDROP_ACCESS_TOKEN';
          } else if (response.status === 429) {
            errorMsg += '. Rate limited - wait before making more requests';
          }
          throw new Error(errorMsg);
        }
        return response;
      }
    });
  }

  /**
   * Fetch all collections
   * Raindrop.io API: GET /collections
   */
  async getCollections(): Promise<Collection[]> {
    const { data } = await this.client.GET('/collections');
    return [...(data?.items || [])];
  }

  /**
   * Fetch a single collection by ID
   * Raindrop.io API: GET /collection/{id}
   */
  async getCollection(id: number): Promise<Collection> {
    const { data } = await this.client.GET('/collection/{id}', {
      params: { path: { id } }
    });
    if (!data?.item) throw new Error('Collection not found');
    return data.item;
  }

  /**
   * Fetch child collections for a parent collection
   * Raindrop.io API: GET /collections/{parentId}/childrens
   */
  async getChildCollections(parentId: number): Promise<Collection[]> {
    const { data } = await this.client.GET('/collections/{parentId}/childrens', {
      params: { path: { parentId } }
    });
    return [...(data?.items || [])];
  }

  /**
   * Create a new collection
   * Raindrop.io API: POST /collection
   */
  async createCollection(title: string, isPublic = false): Promise<Collection> {
    const { data } = await this.client.POST('/collection', {
      body: { title, public: isPublic }
    });
    if (!data?.item) throw new Error('Failed to create collection');
    return data.item;
  }

  /**
   * Update a collection
   * Raindrop.io API: PUT /collection/{id}
   */
  async updateCollection(id: number, updates: Partial<Collection>): Promise<Collection> {
    const { data } = await this.client.PUT('/collection/{id}', {
      params: { path: { id } },
      body: updates
    });
    if (!data?.item) throw new Error('Failed to update collection');
    return data.item;
  }

  /**
   * Delete a collection
   * Raindrop.io API: DELETE /collection/{id}
   */
  async deleteCollection(id: number): Promise<void> {
    await this.client.DELETE('/collection/{id}', {
      params: { path: { id } }
    });
  }

  /**
   * Share a collection
   * Raindrop.io API: PUT /collection/{id}/sharing
   */
  async shareCollection(id: number, level: string, emails?: string[]): Promise<{ link: string; access: any[] }> {
    const body: any = { level };
    if (emails) body.emails = emails;
    const { data } = await this.client.PUT('/collection/{id}/sharing', {
      params: { path: { id } },
      body
    });
    return { link: data?.link || '', access: [...(data?.access || [])] };
  }

  /**
   * Fetch bookmarks (search, filter, etc)
   * Raindrop.io API: GET /raindrops/{collectionId} or /raindrops/0
   *
   * NOTE: The Raindrop API 'tag' parameter performs full-text search, not exact tag filtering.
   * Use exactTagMatch: true to filter results client-side for exact tag matches only.
   */
  async getBookmarks(params: {
    search?: string;
    collection?: number;
    tags?: string[];
    important?: boolean;
    page?: number;
    perPage?: number;
    sort?: string;
    tag?: string;
    duplicates?: boolean;
    broken?: boolean;
    highlight?: boolean;
    domain?: string;
    exactTagMatch?: boolean; // If true, filter results client-side for exact tag matches
  } = {}): Promise<{ items: Bookmark[]; count: number }> {
    const query: any = {};
    if (params.search) query.search = params.search;
    if (params.tags) query.tag = params.tags.join(',');
    if (params.tag) query.tag = params.tag;
    if (params.important !== undefined) query.important = params.important;
    if (params.page) query.page = params.page;
    if (params.perPage) query.perpage = params.perPage;
    if (params.sort) query.sort = params.sort;
    if (params.duplicates !== undefined) query.duplicates = params.duplicates;
    if (params.broken !== undefined) query.broken = params.broken;
    if (params.highlight !== undefined) query.highlight = params.highlight;
    if (params.domain) query.domain = params.domain;
    const endpoint = params.collection ? '/raindrops/{id}' : '/raindrops/0';
    const options = params.collection
      ? { params: { path: { id: params.collection }, query } }
      : { params: { query } };
    const { data } = await (this.client as any).GET(endpoint, options);

    let items = data?.items || [];
    let count = data?.count || 0;

    // Client-side exact tag filtering (workaround for API full-text search)
    if (params.exactTagMatch && (params.tag || params.tags)) {
      const searchTags = [...(params.tags ?? []), ...(params.tag ? [params.tag] : [])];
      items = items.filter((bookmark: Bookmark) => {
        const bookmarkTags = bookmark.tags || [];
        return searchTags.every(searchTag => bookmarkTags.includes(searchTag));
      });
      count = items.length; // Update count to reflect filtered results
    }

    return {
      items,
      count
    };
  }

  /**
   * Fetch a single bookmark by ID
   * Raindrop.io API: GET /raindrop/{id}
   */
  async getBookmark(id: number): Promise<Bookmark> {
    const { data } = await this.client.GET('/raindrop/{id}', {
      params: { path: { id } }
    });
    if (!data?.item) throw new Error('Bookmark not found');
    return data.item;
  }

  /**
   * Create a new bookmark
   * Raindrop.io API: POST /raindrop
   */
  async createBookmark(collectionId: number, bookmark: {
    link: string;
    title?: string;
    excerpt?: string;
    tags?: string[];
    important?: boolean;
  }): Promise<Bookmark> {
    const { data } = await this.client.POST('/raindrop', {
      body: {
        link: bookmark.link,
        ...(bookmark.title && { title: bookmark.title }),
        ...(bookmark.excerpt && { excerpt: bookmark.excerpt }),
        ...(bookmark.tags && { tags: bookmark.tags }),
        important: bookmark.important || false,
        collection: { $id: collectionId },
        pleaseParse: {}
      }
    });
    if (!data?.item) throw new Error('Failed to create bookmark');
    return data.item;
  }

  /**
   * Update a bookmark
   * Raindrop.io API: PUT /raindrop/{id}
   */
  async updateBookmark(id: number, updates: Partial<Bookmark>): Promise<Bookmark> {
    const { data } = await this.client.PUT('/raindrop/{id}', {
      params: { path: { id } },
      body: updates
    });
    if (!data?.item) throw new Error('Failed to update bookmark');
    return data.item;
  }

  /**
   * Delete a bookmark
   * Raindrop.io API: DELETE /raindrop/{id}
   */
  async deleteBookmark(id: number): Promise<void> {
    await this.client.DELETE('/raindrop/{id}', {
      params: { path: { id } }
    });
  }

  /**
   * Batch update bookmarks
   * Raindrop.io API: PUT /raindrops
   */
  async batchUpdateBookmarks(ids: number[], updates: {
    tags?: string[];
    collection?: number;
    important?: boolean;
    broken?: boolean;
  }): Promise<boolean> {
    const body: any = { ids };
    if (updates.tags) body.tags = updates.tags;
    if (updates.collection) body.collection = { $id: updates.collection };
    if (updates.important !== undefined) body.important = updates.important;
    if (updates.broken !== undefined) body.broken = updates.broken;
    const { data } = await this.client.PUT('/raindrops', { body });
    return !!data?.result;
  }

  /**
   * Bulk edit raindrops in a collection
   * Raindrop.io API: PUT /raindrops/{collectionId}
   *
   * Note: This endpoint has limitations:
   * - Collection -1 (Unsorted) and 0 (All) don't support bulk operations
   * - Use specific collection IDs for bulk operations
   *
   * This endpoint is not in the OpenAPI spec, so we use fetch() directly
   */
  async bulkEditRaindrops(collectionId: number, updates: {
    ids?: number[];
    important?: boolean;
    tags?: string[];
    media?: string[];
    cover?: string;
    collection?: { $id: number };
    nested?: boolean;
  }): Promise<{ result: boolean; modified?: number; errorMessage?: string }> {
    const body: any = {};
    if (updates.ids) body.ids = updates.ids;
    if (updates.important !== undefined) body.important = updates.important;
    if (updates.tags) body.tags = updates.tags;
    if (updates.media) body.media = updates.media;
    if (updates.cover) body.cover = updates.cover;
    if (updates.collection) body.collection = updates.collection;
    if (updates.nested !== undefined) body.nested = updates.nested;

    const url = `https://api.raindrop.io/rest/v1/raindrops/${collectionId}`;
    const token = process.env.RAINDROP_ACCESS_TOKEN;
    if (!token) {
      throw new Error('RAINDROP_ACCESS_TOKEN environment variable not set');
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as { result?: boolean; modified?: number; errorMessage?: string };
    return {
      result: data?.result ?? false,
      ...(data?.modified !== undefined && { modified: data.modified }),
      ...(data?.errorMessage !== undefined && { errorMessage: data.errorMessage })
    };
  }

  /**
   * Fetch tags for a collection or all
   * Raindrop.io API: GET /tags/{collectionId} or /tags/0
   */
  async getTags(collectionId?: number): Promise<{ _id: string; count: number }[]> {
    const endpoint = collectionId ? '/tags/{collectionId}' : '/tags/0';
    const options = collectionId
      ? { params: { path: { id: collectionId } } }
      : undefined;
    const { data } = await (this.client as any).GET(endpoint, options);
    return data?.items || [];
  }

  /**
   * Fetch tags for a specific collection
   * Raindrop.io API: GET /tags/{collectionId}
   */
  async getTagsByCollection(collectionId: number): Promise<{ _id: string; count: number }[]> {
    return this.getTags(collectionId);
  }

  /**
   * Delete tags from a collection
   * Raindrop.io API: DELETE /tags/{collectionId}
   */
  async deleteTags(collectionId: number | undefined, tags: string[]): Promise<boolean> {
    const endpoint = collectionId ? '/tags/{collectionId}' : '/tags/0';
    const options = {
      ...(collectionId && { params: { path: { id: collectionId } } }),
      body: { tags }
    };
    const { data } = await (this.client as any).DELETE(endpoint, options);
    return !!data?.result;
  }

  /**
   * Rename a tag in a collection
   * Raindrop.io API: PUT /tags/{collectionId}
   */
  async renameTag(collectionId: number | undefined, oldName: string, newName: string): Promise<boolean> {
    const endpoint = collectionId ? '/tags/{collectionId}' : '/tags/0';
    const options = {
      ...(collectionId && { params: { path: { id: collectionId } } }),
      body: { from: oldName, to: newName }
    };
    const { data } = await (this.client as any).PUT(endpoint, options);
    return !!data?.result;
  }

  /**
   * Merge tags in a collection
   * Raindrop.io API: PUT /tags/{collectionId}
   */
  async mergeTags(collectionId: number | undefined, tags: string[], newName: string): Promise<boolean> {
    const endpoint = collectionId ? '/tags/{collectionId}' : '/tags/0';
    const options = {
      ...(collectionId && { params: { path: { id: collectionId } } }),
      body: { tags, to: newName }
    };
    const { data } = await (this.client as any).PUT(endpoint, options);
    return !!data?.result;
  }

  /**
   * Fetch user info
   * Raindrop.io API: GET /user
   */
  async getUserInfo(): Promise<{ email: string;[key: string]: any }> {
    const { data } = await this.client.GET('/user');
    if (!data?.user) throw new Error('User not found');
    return data.user;
  }

  /**
   * Fetch highlights for a specific bookmark
   * Raindrop.io API: GET /raindrop/{id}/highlights
   */
  async getHighlights(raindropId: number): Promise<Highlight[]> {
    const { data } = await this.client.GET('/raindrop/{id}/highlights', {
      params: { path: { id: raindropId } }
    });
    if (!data?.items) throw new Error('No highlights found');
    return [...data.items];
  }

  /**
   * Fetch all highlights across all bookmarks
   * Raindrop.io API: GET /raindrops/0
   */
  async getAllHighlights(): Promise<Highlight[]> {
    const { data } = await this.client.GET('/raindrops/0');
    if (!data?.items) return [];
    return data.items.flatMap((bookmark: any) => Array.isArray(bookmark.highlights) ? bookmark.highlights : []);
  }

  /**
   * Create a highlight for a bookmark
   * Raindrop.io API: POST /highlights
   */
  async createHighlight(bookmarkId: number, highlight: {
    text: string;
    note?: string;
    color?: string;
  }): Promise<Highlight> {
    const { data } = await this.client.POST('/highlights', {
      body: {
        ...highlight,
        raindrop: { $id: bookmarkId },
        color: (highlight.color as any) || 'yellow'
      }
    });
    if (!data?.item) throw new Error('Failed to create highlight');
    return data.item;
  }

  /**
   * Update a highlight
   * Raindrop.io API: PUT /highlights/{id}
   */
  async updateHighlight(id: number, updates: {
    text?: string;
    note?: string;
    color?: string;
  }): Promise<Highlight> {
    const { data } = await this.client.PUT('/highlights/{id}', {
      params: { path: { id } },
      body: {
        ...(updates.text && { text: updates.text }),
        ...(updates.note && { note: updates.note }),
        ...(updates.color && { color: updates.color as any })
      }
    });
    if (!data?.item) throw new Error('Failed to update highlight');
    return data.item;
  }

  /**
   * Delete a highlight
   * Raindrop.io API: DELETE /highlights/{id}
   */
  async deleteHighlight(id: number): Promise<void> {
    await this.client.DELETE('/highlights/{id}', {
      params: { path: { id } }
    });
  }
}