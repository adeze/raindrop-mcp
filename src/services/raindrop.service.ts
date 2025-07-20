import axios, { Axios, AxiosError } from 'axios';
// Import dotenv at the entry point
import { config } from 'dotenv';
config(); // Load .env file
// Import shared types
import type { Collection, Bookmark, Highlight,HighlightContent, SearchParams } from '../types/raindrop.js';
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { CollectionSchema } from '../types/raindrop.js';

// Check if the token exists
const raindropAccessToken = process.env.RAINDROP_ACCESS_TOKEN;
if (!raindropAccessToken) {
  // Use more graceful handling in production
  throw new Error('RAINDROP_ACCESS_TOKEN environment variable is required. Please check your .env file or environment settings.');
}

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

  // Collections
  async getCollections(): Promise<Collection[]> {
    const { data } = await this.api.get('/collections');

    // Preprocess the API response to fix discrepancies
    const processedCollections = data.items.map((collection: any) => ({
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
    return data.item;
  }

  async getChildCollections(parentId: number): Promise<Collection[]> {
    const { data } = await this.api.get(`/collections/${parentId}/childrens`);
    return data.items;
  }

  async createCollection(title: string, isPublic = false): Promise<Collection> {
    const { data } = await this.api.post('/collection', {
      title,
      public: isPublic,
    });
    return data.item;
  }

  async updateCollection(id: number, updates: Partial<Collection>): Promise<Collection> {
    const { data } = await this.api.put(`/collection/${id}`, updates);
    return data.item;
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

    // Handle collection parameter
    if (params.collection === undefined && !params.search) {
      // Use the default collection endpoint if no specific collection or search
      const { data } = await this.api.get('/raindrops/0', { params: queryParams });
      return data;
    }
    
    // For specific collection or search
    const endpoint = params.collection !== undefined ? `/raindrops/${params.collection}` : '/raindrops/0';
    const { data } = await this.api.get(endpoint, { params: queryParams });
    return data;
  }

  async getBookmark(id: number): Promise<Bookmark> {
    const { data } = await this.api.get(`/raindrop/${id}`);
    return data.item;
  }

  async createBookmark(collectionId: number, bookmark: Partial<Bookmark>): Promise<Bookmark> {
    const { data } = await this.api.post(`/raindrop`, {
      ...bookmark,
      collection: { $id: collectionId },
    });
    return data.item;
  }

  async updateBookmark(id: number, updates: Partial<Bookmark>): Promise<Bookmark> {
    const { data } = await this.api.put(`/raindrop/${id}`, updates);
    return data.item;
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
    return { result: data.result };
  }

  // Tags
  async getTags(collectionId?: number): Promise<{ _id: string; count: number }[]> {
    const endpoint = collectionId ? `/tags/${collectionId}` : '/tags/0';
    const { data } = await this.api.get(endpoint);
    if (!data || !data.items) {
      throw new Error('Invalid response structure from Raindrop.io API');
    }
    return data.items;
  }

  async getTagsByCollection(collectionId: number): Promise<{ _id: string; count: number }[]> {
    return this.getTags(collectionId);
  }

  async deleteTags(collectionId: number | undefined, tags: string[]): Promise<{ result: boolean }> {
    const endpoint = collectionId ? `/tags/${collectionId}` : '/tags/0';
    const { data } = await this.api.delete(endpoint, {
      data: { tags }
    });
    return { result: data.result };
  }

  async renameTag(collectionId: number | undefined, oldName: string, newName: string): Promise<{ result: boolean }> {
    const endpoint = collectionId ? `/tags/${collectionId}` : '/tags/0';
    const { data } = await this.api.put(endpoint, {
      from: oldName,
      to: newName
    });
    return { result: data.result };
  }

  async mergeTags(collectionId: number | undefined, tags: string[], newName: string): Promise<{ result: boolean }> {
    const endpoint = collectionId ? `/tags/${collectionId}` : '/tags/0';
    const { data } = await this.api.put(endpoint, {
      tags,
      to: newName
    });
    return { result: data.result };
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
    return { result: data.result || false };
  }

  async toggleCollectionsExpansion(expand: boolean): Promise<{ result: boolean }> {
    const { data } = await this.api.put('/collections/collapsed', { collapsed: !expand });
    return { result: data.result || false };
  }

  async mergeCollections(targetCollectionId: number, collectionIds: number[]): Promise<{ result: boolean }> {
    const { data } = await this.api.put(`/collection/${targetCollectionId}/merge`, {
      with: collectionIds
    });
    return { result: data.result || false };
  }

  async removeEmptyCollections(): Promise<{ count: number }> {
    const { data } = await this.api.put('/collections/clean');
    return { count: data.count || 0 };
  }

  async emptyTrash(): Promise<{ result: boolean }> {
    const { data } = await this.api.put('/collection/-99/clear');
    return { result: data.result || false };
  }

  // Highlights
  async getHighlights(raindropId: number): Promise<Highlight[]> {
    try {
      // According to the documentation, the endpoint for a specific raindrop's highlights is /raindrop/{id}/highlights
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
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return []; // Return empty array if no highlights found
      }
      throw new Error(`Failed to get highlights for raindrop ${raindropId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  async getAllHighlights(): Promise<Highlight[]> {
      const { data } = await this.api.get('/highlights');
      return data.items;
  }

  // Helper to convert the new highlight content format to our Highlight type
  private mapHighlightContentToHighlight(content: any): Highlight | null {
    if (!content || !content.metadata) {
      return null;
    }

    // Extract raindrop ID from URI if possible
    const raindropIdMatch = content.uri?.match(/highlights:\/\/(\d+)\//) || [];
    const raindropId = content.metadata.raindrop?._id || 
                       (raindropIdMatch[1] ? parseInt(raindropIdMatch[1], 10) : 0);

    return {
      _id: parseInt(content.metadata.id, 10) || 0, // Convert string ID to number
      text: content.text || '',
      note: content.metadata.note || '',
      color: content.metadata.color || 'yellow', // Default to yellow if not provided
      created: content.metadata.created || new Date().toISOString(),
      lastUpdate: content.metadata.lastUpdate || content.metadata.created || new Date().toISOString(),
      title: content.metadata.title || '',
      tags: content.metadata.tags || [],
      link: content.metadata.link || '',
      excerpt: content.metadata.excerpt || '',
      raindrop: {
        _id: raindropId,
        title: content.metadata.title || '',
        link: content.metadata.link || '',
        collection: content.metadata.collection || { $id: 0 },
      },
    };
  }

  async getAllHighlightsByPage(page = 0, perPage = 25): Promise<Highlight[]> {
    try {
      // Use the correct endpoint based on testing: /highlights (not /user/highlights)
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
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return []; // Return empty array if endpoint not found
      }
      throw new Error(`Failed to get all highlights: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  async getHighlightsByCollection(collectionId: number): Promise<Highlight[]> {
    try {
      // According to the API docs, the endpoint for highlights by collection is /highlights/collection/{id}
      const { data } = await this.api.get(`/highlights/${collectionId}`);
      
      if (data.contents && Array.isArray(data.contents)) {
        return data.contents.map((item: any) => this.mapHighlightData(item)).filter(Boolean);
      }
      
      if (data.items && Array.isArray(data.items)) {
        return data.items.map((item: any) => this.mapHighlightData(item)).filter(Boolean);
      }
      
      return [];
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        // Collection might not exist or has no highlights
        return [];
      }
      throw new Error(`Failed to get highlights for collection ${collectionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createHighlight(raindropId: number, highlightData: { text: string; note?: string; color?: string }): Promise<Highlight> {
    try {
      const { data } = await this.api.post('/highlights', {
        ...highlightData,
        raindrop: { $id: raindropId }
      });
      
      if (!data || !data.item) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      // Use the map helper to ensure consistent formatting
      const highlight = this.mapHighlightData({
        ...data.item,
        raindrop: data.item.raindrop || { _id: raindropId }
      });
      
      if (!highlight) {
        throw new Error('Failed to create highlight: Invalid response data');
      }
      
      return highlight;
    } catch (error) {
      throw new Error(`Failed to create highlight: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateHighlight(id: number, updates: { text?: string; note?: string; color?: string }): Promise<Highlight> {
    try {
      const { data } = await this.api.put(`/highlights/${id}`, updates);
      
      if (!data || !data.item) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      const highlight = this.mapHighlightData(data.item);
      
      if (!highlight) {
        throw new Error('Failed to update highlight: Invalid response data');
      }
      
      return highlight;
    } catch (error) {
      throw new Error(`Failed to update highlight: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteHighlight(id: number): Promise<void> {
    try {
      await this.api.delete(`/highlights/${id}`);
    } catch (error) {
      throw new Error(`Failed to delete highlight with ID ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    
    const { data } = await this.api.get('/raindrops/0', { 
      params: queryParams 
    });
    
    return data;
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

    return data.item;
  }

  // Reminder management
  async setReminder(raindropId: number, reminder: { date: string; note?: string }): Promise<Bookmark> {
    const { data } = await this.api.put(`/raindrop/${raindropId}/reminder`, reminder);
    return data.item;
  }

  async deleteReminder(raindropId: number): Promise<Bookmark> {
    const { data } = await this.api.delete(`/raindrop/${raindropId}/reminder`);
    return data.item;
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
