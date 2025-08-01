/**
 * RaindropService: Integration layer for Raindrop.io REST API.
 *
 * Provides methods for managing collections, bookmarks, highlights, and tags using the official Raindrop.io API.
 * All methods use Zod for schema validation and return type-safe results.
 *
 * Throws descriptive errors for API failures and validation issues.
 */
import ky, { type KyInstance, HTTPError } from 'ky';
import type { Bookmark, Collection, Highlight, SearchParams } from '../types/raindrop.js';
import { CollectionSchema } from '../types/raindrop.js';


// Check if the token exists
const raindropAccessToken = process.env.RAINDROP_ACCESS_TOKEN;
if (!raindropAccessToken) {
  // Use more graceful handling in production
  throw new Error('RAINDROP_ACCESS_TOKEN environment variable is required. Please check your .env file or environment settings.');
}

/**
 * Service class for interacting with the Raindrop.io API.
 * Handles authentication, request/response validation, and error handling.
 */
class RaindropService {
  private api: KyInstance;

  constructor() {
    this.api = ky.create({
      prefixUrl: 'https://api.raindrop.io/rest/v1',
      headers: {
        Authorization: `Bearer ${raindropAccessToken}`,
      },
      timeout: 10000,
      retry: {
        limit: 2,
        methods: ['get'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504]
      },
      hooks: {
        beforeError: [
          error => {
            const { response } = error;
            if (response?.status === 401) {
              error.message = 'Unauthorized (401). Your Raindrop.io access token is invalid, expired, or missing required permissions. Please check your RAINDROP_ACCESS_TOKEN environment variable.';
            } else if (response?.status === 429) {
              error.message = 'Rate limited (429). Please wait before making more requests to the Raindrop.io API.';
            } else if (response?.status >= 500) {
              error.message = `Raindrop.io API server error (${response.status}). Please try again later.`;
            }
            return error;
          }
        ]
      }
    });
  }

  // Common response handlers
  private handleItemResponse<T>(data: any): T {
    if (!data || !data.item) {
      throw new Error('Invalid response structure from Raindrop.io API');
    }
    return data.item;
  }

  private handleItemsResponse<T>(data: any): T[] {
    if (!data || !data.items) {
      throw new Error('Invalid response structure from Raindrop.io API');
    }
    return data.items;
  }

  private handleCollectionResponse(data: any): { items: any[]; count: number } {
    return {
      items: data.items || [],
      count: data.count || 0
    };
  }

  private handleResultResponse(data: any): { result: boolean } {
    return { result: data.result || false };
  }

  // Common endpoint builders
  private buildTagEndpoint(collectionId?: number): string {
    return collectionId ? `/tags/${collectionId}` : '/tags/0';
  }

  private buildRaindropEndpoint(collection?: number): string {
    return collection !== undefined ? `/raindrops/${collection}` : '/raindrops/0';
  }

  // Common error handler
  private handleApiError<T>(error: any, operation: string, defaultValue?: T): T | never {
    if (error instanceof HTTPError) {
      if (error.response?.status === 404 && defaultValue !== undefined) {
        return defaultValue;
      }
      // Error messages are already handled by ky hooks
      throw new Error(`${operation}: ${error.message}`);
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`${operation}: ${message}`);
  }

  // Common async operation wrapper
  private async safeApiCall<T>(
    operation: () => Promise<T>, 
    errorMessage: string, 
    defaultValue?: T
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      return this.handleApiError(error, errorMessage, defaultValue);
    }
  }


  // Simple API call wrapper with ky
  private async callApi<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    responseHandler?: (data: any) => T
  ): Promise<T> {
    try {
      let response;
      
      switch (method) {
        case 'GET':
          response = await this.api.get(endpoint, { 
            searchParams: data 
          }).json();
          break;
        case 'POST':
          response = await this.api.post(endpoint, { 
            json: data 
          }).json();
          break;
        case 'PUT':
          response = await this.api.put(endpoint, { 
            json: data 
          }).json();
          break;
        case 'DELETE':
          if (data && Object.keys(data).length > 0) {
            response = await this.api.delete(endpoint, { 
              json: data 
            }).json();
          } else {
            response = await this.api.delete(endpoint).json();
          }
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      return responseHandler ? responseHandler(response) : response as T;
    } catch (error) {
      throw this.handleApiError(error, `${method} ${endpoint}`);
    }
  }


  // Collections - Using simplified approach
  async getCollections(): Promise<Collection[]> {
    return await this.callApi('GET', '/collections', undefined, (data) => {
      const items = this.handleItemsResponse(data);
      const processedCollections = items.map((collection: any) => ({
        ...collection,
        sort: typeof collection.sort === 'number' ? collection.sort.toString() : collection.sort,
        parent: collection.parent === null ? undefined : collection.parent,
      }));
      return CollectionSchema.array().parse(processedCollections);
    });
  }

  async getCollection(id: number): Promise<Collection> {
    return await this.callApi('GET', `/collection/${id}`, undefined, 
      (data) => this.handleItemResponse<Collection>(data));
  }

  async getChildCollections(parentId: number): Promise<Collection[]> {
    return await this.callApi('GET', `/collections/${parentId}/childrens`, undefined,
      (data) => this.handleItemsResponse<Collection>(data));
  }

  async createCollection(title: string, isPublic = false): Promise<Collection> {
    return await this.callApi('POST', '/collection', { title, public: isPublic },
      (data) => this.handleItemResponse<Collection>(data));
  }

  async updateCollection(id: number, updates: Partial<Collection>): Promise<Collection> {
    return await this.callApi('PUT', `/collection/${id}`, updates,
      (data) => this.handleItemResponse<Collection>(data));
  }

  async deleteCollection(id: number): Promise<void> {
    return await this.callApi('DELETE', `/collection/${id}`);
  }

  async shareCollection(
    id: number, 
    level: 'view' | 'edit' | 'remove', 
    emails?: string[]
  ): Promise<{ link: string; access: any[] }> {
    return await this.callApi('PUT', `/collection/${id}/sharing`, { level, emails },
      (data) => ({ link: data.link, access: data.access || [] }));
  }

  // Bookmarks - Using simplified approach
  async getBookmarks(params: SearchParams = {}): Promise<{ items: Bookmark[]; count: number }> {
    const queryParams: Record<string, any> = { ...params };
    if (params.search) {
      queryParams.search = encodeURIComponent(params.search);
    }
    const endpoint = this.buildRaindropEndpoint(params.collection);
    return await this.callApi('GET', endpoint, queryParams,
      (data) => this.handleCollectionResponse(data));
  }

  async getBookmark(id: number): Promise<Bookmark> {
    return await this.callApi('GET', `/raindrop/${id}`, undefined,
      (data) => this.handleItemResponse<Bookmark>(data));
  }

  async createBookmark(collectionId: number, bookmark: Partial<Bookmark>): Promise<Bookmark> {
    const requestData = { ...bookmark, collection: { $id: collectionId } };
    return await this.callApi('POST', '/raindrop', requestData,
      (data) => this.handleItemResponse<Bookmark>(data));
  }

  async updateBookmark(id: number, updates: Partial<Bookmark>): Promise<Bookmark> {
    return await this.callApi('PUT', `/raindrop/${id}`, updates,
      (data) => this.handleItemResponse<Bookmark>(data));
  }

  async deleteBookmark(id: number): Promise<void> {
    return await this.callApi('DELETE', `/raindrop/${id}`);
  }
  
  async permanentDeleteBookmark(id: number): Promise<void> {
    return await this.callApi('DELETE', `/raindrop/${id}/permanent`);
  }

  async batchUpdateBookmarks(
    ids: number[], 
    updates: { tags?: string[]; collection?: number; important?: boolean; broken?: boolean; }
  ): Promise<{ result: boolean }> {
    return await this.callApi('PUT', '/raindrops', { ids, ...updates },
      (data) => this.handleResultResponse(data));
  }

  // Tags - Using simplified approach  
  async getTags(collectionId?: number): Promise<{ _id: string; count: number }[]> {
    const endpoint = this.buildTagEndpoint(collectionId);
    return await this.callApi('GET', endpoint, undefined,
      (data) => this.handleItemsResponse<{ _id: string; count: number }>(data));
  }

  async getTagsByCollection(collectionId: number): Promise<{ _id: string; count: number }[]> {
    return this.getTags(collectionId);
  }

  async deleteTags(collectionId: number | undefined, tags: string[]): Promise<{ result: boolean }> {
    const endpoint = this.buildTagEndpoint(collectionId);
    return await this.callApi('DELETE', endpoint, { tags },
      (data) => this.handleResultResponse(data));
  }

  async renameTag(collectionId: number | undefined, oldName: string, newName: string): Promise<{ result: boolean }> {
    const endpoint = this.buildTagEndpoint(collectionId);
    return await this.callApi('PUT', endpoint, { from: oldName, to: newName },
      (data) => this.handleResultResponse(data));
  }

  async mergeTags(collectionId: number | undefined, tags: string[], newName: string): Promise<{ result: boolean }> {
    const endpoint = this.buildTagEndpoint(collectionId);
    return await this.callApi('PUT', endpoint, { tags, to: newName },
      (data) => this.handleResultResponse(data));
  }

  // User
  async getUserInfo() {
    return await this.callApi('GET', '/user', undefined, (data) => data.user);
  }

  async getUserStats() {
    return await this.callApi('GET', '/user/stats');
  }

  async getCollectionStats(collectionId: number) {
    return await this.callApi('GET', `/collection/${collectionId}/stats`);
  }

  // Collections management
  async reorderCollections(sort: string): Promise<{ result: boolean }> {
    return await this.callApi('PUT', '/collections/sort', { sort },
      (data) => this.handleResultResponse(data));
  }

  async toggleCollectionsExpansion(expand: boolean): Promise<{ result: boolean }> {
    return await this.callApi('PUT', '/collections/collapsed', { collapsed: !expand },
      (data) => this.handleResultResponse(data));
  }

  async mergeCollections(targetCollectionId: number, collectionIds: number[]): Promise<{ result: boolean }> {
    return await this.callApi('PUT', `/collection/${targetCollectionId}/merge`, { with: collectionIds },
      (data) => this.handleResultResponse(data));
  }

  async removeEmptyCollections(): Promise<{ count: number }> {
    return await this.callApi('PUT', '/collections/clean', undefined,
      (data) => ({ count: data.count || 0 }));
  }

  async emptyTrash(): Promise<{ result: boolean }> {
    return await this.callApi('PUT', '/collection/-99/clear', undefined,
      (data) => this.handleResultResponse(data));
  }

  // Highlights
  async getHighlights(raindropId: number): Promise<Highlight[]> {
    return this.safeApiCall(
      async () => {
        const data = await this.api.get(`raindrop/${raindropId}/highlights`).json() as any;
        
        // Check for items array in response
        if (data && Array.isArray(data.items)) {
          return data.items.map((item: any) => this.mapHighlightData({
            ...item, 
            raindrop: item.raindrop || { _id: raindropId }
          })).filter(Boolean);
        }
        
        // Also try result array format
        if (data && Array.isArray(data.result)) {
          return data.result.map((item: any) => this.mapHighlightData({
            ...item, 
            raindrop: item.raindrop || { _id: raindropId }
          })).filter(Boolean);
        }
        
        return [];
      },
      `Failed to get highlights for raindrop ${raindropId}`,
      []
    );
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
  static async getAllHighlights(): Promise<Highlight[]> {
    const service = new RaindropService();
    let page = 0;
    const perPage = 50;
    let allHighlights: Highlight[] = [];
    let total = 0;

    do {
      const { items, count } = await service.getBookmarks({ page, perPage: perPage });
      total = count;
      for (const bookmark of items) {
        const highlights = await service.getHighlights(bookmark._id);
        allHighlights.push(...highlights);
      }
      page++;
    } while (page * perPage < total);

    return allHighlights;
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

  async getHighlightsByCollection(collectionId: number): Promise<Highlight[]> {
    return this.safeApiCall(
      async () => {
        const data = await this.api.get(`highlights/${collectionId}`).json() as any;
        
        if (data.contents && Array.isArray(data.contents)) {
          return data.contents.map((item: any) => this.mapHighlightData(item)).filter(Boolean);
        }
        
        if (data.items && Array.isArray(data.items)) {
          return data.items.map((item: any) => this.mapHighlightData(item)).filter(Boolean);
        }
        
        return [];
      },
      `Failed to get highlights for collection ${collectionId}`,
      []
    );
  }

  async createHighlight(raindropId: number, highlightData: { text: string; note?: string; color?: string }): Promise<Highlight> {
    return await this.callApi('POST', '/highlights', {
      ...highlightData,
      raindrop: { $id: raindropId }
    }, (data) => {
      const item = this.handleItemResponse<any>(data);
      
      // Use the map helper to ensure consistent formatting
      const highlight = this.mapHighlightData({
        ...item,
        raindrop: item.raindrop || { _id: raindropId }
      });
      
      if (!highlight) {
        throw new Error('Failed to create highlight: Invalid response data');
      }
      
      return highlight;
    });
  }

  async updateHighlight(id: number, updates: { text?: string; note?: string; color?: string }): Promise<Highlight> {
    return await this.callApi('PUT', `/highlights/${id}`, updates, (data) => {
      const item = this.handleItemResponse<any>(data);
      
      const highlight = this.mapHighlightData(item);
      
      if (!highlight) {
        throw new Error('Failed to update highlight: Invalid response data');
      }
      
      return highlight;
    });
  }

  async deleteHighlight(id: number): Promise<void> {
    return this.safeApiCall(
      async () => {
        await this.api.delete(`highlights/${id}`);
      },
      `Failed to delete highlight with ID ${id}`
    );
  }

  // Search
  async search(params: SearchParams): Promise<{ items: Bookmark[]; count: number }> {
    return this.getBookmarks(params);
  }

  // Advanced search with filters
  async searchRaindrops(params: {
    search?: string;
    collection?: number; 
    tags?: string[];
    createdStart?: string;
    createdEnd?: string;
    important?: boolean;
    media?: string;
    page?: number;
    perPage?: number;
    sort?: string;
  }): Promise<{ items: Bookmark[]; count: number }> {
    // Convert date ranges to Raindrop API format if provided
    const queryParams: Record<string, any> = { ...params };
    
    if (params.createdStart || params.createdEnd) {
      queryParams.created = {};
      if (params.createdStart) queryParams.created.$gte = params.createdStart;
      if (params.createdEnd) queryParams.created.$lte = params.createdEnd;
      
      // Remove the original params
      delete queryParams.createdStart;
      delete queryParams.createdEnd;
    }
    
    return await this.callApi('GET', '/raindrops', queryParams,
      (data) => this.handleCollectionResponse(data));
  }

  // Upload file
  async uploadFile(collectionId: number, file: any): Promise<Bookmark> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('collectionId', collectionId.toString());

    const data = await this.api.put('raindrop/file', {
      body: formData
    }).json();

    return this.handleItemResponse<Bookmark>(data);
  }

  // Reminder management
  async setReminder(raindropId: number, reminder: { date: string; note?: string }): Promise<Bookmark> {
    return await this.callApi('PUT', `/raindrop/${raindropId}/reminder`, reminder,
      (data) => this.handleItemResponse<Bookmark>(data));
  }

  async deleteReminder(raindropId: number): Promise<Bookmark> {
    return await this.callApi('DELETE', `/raindrop/${raindropId}/reminder`, undefined,
      (data) => this.handleItemResponse<Bookmark>(data));
  }

  // Import functionality
  async importBookmarks(collectionId: number, file: any, options: {
    format?: 'html' | 'csv' | 'pocket' | 'instapaper' | 'netscape' | 'readwise';
    mode?: 'add' | 'replace';
  } = {}): Promise<{ imported: number; duplicates: number }> {
    const formData = new FormData();
    formData.append('collection', collectionId.toString());
    formData.append('file', file);
    
    if (options.format) {
      formData.append('format', options.format);
    }
    
    if (options.mode) {
      formData.append('mode', options.mode);
    }
    
    const data = await this.api.post('import', {
      body: formData
    }).json() as any;
    
    return {
      imported: data.imported || 0,
      duplicates: data.duplicates || 0
    };
  }

  // Check import status
  async getImportStatus(): Promise<{
    status: 'in-progress' | 'ready' | 'error';
    progress?: number;
    imported?: number;
    duplicates?: number;
    error?: string;
  }> {
    return await this.callApi('GET', '/import/status', undefined, (data) => ({
      status: data.status,
      progress: data.progress,
      imported: data.imported,
      duplicates: data.duplicates,
      error: data.error
    }));
  }

  // Export functionality
  async exportBookmarks(options: {
    collection?: number;
    format: 'csv' | 'html' | 'pdf';
    broken?: boolean;
    duplicates?: boolean;
  }): Promise<{ url: string }> {
    return await this.callApi('POST', '/export', options, (data) => ({
      url: data.url
    }));
  }

  // Check export status
  async getExportStatus(): Promise<{
    status: 'in-progress' | 'ready' | 'error';
    progress?: number;
    url?: string;
    error?: string;
  }> {
    return await this.callApi('GET', '/export/status', undefined, (data) => ({
      status: data.status,
      progress: data.progress,
      url: data.url,
      error: data.error
    }));
  }
}

export default RaindropService;
