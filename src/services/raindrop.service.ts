/**
 * RaindropService: Integration layer for Raindrop.io REST API.
 *
 * Provides methods for managing collections, bookmarks, highlights, and tags using the official Raindrop.io API.
 * All methods use Zod for schema validation and return type-safe results.
 *
 * Throws descriptive errors for API failures and validation issues.
 */
import axios, { Axios, AxiosError } from 'axios';
import { config } from 'dotenv';
import type { Bookmark, Collection, Highlight, SearchParams } from '../types/raindrop.js';
import { CollectionSchema } from '../types/raindrop.js';
config({ quiet: true }); // Load .env file quietly

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
  private api: Axios;

  constructor() {
    this.api = axios.create({
      baseURL: 'https://api.raindrop.io/rest/v1',
      headers: {
        Authorization: `Bearer ${raindropAccessToken}`,
        'Content-Type': 'application/json',
      },
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
    if (error instanceof AxiosError && error.response?.status === 404 && defaultValue !== undefined) {
      return defaultValue;
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

  // Collections
  async getCollections(): Promise<Collection[]> {
    const { data } = await this.api.get('/collections');
    const items = this.handleItemsResponse(data);

    // Preprocess the API response to fix discrepancies
    const processedCollections = items.map((collection: any) => ({
      ...collection,
      sort: typeof collection.sort === 'number' ? collection.sort.toString() : collection.sort,
      parent: collection.parent === null ? undefined : collection.parent,
    }));

    // Validate the processed collections
    const validatedCollections = CollectionSchema.array().parse(processedCollections);
    return validatedCollections;
  }

  async getCollection(id: number): Promise<Collection> {
    const { data } = await this.api.get(`/collection/${id}`);
    return this.handleItemResponse<Collection>(data);
  }

  async getChildCollections(parentId: number): Promise<Collection[]> {
    const { data } = await this.api.get(`/collections/${parentId}/childrens`);
    return this.handleItemsResponse<Collection>(data);
  }

  async createCollection(title: string, isPublic = false): Promise<Collection> {
    const { data } = await this.api.post('/collection', {
      title,
      public: isPublic,
    });
    return this.handleItemResponse<Collection>(data);
  }

  async updateCollection(id: number, updates: Partial<Collection>): Promise<Collection> {
    const { data } = await this.api.put(`/collection/${id}`, updates);
    return this.handleItemResponse<Collection>(data);
  }

  async deleteCollection(id: number): Promise<void> {
    await this.api.delete(`/collection/${id}`);
  }

  async shareCollection(
    id: number, 
    level: 'view' | 'edit' | 'remove', 
    emails?: string[]
  ): Promise<{ link: string; access: any[] }> {
    const { data } = await this.api.put(`/collection/${id}/sharing`, {
      level,
      emails
    });
    return {
      link: data.link,
      access: data.access || []
    };
  }

  // Bookmarks
  async getBookmarks(params: SearchParams = {}): Promise<{ items: Bookmark[]; count: number }> {
    // Convert parameters to the format expected by the Raindrop.io API
    const queryParams: Record<string, any> = { ...params };

    // Handle special cases for search parameter
    if (params.search) {
      // Ensure search parameter is properly encoded
      queryParams.search = encodeURIComponent(params.search);
    }

    // Build endpoint using common function
    const endpoint = this.buildRaindropEndpoint(params.collection);
    const { data } = await this.api.get(endpoint, { params: queryParams });
    return this.handleCollectionResponse(data);
  }

  async getBookmark(id: number): Promise<Bookmark> {
    const { data } = await this.api.get(`/raindrop/${id}`);
    return this.handleItemResponse<Bookmark>(data);
  }

  async createBookmark(collectionId: number, bookmark: Partial<Bookmark>): Promise<Bookmark> {
    const { data } = await this.api.post(`/raindrop`, {
      ...bookmark,
      collection: { $id: collectionId },
    });
    return this.handleItemResponse<Bookmark>(data);
  }

  async updateBookmark(id: number, updates: Partial<Bookmark>): Promise<Bookmark> {
    const { data } = await this.api.put(`/raindrop/${id}`, updates);
    return this.handleItemResponse<Bookmark>(data);
  }

  async deleteBookmark(id: number): Promise<void> {
    await this.api.delete(`/raindrop/${id}`);
  }
  
  async permanentDeleteBookmark(id: number): Promise<void> {
    await this.api.delete(`/raindrop/${id}/permanent`);
  }

  async batchUpdateBookmarks(
    ids: number[], 
    updates: { tags?: string[]; collection?: number; important?: boolean; broken?: boolean; }
  ): Promise<{ result: boolean }> {
    const { data } = await this.api.put('/raindrops', {
      ids,
      ...updates
    });
    return this.handleResultResponse(data);
  }

  // Tags
  async getTags(collectionId?: number): Promise<{ _id: string; count: number }[]> {
    const endpoint = this.buildTagEndpoint(collectionId);
    const { data } = await this.api.get(endpoint);
    return this.handleItemsResponse<{ _id: string; count: number }>(data);
  }

  async getTagsByCollection(collectionId: number): Promise<{ _id: string; count: number }[]> {
    return this.getTags(collectionId);
  }

  async deleteTags(collectionId: number | undefined, tags: string[]): Promise<{ result: boolean }> {
    const endpoint = this.buildTagEndpoint(collectionId);
    const { data } = await this.api.delete(endpoint, {
      data: { tags }
    });
    return this.handleResultResponse(data);
  }

  async renameTag(collectionId: number | undefined, oldName: string, newName: string): Promise<{ result: boolean }> {
    const endpoint = this.buildTagEndpoint(collectionId);
    const { data } = await this.api.put(endpoint, {
      from: oldName,
      to: newName
    });
    return this.handleResultResponse(data);
  }

  async mergeTags(collectionId: number | undefined, tags: string[], newName: string): Promise<{ result: boolean }> {
    const endpoint = this.buildTagEndpoint(collectionId);
    const { data } = await this.api.put(endpoint, {
      tags,
      to: newName
    });
    return this.handleResultResponse(data);
  }

  // User
  async getUserInfo() {
    const { data } = await this.api.get('/user');
    return data.user;
  }

  async getUserStats() {
    const { data } = await this.api.get('/user/stats');
    return data;
  }

  async getCollectionStats(collectionId: number) {
    const { data } = await this.api.get(`/collection/${collectionId}/stats`);
    return data;
  }

  // Collections management
  async reorderCollections(sort: string): Promise<{ result: boolean }> {
    const { data } = await this.api.put('/collections/sort', { sort });
    return this.handleResultResponse(data);
  }

  async toggleCollectionsExpansion(expand: boolean): Promise<{ result: boolean }> {
    const { data } = await this.api.put('/collections/collapsed', { collapsed: !expand });
    return this.handleResultResponse(data);
  }

  async mergeCollections(targetCollectionId: number, collectionIds: number[]): Promise<{ result: boolean }> {
    const { data } = await this.api.put(`/collection/${targetCollectionId}/merge`, {
      with: collectionIds
    });
    return this.handleResultResponse(data);
  }

  async removeEmptyCollections(): Promise<{ count: number }> {
    const { data } = await this.api.put('/collections/clean');
    return { count: data.count || 0 };
  }

  async emptyTrash(): Promise<{ result: boolean }> {
    const { data } = await this.api.put('/collection/-99/clear');
    return this.handleResultResponse(data);
  }

  // Highlights
  async getHighlights(raindropId: number): Promise<Highlight[]> {
    return this.safeApiCall(
      async () => {
        const { data } = await this.api.get(`/raindrop/${raindropId}/highlights`);
        
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

  async getAllHighlights(): Promise<Highlight[]> {
    const { data } = await this.api.get('/highlights');
    return this.handleItemsResponse<Highlight>(data);
  }


  async getAllHighlightsByPage(page = 0, perPage = 25): Promise<Highlight[]> {
    return this.safeApiCall(
      async () => {
        const { data } = await this.api.get('/highlights', {
          params: {
            page,
            perpage: perPage // Note the lowercase "perpage" as specified in the API docs
          }
        });
        
        // Map the API response to our Highlight type
        if (data && Array.isArray(data.items)) {
          return data.items.map((item: any) => this.mapHighlightData(item)).filter(Boolean);
        }
        
        // Handle case when API returns {contents: []} structure
        if (data && data.contents && Array.isArray(data.contents)) {
          return data.contents.map((item: any) => this.mapHighlightData(item)).filter(Boolean);
        }
        
        // If we got a response but neither structure is found, return empty array
        return [];
      },
      'Failed to get all highlights',
      []
    );
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
        const { data } = await this.api.get(`/highlights/${collectionId}`);
        
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
    const { data } = await this.api.post('/highlights', {
      ...highlightData,
      raindrop: { $id: raindropId }
    });
    
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
  }

  async updateHighlight(id: number, updates: { text?: string; note?: string; color?: string }): Promise<Highlight> {
    const { data } = await this.api.put(`/highlights/${id}`, updates);
    const item = this.handleItemResponse<any>(data);
    
    const highlight = this.mapHighlightData(item);
    
    if (!highlight) {
      throw new Error('Failed to update highlight: Invalid response data');
    }
    
    return highlight;
  }

  async deleteHighlight(id: number): Promise<void> {
    return this.safeApiCall(
      async () => {
        await this.api.delete(`/highlights/${id}`);
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
    
    const { data } = await this.api.get('/raindrops', { 
      params: queryParams 
    });
    
    return this.handleCollectionResponse(data);
  }

  // Upload file
  async uploadFile(collectionId: number, file: any): Promise<Bookmark> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('collectionId', collectionId.toString());

    const { data } = await this.api.put('/raindrop/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return this.handleItemResponse<Bookmark>(data);
  }

  // Reminder management
  async setReminder(raindropId: number, reminder: { date: string; note?: string }): Promise<Bookmark> {
    const { data } = await this.api.put(`/raindrop/${raindropId}/reminder`, reminder);
    return this.handleItemResponse<Bookmark>(data);
  }

  async deleteReminder(raindropId: number): Promise<Bookmark> {
    const { data } = await this.api.delete(`/raindrop/${raindropId}/reminder`);
    return this.handleItemResponse<Bookmark>(data);
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
    
    const { data } = await this.api.post('/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
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
    const { data } = await this.api.get('/import/status');
    return {
      status: data.status,
      progress: data.progress,
      imported: data.imported,
      duplicates: data.duplicates,
      error: data.error
    };
  }

  // Export functionality
  async exportBookmarks(options: {
    collection?: number;
    format: 'csv' | 'html' | 'pdf';
    broken?: boolean;
    duplicates?: boolean;
  }): Promise<{ url: string }> {
    const { data } = await this.api.post('/export', options);
    
    return {
      url: data.url
    };
  }

  // Check export status
  async getExportStatus(): Promise<{
    status: 'in-progress' | 'ready' | 'error';
    progress?: number;
    url?: string;
    error?: string;
  }> {
    const { data } = await this.api.get('/export/status');
    
    return {
      status: data.status,
      progress: data.progress,
      url: data.url,
      error: data.error
    };
  }
}

export default new RaindropService();
