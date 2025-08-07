// Simple, clean openapi-fetch REST client
import createClient from 'openapi-fetch';
import type { components, paths } from '../types/raindrop.schema.js';

type Bookmark = components['schemas']['Bookmark'];
type Collection = components['schemas']['Collection'];
type Highlight = components['schemas']['Highlight'];

// For backward compatibility with existing code
export type ApiSuccess<T> = { status: 'success'; result: true; data: T };
export type ApiError = { status: 'error'; result: false; error: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccess<T> {
  return response.status === 'success' && response.result === true;
}

export function isApiError<T>(response: ApiResponse<T>): response is ApiError {
  return response.status === 'error' && response.result === false;
}

export default class RaindropService {
  private client;

  constructor(token?: string) {
    this.client = createClient<paths>({
      baseUrl: 'https://api.raindrop.io/rest/v1',
      headers: {
        Authorization: `Bearer ${token || process.env.RAINDROP_ACCESS_TOKEN}`,
      },
    });
    
    // Add global error handling
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

  // Helper to wrap responses in the old ApiResponse format for backward compatibility
  private wrapResponse<T>(data: T): ApiResponse<T> {
    return { status: 'success', result: true, data };
  }

  private wrapError(error: unknown): ApiError {
    const message = error instanceof Error ? error.message : String(error);
    return { status: 'error', result: false, error: message };
  }

  // Collections
  async getCollections(): Promise<ApiResponse<Collection[]>> {
    try {
      const { data } = await this.client.GET('/collections');
      return this.wrapResponse([...(data?.items || [])] as Collection[]);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async getCollection(id: number): Promise<ApiResponse<Collection>> {
    try {
      const { data } = await this.client.GET('/collection/{id}', {
        params: { path: { id } }
      });
      if (!data?.item) throw new Error('Collection not found');
      return this.wrapResponse(data.item);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async getChildCollections(parentId: number): Promise<ApiResponse<Collection[]>> {
    try {
      const { data } = await this.client.GET('/collections/{parentId}/childrens', {
        params: { path: { parentId } }
      });
      return this.wrapResponse([...(data?.items || [])] as Collection[]);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async createCollection(title: string, isPublic = false): Promise<ApiResponse<Collection>> {
    try {
      const { data } = await this.client.POST('/collection', {
        body: { title, public: isPublic }
      });
      if (!data?.item) throw new Error('Failed to create collection');
      return this.wrapResponse(data.item);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async updateCollection(id: number, updates: Partial<Collection>): Promise<ApiResponse<Collection>> {
    try {
      const { data } = await this.client.PUT('/collection/{id}', {
        params: { path: { id } },
        body: updates
      });
      if (!data?.item) throw new Error('Failed to update collection');
      return this.wrapResponse(data.item);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async deleteCollection(id: number): Promise<ApiResponse<null>> {
    try {
      await this.client.DELETE('/collection/{id}', {
        params: { path: { id } }
      });
      return this.wrapResponse(null);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async shareCollection(id: number, level: string, emails?: string[]): Promise<ApiResponse<{ link: string; access: any[] }>> {
    try {
      const body: any = { level };
      if (emails) body.emails = emails;
      
      const { data } = await this.client.PUT('/collection/{id}/sharing', {
        params: { path: { id } },
        body
      });
      return this.wrapResponse({ link: data?.link || '', access: [...(data?.access || [])] as any[] });
    } catch (error) {
      return this.wrapError(error);
    }
  }

  // Bookmarks
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
  } = {}): Promise<ApiResponse<{ items: Bookmark[]; count: number }>> {
    try {
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
      
      return this.wrapResponse({
        items: data?.items || [],
        count: data?.count || 0
      });
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async getBookmark(id: number): Promise<ApiResponse<Bookmark>> {
    try {
      const { data } = await this.client.GET('/raindrop/{id}', {
        params: { path: { id } }
      });
      if (!data?.item) throw new Error('Bookmark not found');
      return this.wrapResponse(data.item);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async createBookmark(collectionId: number, bookmark: {
    link: string;
    title?: string;
    excerpt?: string;
    tags?: string[];
    important?: boolean;
  }): Promise<ApiResponse<Bookmark>> {
    try {
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
      return this.wrapResponse(data.item);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async updateBookmark(id: number, updates: Partial<Bookmark>): Promise<ApiResponse<Bookmark>> {
    try {
      const { data } = await this.client.PUT('/raindrop/{id}', {
        params: { path: { id } },
        body: updates
      });
      if (!data?.item) throw new Error('Failed to update bookmark');
      return this.wrapResponse(data.item);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async deleteBookmark(id: number): Promise<ApiResponse<null>> {
    try {
      await this.client.DELETE('/raindrop/{id}', {
        params: { path: { id } }
      });
      return this.wrapResponse(null);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async batchUpdateBookmarks(ids: number[], updates: {
    tags?: string[];
    collection?: number;
    important?: boolean;
    broken?: boolean;
  }): Promise<{ result: boolean }> {
    try {
      const body: any = { ids };
      if (updates.tags) body.tags = updates.tags;
      if (updates.collection) body.collection = { $id: updates.collection };
      if (updates.important !== undefined) body.important = updates.important;
      if (updates.broken !== undefined) body.broken = updates.broken;

      const { data } = await this.client.PUT('/raindrops', { body });
      return { result: data?.result || false };
    } catch (error) {
      return { result: false };
    }
  }

  // Tags
  async getTags(collectionId?: number): Promise<ApiResponse<{ _id: string; count: number }[]>> {
    try {
      const endpoint = collectionId ? '/tags/{collectionId}' : '/tags/0';
      const options = collectionId 
        ? { params: { path: { id: collectionId } } }
        : undefined;

      const { data } = await (this.client as any).GET(endpoint, options);
      return this.wrapResponse([...(data?.items || [])] as { _id: string; count: number }[]);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async getTagsByCollection(collectionId: number): Promise<ApiResponse<{ _id: string; count: number }[]>> {
    return this.getTags(collectionId);
  }

  async deleteTags(collectionId: number | undefined, tags: string[]): Promise<ApiResponse<{ result: boolean }>> {
    try {
      const endpoint = collectionId ? '/tags/{collectionId}' : '/tags/0';
      const options = {
        ...(collectionId && { params: { path: { id: collectionId } } }),
        body: { tags }
      };

      const { data } = await (this.client as any).DELETE(endpoint, options);
      return this.wrapResponse({ result: data?.result || false });
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async renameTag(collectionId: number | undefined, oldName: string, newName: string): Promise<ApiResponse<{ result: boolean }>> {
    try {
      const endpoint = collectionId ? '/tags/{collectionId}' : '/tags/0';
      const options = {
        ...(collectionId && { params: { path: { id: collectionId } } }),
        body: { from: oldName, to: newName }
      };

      const { data } = await (this.client as any).PUT(endpoint, options);
      return this.wrapResponse({ result: data?.result || false });
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async mergeTags(collectionId: number | undefined, tags: string[], newName: string): Promise<ApiResponse<{ result: boolean }>> {
    try {
      const endpoint = collectionId ? '/tags/{collectionId}' : '/tags/0';
      const options = {
        ...(collectionId && { params: { path: { id: collectionId } } }),
        body: { tags, to: newName }
      };

      const { data } = await (this.client as any).PUT(endpoint, options);
      return this.wrapResponse({ result: data?.result || false });
    } catch (error) {
      return this.wrapError(error);
    }
  }

  // Highlights
  async getHighlights(bookmarkId: number): Promise<ApiResponse<Highlight[]>> {
    try {
      const { data } = await this.client.GET('/raindrop/{id}/highlights', {
        params: { path: { id: bookmarkId } }
      });
      return this.wrapResponse([...(data?.items || [])] as Highlight[]);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async getHighlightsByCollection(collectionId: number): Promise<ApiResponse<Highlight[]>> {
    try {
      const { data } = await this.client.GET('/raindrops/{collectionId}', {
        params: { path: { id: collectionId } }
      });
      
      const highlights: Highlight[] = [];
      if (data?.items) {
        for (const bookmark of data.items) {
          if (bookmark.highlights) {
            highlights.push(...bookmark.highlights);
          }
        }
      }
      return this.wrapResponse(highlights);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async createHighlight(bookmarkId: number, highlight: {
    text: string;
    note?: string;
    color?: string;
  }): Promise<ApiResponse<Highlight>> {
    try {
      const { data } = await this.client.POST('/highlights', {
        body: {
          ...highlight,
          raindrop: { $id: bookmarkId },
          color: (highlight.color as any) || 'yellow'
        }
      });
      if (!data?.item) throw new Error('Failed to create highlight');
      return this.wrapResponse(data.item);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async updateHighlight(id: number, updates: {
    text?: string;
    note?: string;
    color?: string;
  }): Promise<ApiResponse<Highlight>> {
    try {
      const { data } = await this.client.PUT('/highlights/{id}', {
        params: { path: { id } },
        body: {
          ...(updates.text && { text: updates.text }),
          ...(updates.note && { note: updates.note }),
          ...(updates.color && { color: updates.color as any })
        }
      });
      if (!data?.item) throw new Error('Failed to update highlight');
      return this.wrapResponse(data.item);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async deleteHighlight(id: number): Promise<ApiResponse<null>> {
    try {
      await this.client.DELETE('/highlights/{id}', {
        params: { path: { id } }
      });
      return this.wrapResponse(null);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  // User info
  async getUserInfo() {
    try {
      const { data } = await this.client.GET('/user');
      return data?.user;
    } catch (error) {
      throw error;
    }
  }

  async getUserStats() {
    try {
      const { data } = await this.client.GET('/user/stats');
      return data?.stats;
    } catch (error) {
      throw error;
    }
  }

  async getCollectionStats(collectionId: number) {
    try {
      const { data } = await this.client.GET('/collection/{id}/stats', {
        params: { path: { id: collectionId } }
      });
      return data?.stats;
    } catch (error) {
      throw error;
    }
  }

  // Collection management operations
  async reorderCollections(sort: string): Promise<{ result: boolean }> {
    try {
      const { data } = await this.client.PUT('/collections/sort', { body: { sort } });
      return { result: data?.result || false };
    } catch (error) {
      return { result: false };
    }
  }

  async toggleCollectionsExpansion(expand: boolean): Promise<{ result: boolean }> {
    try {
      const { data } = await this.client.PUT('/collections/collapsed', { body: { collapsed: !expand } });
      return { result: data?.result || false };
    } catch (error) {
      return { result: false };
    }
  }

  async mergeCollections(targetCollectionId: number, collectionIds: number[]): Promise<{ result: boolean }> {
    try {
      const { data } = await this.client.PUT('/collection/{id}/merge', {
        params: { path: { id: targetCollectionId } },
        body: { with: collectionIds }
      });
      return { result: data?.result || false };
    } catch (error) {
      return { result: false };
    }
  }

  async removeEmptyCollections(): Promise<{ count: number }> {
    try {
      const { data } = await this.client.PUT('/collections/clean');
      return { count: data?.count || 0 };
    } catch (error) {
      return { count: 0 };
    }
  }

  async emptyTrash(): Promise<{ result: boolean }> {
    try {
      const { data } = await this.client.PUT('/collection/-99/clear');
      return { result: data?.result || false };
    } catch (error) {
      return { result: false };
    }
  }

  // Search alias for backward compatibility
  async search(params: any): Promise<ApiResponse<{ items: Bookmark[]; count: number }>> {
    return this.getBookmarks(params);
  }

  // File upload
  async uploadFile(collectionId: number, file: any): Promise<ApiResponse<Bookmark>> {
    try {
      const { data } = await this.client.PUT('/raindrop/file', {
        body: { file, collectionId: collectionId.toString() }
      });
      if (!data?.item) throw new Error('Failed to upload file');
      return this.wrapResponse(data.item);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  // Reminders
  async setReminder(raindropId: number, reminder: { date: string; note?: string }): Promise<ApiResponse<Bookmark>> {
    try {
      const { data } = await this.client.PUT('/raindrop/{id}/reminder', {
        params: { path: { id: raindropId } },
        body: reminder
      });
      if (!data?.item) throw new Error('Failed to set reminder');
      return this.wrapResponse(data.item);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async deleteReminder(raindropId: number): Promise<ApiResponse<Bookmark>> {
    try {
      const { data } = await this.client.DELETE('/raindrop/{id}/reminder', {
        params: { path: { id: raindropId } }
      });
      if (!data?.item) throw new Error('Failed to delete reminder');
      return this.wrapResponse(data.item);
    } catch (error) {
      return this.wrapError(error);
    }
  }

  // Import functionality
  async importBookmarks(collectionId: number, file: any, options: {
    format?: 'html' | 'csv' | 'pocket' | 'instapaper' | 'netscape' | 'readwise';
    mode?: 'add' | 'replace';
  } = {}): Promise<ApiResponse<{ imported: number; duplicates: number }>> {
    try {
      const body = {
        file,
        mode: options.mode || 'add',
        parse: true,
        collection: collectionId.toString(),
        ...(options.format && { format: options.format })
      };

      const { data } = await this.client.POST('/import', { body });
      return this.wrapResponse({
        imported: data?.imported || 0,
        duplicates: data?.duplicates || 0
      });
    } catch (error) {
      return this.wrapError(error);
    }
  }

  async getImportStatus(): Promise<{
    status: 'in-progress' | 'ready' | 'error';
    progress?: number;
    imported?: number;
    duplicates?: number;
    error?: string;
  }> {
    try {
      const { data } = await this.client.GET('/import/status');
      return {
        status: data?.status || 'error',
        ...(data?.progress && { progress: data.progress }),
        ...(data?.imported && { imported: data.imported }),
        ...(data?.duplicates && { duplicates: data.duplicates }),
        ...(data?.error && { error: data.error })
      };
    } catch (error) {
      return { status: 'error', error: String(error) };
    }
  }

  // Static methods for backward compatibility
  static async getCollections() {
    const service = new RaindropService();
    return service.getCollections();
  }

  static async getUserInfo() {
    const service = new RaindropService();
    return service.getUserInfo();
  }

  static async getTags(collectionId?: number) {
    const service = new RaindropService();
    return service.getTags(collectionId);
  }

  static async search(params: any) {
    const service = new RaindropService();
    return service.getBookmarks(params);
  }

  // Static getAllHighlights method for backward compatibility
  static async getAllHighlights(): Promise<any[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const accessToken = process.env.RAINDROP_ACCESS_TOKEN;
      if (!accessToken) throw new Error('RAINDROP_ACCESS_TOKEN is missing');

      const res = await fetch('https://api.raindrop.io/rest/v1/highlight', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Failed to fetch highlights: ${res.status} ${res.statusText}`);
      }

      const data = await res.json() as { items?: any[] };
      return data.items || [];
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Timeout while fetching highlights');
      }
      throw new Error(`Error in getAllHighlights: ${err.message}`);
    }
  }
}