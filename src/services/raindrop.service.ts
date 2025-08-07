// Simple, clean openapi-fetch REST client
import createClient from 'openapi-fetch';
import type { components, paths } from '../types/raindrop.schema.js';

type Bookmark = components['schemas']['Bookmark'];
type Collection = components['schemas']['Collection'];
type Highlight = components['schemas']['Highlight'];

// Remove backward compatibility types and helpers
// type ApiSuccess<T> = ...
// type ApiError = ...
// type ApiResponse<T> = ...
// export function isApiSuccess<T>(...) {...}
// export function isApiError<T>(...) {...}

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
          console.log(`${request.method} ${request.url}`);
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
    const endpoint = params.collection ? '/raindrops/{collectionId}' : '/raindrops/0';
    const options = params.collection
      ? { params: { path: { id: params.collection }, query } }
      : { params: { query } };
    const { data } = await (this.client as any).GET(endpoint, options);
    return {
      items: data?.items || [],
      count: data?.count || 0
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
}