
// External imports
import createClient from 'openapi-fetch';
import { z } from 'zod';

// Internal imports
import type { components, paths } from '../types/raindrop.schema';

type Bookmark = components['schemas']['Bookmark'];
type Collection = components['schemas']['Collection'];
type Highlight = components['schemas']['Highlight'];
type SearchParams = { [key: string]: any }; // Replace with strict type if available




// Helper to map API bookmark objects to strict Bookmark type
function mapApiBookmark(apiBookmark: any): Bookmark {
  return {
    _id: apiBookmark._id,
    link: apiBookmark.link ?? '',
    title: apiBookmark.title ?? '',
    excerpt: apiBookmark.excerpt ?? '',
    note: apiBookmark.note ?? '',
    type: apiBookmark.type ?? 'link',
    cover: apiBookmark.cover ?? '',
    tags: Array.isArray(apiBookmark.tags) ? apiBookmark.tags : [],
    important: apiBookmark.important ?? false,
    reminder: apiBookmark.reminder,
    removed: apiBookmark.removed ?? false,
    created: apiBookmark.created ?? '',
    lastUpdate: apiBookmark.lastUpdate ?? '',
    domain: apiBookmark.domain ?? '',
    collection: apiBookmark.collection ?? { $id: 0 },
    highlights: apiBookmark.highlights ?? [],
  };
}

// Discriminated union for API responses
export type ApiSuccess<T> = {
  status: 'success';
  result: true;
  data: T;
};

export type ApiError = {
  status: 'error';
  result: false;
  error: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccess<T> {
  return response.status === 'success' && response.result === true;
}

export function isApiError<T>(response: ApiResponse<T>): response is ApiError {
  return response.status === 'error' && response.result === false;
}

const collectionLevels = ['view', 'edit', 'remove'] as const;
export type CollectionLevel = typeof collectionLevels[number];

/**
 * Service class for interacting with the Raindrop.io API.
 * Handles authentication, request/response validation, and error handling.
 */
export default class RaindropService {
  private client: ReturnType<typeof createClient<paths>>;
  private requestInterceptors: Array<(options: any) => any> = [];
  private responseInterceptors: Array<(response: any) => any> = [];

  constructor() {
    this.client = createClient<paths>({
      baseUrl: 'https://api.raindrop.io/rest/v1',
    });
    
    // Add default auth interceptor
    this.addRequestInterceptor((options) => {
      const token = process.env.RAINDROP_ACCESS_TOKEN;
      if (token) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
        };
      }
      return options;
    });
  }

  // Simple interceptor implementation
  addRequestInterceptor(interceptor: (options: any) => any) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: (response: any) => any) {
    this.responseInterceptors.push(interceptor);
  }

  // Generic API call helper with interceptor support - eliminates duplication across all methods
  private async apiCall<P extends keyof paths, M extends keyof paths[P]>(
    method: M,
    path: P,
    options: any = {}
  ): Promise<ApiResponse<any>> {
    try {
      // Apply request interceptors
      let processedOptions = options;
      for (const interceptor of this.requestInterceptors) {
        processedOptions = interceptor(processedOptions);
      }
      
      const { data, error } = await (this.client as any)[method](path, processedOptions);
      
      if (error) {
        return this.handleApiError(error, `${String(method)} ${String(path)}`);
      }
      
      // Apply response interceptors
      let processedData = data;
      for (const interceptor of this.responseInterceptors) {
        processedData = interceptor(processedData);
      }
      
      return { status: 'success', result: true, data: processedData };
    } catch (err) {
      return this.handleApiError(err, `${String(method)} ${String(path)}`);
    }
  }

  // Type-safe API error handler
  private handleApiError(error: unknown, operation: string): ApiError {
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const response = (error as any).response;
      if (response?.status === 401) {
        return { status: 'error', result: false, error: `${operation}: Unauthorized (401). Your Raindrop.io access token is invalid, expired, or missing required permissions. Please check your RAINDROP_ACCESS_TOKEN environment variable.` };
      } else if (response?.status === 429) {
        return { status: 'error', result: false, error: `${operation}: Rate limited (429). Please wait before making more requests to the Raindrop.io API.` };
      } else if (response?.status >= 500) {
        return { status: 'error', result: false, error: `${operation}: Raindrop.io API server error (${response.status}). Please try again later.` };
      } else if (response?.status === 404) {
        return { status: 'error', result: false, error: `${operation}: Resource not found (404).` };
      }
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { status: 'error', result: false, error: `${operation}: ${message}` };
  }


  // Collections - Simplified with generic helper
  async getCollections(): Promise<ApiResponse<Collection[]>> {
    const response = await this.apiCall('get', '/collections');
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !data.items) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    
    // Ensure all collections have proper types
    const collectionsStrict = (data.items as Collection[]).map((col: Collection) => ({
      ...col,
      description: typeof col.description === 'string' ? col.description : '',
      color: typeof col.color === 'string' ? col.color : '',
      public: typeof col.public === 'boolean' ? col.public : false,
      expanded: typeof col.expanded === 'boolean' ? col.expanded : false,
      parent: col.parent ? { $id: col.parent.$id ?? 0 } : { $id: 0 },
    }));
    return { status: 'success', result: true, data: collectionsStrict };
  }

  async getCollection(id: number): Promise<ApiResponse<Collection>> {
    const response = await this.apiCall('get', '/collection/{id}', {
      params: { path: { id } }
    });
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !data.item) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    return { status: 'success', result: true, data: data.item as Collection };
  }

  async getChildCollections(parentId: number): Promise<ApiResponse<Collection[]>> {
    const response = await this.apiCall('get', '/collections/{parentId}/childrens', {
      params: { path: { parentId } }
    });
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !data.items) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    return { status: 'success', result: true, data: data.items as Collection[] };
  }

  async createCollection(title: string, isPublic = false): Promise<ApiResponse<Collection>> {
    const response = await this.apiCall('post', '/collection', {
      body: { title, public: isPublic }
    });
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !data.item) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    return { status: 'success', result: true, data: data.item as Collection };
  }

  async updateCollection(id: number, updates: Partial<Collection>): Promise<ApiResponse<Collection>> {
    const body: Partial<Collection> = {};
    (Object.keys(updates) as (keyof Collection)[]).forEach(key => {
      const value = updates[key];
      if (value !== undefined) {
        (body as any)[key] = value;
      }
    });
    
    const response = await this.apiCall('put', '/collection/{id}', {
      params: { path: { id } },
      body
    });
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !data.item) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    return { status: 'success', result: true, data: data.item as Collection };
  }

  async deleteCollection(id: number): Promise<ApiResponse<null>> {
    const response = await this.apiCall('delete', '/collection/{id}', {
      params: { path: { id } }
    });
    if (response.status === 'error') return response;
    return { status: 'success', result: true, data: null };
  }

  async shareCollection(
    id: number,
    level: CollectionLevel,
    emails?: string[]
  ): Promise<ApiResponse<{ link: string; access: any[] }>> {
    const body: { level: CollectionLevel; emails?: string[] } = { level };
    if (emails !== undefined) {
      body.emails = emails;
    }
    
    const response = await this.apiCall('put', '/collection/{id}/sharing', {
      params: { path: { id } },
      body
    });
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    return { status: 'success', result: true, data: { link: data.link, access: (data.access ? data.access.slice() : []) } };
  }

  // Bookmarks - Simplified with helper
  async getBookmarks(params: SearchParams = {}): Promise<ApiResponse<{ items: Bookmark[]; count: number }>> {
    const query: Record<string, any> = {};
    if (params.search !== undefined) query.search = params.search;
    if (params.sort !== undefined) query.sort = params.sort;
    if (params.tag !== undefined) query.tag = params.tag;
    if (params.important !== undefined) query.important = params.important;
    if (params.duplicates !== undefined) query.duplicates = params.duplicates;
    if (params.broken !== undefined) query.broken = params.broken;
    if (params.highlight !== undefined) query.highlight = params.highlight;
    if (params.domain !== undefined) query.domain = params.domain;
    if (params.perPage !== undefined) query.perpage = params.perPage;
    if (params.page !== undefined) query.page = params.page;
    
    const response = params.collection !== undefined
      ? await this.apiCall('get', '/raindrops/{collectionId}', {
          params: { path: { id: params.collection }, query }
        })
      : await this.apiCall('get', '/raindrops/0', {
          params: { query }
        });
        
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !Array.isArray(data.items)) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    
    return {
      status: 'success',
      result: true,
      data: {
        items: Array.isArray(data.items) ? data.items.map(mapApiBookmark) : [],
        count: data.count ?? 0
      }
    };
  }

  async getBookmark(id: number): Promise<ApiResponse<Bookmark>> {
    const response = await this.apiCall('get', '/raindrop/{id}', {
      params: { path: { id } }
    });
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !data.item) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    return { status: 'success', result: true, data: mapApiBookmark(data.item) };
  }

  async createBookmark(collectionId: number, bookmark: Partial<Bookmark>): Promise<ApiResponse<Bookmark>> {
    const body: {
      link: string;
      title?: string;
      excerpt?: string;
      tags?: string[];
      important: boolean;
      collection: { $id: number };
      pleaseParse: Record<string, never>;
    } = {
      link: bookmark.link!,
      important: bookmark.important ?? false,
      collection: { $id: collectionId },
      pleaseParse: {} as Record<string, never>
    };
    if (bookmark.title !== undefined) body.title = bookmark.title;
    if (bookmark.excerpt !== undefined) body.excerpt = bookmark.excerpt;
    if (bookmark.tags !== undefined) body.tags = Array.isArray(bookmark.tags) ? [...bookmark.tags] : [];
    
    const response = await this.apiCall('post', '/raindrop', { body });
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !data.item) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    return { status: 'success', result: true, data: mapApiBookmark(data.item) };
  }

  async updateBookmark(id: number, updates: Partial<Bookmark>): Promise<ApiResponse<Bookmark>> {
    const body: Record<string, any> = {};
    if (updates.link !== undefined) body.link = updates.link;
    if (updates.title !== undefined) body.title = updates.title;
    if (updates.excerpt !== undefined) body.excerpt = updates.excerpt;
    if (updates.note !== undefined) body.note = updates.note;
    if (updates.tags !== undefined) body.tags = updates.tags;
    if (updates.important !== undefined) body.important = updates.important;
    if (updates.collection !== undefined) body.collection = { $id: updates.collection.$id };
    if (updates.cover !== undefined) body.cover = updates.cover;
    
    const response = await this.apiCall('put', '/raindrop/{id}', {
      params: { path: { id } },
      body
    });
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !data.item) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    return { status: 'success', result: true, data: mapApiBookmark(data.item) };
  }

  async deleteBookmark(id: number): Promise<ApiResponse<null>> {
    const response = await this.apiCall('delete', '/raindrop/{id}', {
      params: { path: { id } }
    });
    if (response.status === 'error') return response;
    return { status: 'success', result: true, data: null };
  }

  async permanentDeleteBookmark(id: number): Promise<ApiResponse<null>> {
    const response = await this.apiCall('delete', '/raindrop/{id}/permanent', {
      params: { path: { id } }
    });
    if (response.status === 'error') return response;
    return { status: 'success', result: true, data: null };
  }

  async batchUpdateBookmarks(
    ids: number[],
    updates: { tags?: string[]; collection?: number; important?: boolean; broken?: boolean; }
  ): Promise<{ result: boolean }> {
    const body: {
      ids: number[];
      tags?: string[];
      collection?: { $id: number };
      important?: boolean;
      broken?: boolean;
    } = { ids };
    
    if (updates.tags !== undefined) body.tags = updates.tags;
    if (updates.collection !== undefined) body.collection = { $id: updates.collection };
    if (updates.important !== undefined) body.important = updates.important;
    if (updates.broken !== undefined) body.broken = updates.broken;
    
    const response = await this.apiCall('put', '/raindrops', { body });
    if (response.status === 'error') return response;
    
    const { data } = response;
    return { result: data?.result || false };
  }

  // Tags - Simplified
  async getTags(collectionId?: number): Promise<ApiResponse<{ _id: string; count: number }[]>> {
    const response = collectionId !== undefined 
      ? await this.apiCall('get', '/tags/{collectionId}', { params: { path: { id: collectionId } } })
      : await this.apiCall('get', '/tags/0');
      
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !data.items) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    return { status: 'success', result: true, data: data.items as { _id: string; count: number }[] };
  }

  async getTagsByCollection(collectionId: number): Promise<ApiResponse<{ _id: string; count: number }[]>> {
    return this.getTags(collectionId);
  }

  async deleteTags(collectionId: number | undefined, tags: string[]): Promise<ApiResponse<{ result: boolean }>> {
    const response = collectionId !== undefined
      ? await this.apiCall('delete', '/tags/{collectionId}', { params: { path: { id: collectionId } }, body: { tags: tags ?? [] } })
      : await this.apiCall('delete', '/tags/0', { body: { tags: tags ?? [] } });
      
    if (response.status === 'error') return response;
    
    const { data } = response;
    return { status: 'success', result: true, data: { result: data?.result ?? false } };
  }

  async renameTag(collectionId: number | undefined, oldName: string, newName: string): Promise<ApiResponse<{ result: boolean }>> {
    const response = collectionId !== undefined
      ? await this.apiCall('put', '/tags/{collectionId}', { params: { path: { id: collectionId } }, body: { from: oldName, to: newName } })
      : await this.apiCall('put', '/tags/0', { body: { from: oldName, to: newName } });
      
    if (response.status === 'error') return response;
    
    const { data } = response;
    return { status: 'success', result: true, data: { result: data?.result ?? false } };
  }

  async mergeTags(collectionId: number | undefined, tags: string[], newName: string): Promise<ApiResponse<{ result: boolean }>> {
    const response = collectionId !== undefined
      ? await this.apiCall('put', '/tags/{collectionId}', { params: { path: { id: collectionId } }, body: { tags: tags ?? [], to: newName } })
      : await this.apiCall('put', '/tags/0', { body: { tags: tags ?? [], to: newName } });
      
    if (response.status === 'error') return response;
    
    const { data } = response;
    return { status: 'success', result: true, data: { result: data?.result ?? false } };
  }

  // User - Simplified with helper
  async getUserInfo() {
    const response = await this.apiCall('get', '/user');
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !data.user) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    return data.user;
  }

  async getUserStats() {
    const response = await this.apiCall('get', '/user/stats');
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !data.stats) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    return data.stats;
  }

  async getCollectionStats(collectionId: number) {
    const response = await this.apiCall('get', '/collection/{id}/stats', {
      params: { path: { id: collectionId } }
    });
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !data.stats) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    return data.stats;
  }

  // Collections management - Simplified
  async reorderCollections(sort: string): Promise<{ result: boolean }> {
    const response = await this.apiCall('put', '/collections/sort', { body: { sort } });
    if (response.status === 'error') return response;
    const { data } = response;
    return { result: data?.result || false };
  }

  async toggleCollectionsExpansion(expand: boolean): Promise<{ result: boolean }> {
    const response = await this.apiCall('put', '/collections/collapsed', { body: { collapsed: !expand } });
    if (response.status === 'error') return response;
    const { data } = response;
    return { result: data?.result || false };
  }

  async mergeCollections(targetCollectionId: number, collectionIds: number[]): Promise<{ result: boolean }> {
    const response = await this.apiCall('put', '/collection/{id}/merge', {
      params: { path: { id: targetCollectionId } },
      body: { with: collectionIds }
    });
    if (response.status === 'error') return response;
    const { data } = response;
    return { result: data?.result || false };
  }

  async removeEmptyCollections(): Promise<{ count: number }> {
    const response = await this.apiCall('put', '/collections/clean');
    if (response.status === 'error') return { count: 0 };
    const { data } = response;
    return { count: data?.count || 0 };
  }

  async emptyTrash(): Promise<{ result: boolean }> {
    const response = await this.apiCall('put', '/collection/-99/clear');
    if (response.status === 'error') return response;
    const { data } = response;
    return { result: data?.result || false };
  }

  // Highlights - Simplified
  async getHighlights(raindropId: number): Promise<ApiResponse<Highlight[]>> {
    const response = await this.apiCall('get', '/raindrop/{id}/highlights', {
      params: { path: { id: raindropId } }
    });
    
    if (response.status === 'error') {
      // Handle 404 as empty array
      if (response.error.includes('404')) {
        return { status: 'success', result: true, data: [] };
      }
      return response;
    }
    
    const { data } = response;
    if (!data?.result || !data.items) {
      return { status: 'success', result: true, data: [] };
    }
    
    const highlights = data.items.map((item: any) => this.mapHighlightData({
      ...item,
      raindrop: item.raindrop || { _id: raindropId }
    })).filter((h: Highlight | null): h is Highlight => h !== null);
    
    return { status: 'success', result: true, data: highlights };
  }

  /**
   * Exchanges OAuth code for Raindrop.io access token
   * @param code - The authorization code from Raindrop.io
   * @param clientId - Your Raindrop.io client ID
   * @param clientSecret - Your Raindrop.io client secret
   * @param redirectUri - The redirect URI used in the OAuth flow
   * @returns The access token string
   */
  public async exchangeOAuthCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<string> {
    try {
      const response = await fetch('https://raindrop.io/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to exchange code: ${response.statusText}`);
      }
      const data = await response.json() as { access_token?: string };
      if (!data.access_token) {
        throw new Error('No access_token in response');
      }
      return data.access_token;
    } catch (error: any) {
      throw new Error(`OAuth token exchange failed: ${error.message || error}`);
    }
  }

  // Static methods factory - more efficient approach
  private static createStaticProxy<T extends keyof RaindropService>(methodName: T): RaindropService[T] {
    return ((...args: any[]) => {
      const service = new RaindropService();
      return (service[methodName] as any)(...args);
    }) as RaindropService[T];
  }

  // Static proxies using factory
  static getCollections = RaindropService.createStaticProxy('getCollections');
  static getUserInfo = RaindropService.createStaticProxy('getUserInfo');
  static getTags = RaindropService.createStaticProxy('getTags');
  static search = (params: any) => RaindropService.createStaticProxy('getBookmarks')(params);

  /**
   * Fetch all highlights across all bookmarks (paginated).
   * Returns a flat array of all highlights.
   */
  static async getAllHighlights(): Promise<any[]> {
    try {
      // Defensive: Use a timeout for the fetch
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      // Use Raindrop.io API endpoint for highlights
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

      const data = await res.json();

      // Defensive: Validate response shape
      const highlightsSchema = z.object({
        items: z.array(z.any())
      });

      const parsed = highlightsSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error('Invalid highlights response format');
      }

      return parsed.data.items;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Timeout while fetching highlights');
      }
      throw new Error(`Error in getAllHighlights: ${err.message}`);
    }
  }

  // Helper method to map highlight data consistently
  private mapHighlightData(item: any): Highlight | null {
    if (!item) {
      return null;
    }

    // Get raindrop ID from item if available
    const raindropId = item.raindrop?._id || 0;

    return {
      _id: item._id,
      text: item.text || '',
      note: item.note || '',
      color: item.color || '',
      created: item.created,
      lastUpdate: item.lastUpdate,
      title: item.title || '',
      tags: item.tags || [],
      link: item.link || '',
      domain: item.domain || '',
      excerpt: item.excerpt || '',
      raindrop: {
        _id: raindropId,
        title: item.raindrop?.title || '',
        link: item.raindrop?.link || '',
        collection: item.raindrop?.collection || { $id: 0 }
      }
    };
  }

  async getHighlightsByCollection(collectionId: number): Promise<ApiResponse<Highlight[]>> {
    if (typeof collectionId !== 'number' || collectionId <= 0) {
      return { status: 'error', result: false, error: 'Invalid collection id' };
    }
    
    const response = await this.apiCall('get', '/raindrops/{collectionId}', {
      params: { path: { id: collectionId } }
    });
    if (response.status === 'error') return response;
    
    const { data: bookmarksRes } = response;
    if (!bookmarksRes?.result || !Array.isArray(bookmarksRes.items)) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    
    const highlights: Highlight[] = [];
    for (const bookmark of bookmarksRes.items) {
      if (Array.isArray(bookmark.highlights)) {
        for (const h of bookmark.highlights) {
          highlights.push(this.mapHighlightData({
            ...h,
            _id: typeof h._id === 'string' ? Number(h._id) : h._id,
            raindrop: {
              _id: typeof bookmark._id === 'string' ? Number(bookmark._id) : bookmark._id,
              title: bookmark.title || '',
              link: bookmark.link || '',
              collection: bookmark.collection || { $id: collectionId }
            }
          }) as Highlight);
        }
      }
    }
    return { status: 'success', result: true, data: highlights.filter((h): h is Highlight => h !== null) };
  }

  async createHighlight(raindropId: number, highlightData: { text: string; note?: string; color?: string }): Promise<ApiResponse<Highlight>> {
    const allowedColors = ['yellow', 'blue', 'brown', 'cyan', 'gray', 'green', 'indigo', 'orange', 'pink', 'purple', 'red', 'teal'] as const;
    const color: typeof allowedColors[number] = (highlightData.color && allowedColors.includes(highlightData.color as any)) 
      ? highlightData.color as typeof allowedColors[number] : 'yellow';
    
    const body: { raindrop: { $id: number }; text: string; color: typeof allowedColors[number]; note?: string } = {
      raindrop: { $id: raindropId },
      text: highlightData.text,
      color
    };
    if (highlightData.note) body.note = highlightData.note;
    
    const response = await this.apiCall('post', '/highlights', { body });
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !data.item) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    
    const highlight = this.mapHighlightData({ ...data.item, raindrop: data.item.raindrop || { _id: raindropId } });
    if (!highlight) {
      return { status: 'error', result: false, error: 'Failed to create highlight: Invalid response data' };
    }
    return { status: 'success', result: true, data: highlight };
  }

  async updateHighlight(id: number, updates: { text?: string; note?: string; color?: string }): Promise<ApiResponse<Highlight>> {
    const allowedColors = ['yellow', 'blue', 'brown', 'cyan', 'gray', 'green', 'indigo', 'orange', 'pink', 'purple', 'red', 'teal'] as const;
    const body: { text?: string; note?: string; color?: typeof allowedColors[number] } = {};
    
    if (updates.text) body.text = updates.text;
    if (updates.note) body.note = updates.note;
    if (updates.color && allowedColors.includes(updates.color as any)) body.color = updates.color as typeof allowedColors[number];
    
    const response = await this.apiCall('put', '/highlights/{id}', { params: { path: { id } }, body });
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !data.item) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    
    const highlight = this.mapHighlightData(data.item);
    if (!highlight) {
      return { status: 'error', result: false, error: 'Failed to update highlight: Invalid response data' };
    }
    return { status: 'success', result: true, data: highlight };
  }

  async deleteHighlight(id: number): Promise<ApiResponse<null>> {
    const response = await this.apiCall('delete', '/highlights/{id}', { params: { path: { id } } });
    if (response.status === 'error') return response;
    return { status: 'success', result: true, data: null };
  }

  // Search - Type-safe with openapi-fetch
  async search(params: SearchParams): Promise<ApiResponse<{ items: Bookmark[]; count: number }>> {
    return this.getBookmarks(params);
  }

  // Advanced search - Simplified
  async searchRaindrops(params: {
    search?: string; collection?: number; tags?: string[]; createdStart?: string; 
    createdEnd?: string; important?: boolean; media?: string; page?: number; 
    perPage?: number; sort?: string;
  }): Promise<ApiResponse<{ items: Bookmark[]; count: number }>> {
    const query: Record<string, any> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query[key === 'perPage' ? 'perpage' : key] = value;
    });
    
    const response = await this.apiCall('get', '/raindrops', { params: { query } });
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !Array.isArray(data.items)) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    
    const items: Bookmark[] = data.items.map((item: any) => ({
      ...item,
      user: item.user ?? { _id: 0, name: '', email: '' }
    }));
    
    return { status: 'success', result: true, data: { items, count: data.count ?? 0 } };
  }

  // Upload file - Simplified
  async uploadFile(collectionId: number, file: any): Promise<ApiResponse<Bookmark>> {
    const response = await this.apiCall('put', '/raindrop/file', {
      body: { file, collectionId: collectionId.toString() }
    });
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !data.item) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    return { status: 'success', result: true, data: mapApiBookmark(data.item) };
  }

  // Reminder management - Simplified
  async setReminder(raindropId: number, reminder: { date: string; note?: string }): Promise<ApiResponse<Bookmark>> {
    const body: { date: string; note?: string } = { date: reminder.date };
    if (reminder.note) body.note = reminder.note;
    
    const response = await this.apiCall('put', '/raindrop/{id}/reminder', {
      params: { path: { id: raindropId } }, body
    });
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !data.item) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    return { status: 'success', result: true, data: mapApiBookmark(data.item) };
  }

  async deleteReminder(raindropId: number): Promise<ApiResponse<Bookmark>> {
    const response = await this.apiCall('delete', '/raindrop/{id}/reminder', {
      params: { path: { id: raindropId } }
    });
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result || !data.item) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    return { status: 'success', result: true, data: mapApiBookmark(data.item) };
  }

  // Import functionality - Simplified
  async importBookmarks(collectionId: number, file: any, options: {
    format?: 'html' | 'csv' | 'pocket' | 'instapaper' | 'netscape' | 'readwise';
    mode?: 'add' | 'replace';
  } = {}): Promise<ApiResponse<{ imported: number; duplicates: number }>> {
    const body = {
      file,
      mode: options.mode ?? 'add',
      parse: true,
      ...(collectionId && { collection: collectionId.toString() }),
      ...(options.format && { format: options.format })
    };
    
    const response = await this.apiCall('post', '/import', { body });
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result) {
      return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
    }
    
    return {
      status: 'success',
      result: true,
      data: { imported: data.imported ?? 0, duplicates: data.duplicates ?? 0 }
    };
  }

  // Check import status - Simplified
  async getImportStatus(): Promise<{
    status: 'in-progress' | 'ready' | 'error';
    progress?: number;
    imported?: number;
    duplicates?: number;
    error?: string;
  }> {
    const response = await this.apiCall('get', '/import/status');
    if (response.status === 'error') return response;
    
    const { data } = response;
    if (!data?.result) {
      throw new Error('Invalid response structure from Raindrop.io API');
    }
    
    return {
      status: data.status,
      ...(typeof data.progress === 'number' && { progress: data.progress }),
      ...(typeof data.imported === 'number' && { imported: data.imported }),
      ...(typeof data.duplicates === 'number' && { duplicates: data.duplicates }),
      ...(typeof data.error === 'string' && { error: data.error })
    };
  }


}
