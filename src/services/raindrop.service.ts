/**
 * RaindropService: Integration layer for Raindrop.io REST API.
 *
 * Provides methods for managing collections, bookmarks, highlights, and tags using the official Raindrop.io API.
 * All methods use openapi-fetch with generated TypeScript types for complete type safety.
 *
 * Throws descriptive errors for API failures and validation issues.
 */
import createClient from 'openapi-fetch';
import type { paths, components } from '../types/raindrop.schema.js';
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
  private client: ReturnType<typeof createClient<paths>>;

  constructor() {
    this.client = createClient<paths>({
      baseUrl: 'https://api.raindrop.io/rest/v1',
      headers: {
        Authorization: `Bearer ${raindropAccessToken}`,
      },
    });
  }

  // Type-safe API error handler
  private handleApiError(error: any, operation: string): never {
    if (error?.response?.status === 401) {
      throw new Error(`${operation}: Unauthorized (401). Your Raindrop.io access token is invalid, expired, or missing required permissions. Please check your RAINDROP_ACCESS_TOKEN environment variable.`);
    } else if (error?.response?.status === 429) {
      throw new Error(`${operation}: Rate limited (429). Please wait before making more requests to the Raindrop.io API.`);
    } else if (error?.response?.status >= 500) {
      throw new Error(`${operation}: Raindrop.io API server error (${error.response.status}). Please try again later.`);
    } else if (error?.response?.status === 404) {
      throw new Error(`${operation}: Resource not found (404).`);
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`${operation}: ${message}`);
  }


  // Collections - Type-safe with openapi-fetch
  async getCollections(): Promise<Collection[]> {
    try {
      const { data, error } = await this.client.GET('/collections');
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.items) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      const processedCollections = data.items.map((collection: any) => ({
        ...collection,
        sort: typeof collection.sort === 'number' ? collection.sort.toString() : collection.sort,
        parent: collection.parent === null ? undefined : collection.parent,
      }));
      
      return CollectionSchema.array().parse(processedCollections);
    } catch (error) {
      return this.handleApiError(error, 'Failed to get collections');
    }
  }

  async getCollection(id: number): Promise<Collection> {
    try {
      const { data, error } = await this.client.GET('/collection/{id}', {
        params: { path: { id } }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.item) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return data.item as Collection;
    } catch (error) {
      return this.handleApiError(error, `Failed to get collection ${id}`);
    }
  }

  async getChildCollections(parentId: number): Promise<Collection[]> {
    try {
      const { data, error } = await this.client.GET('/collections/{parentId}/childrens', {
        params: { path: { parentId } }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.items) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return data.items as Collection[];
    } catch (error) {
      return this.handleApiError(error, `Failed to get child collections for ${parentId}`);
    }
  }

  async createCollection(title: string, isPublic = false): Promise<Collection> {
    try {
      const { data, error } = await this.client.POST('/collection', {
        body: {
          title,
          public: isPublic,
        }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.item) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return data.item as Collection;
    } catch (error) {
      return this.handleApiError(error, 'Failed to create collection');
    }
  }

  async updateCollection(id: number, updates: Partial<Collection>): Promise<Collection> {
    try {
      const { data, error } = await this.client.PUT('/collection/{id}', {
        params: { path: { id } },
        body: updates
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.item) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return data.item as Collection;
    } catch (error) {
      return this.handleApiError(error, `Failed to update collection ${id}`);
    }
  }

  async deleteCollection(id: number): Promise<void> {
    try {
      const { error } = await this.client.DELETE('/collection/{id}', {
        params: { path: { id } }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
    } catch (error) {
      return this.handleApiError(error, `Failed to delete collection ${id}`);
    }
  }

  async shareCollection(
    id: number, 
    level: 'view' | 'edit' | 'remove', 
    emails?: string[]
  ): Promise<{ link: string; access: any[] }> {
    try {
      const { data, error } = await this.client.PUT('/collection/{id}/sharing', {
        params: { path: { id } },
        body: { level, emails }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return { link: data.link, access: data.access || [] };
    } catch (error) {
      return this.handleApiError(error, `Failed to share collection ${id}`);
    }
  }

  // Bookmarks - Type-safe with openapi-fetch
  async getBookmarks(params: SearchParams = {}): Promise<{ items: Bookmark[]; count: number }> {
    try {
      const endpoint = params.collection !== undefined ? `/raindrops/${params.collection}` : '/raindrops/0';
      
      // Determine the correct endpoint based on collection parameter
      let response;
      if (params.collection !== undefined) {
        response = await this.client.GET('/raindrops/{collectionId}', {
          params: {
            path: { id: params.collection },
            query: {
              search: params.search,
              sort: params.sort as any,
              tag: params.tag,
              important: params.important,
              duplicates: params.duplicates,
              broken: params.broken,
              highlight: params.highlight,
              domain: params.domain,
              perpage: params.perPage,
              page: params.page
            }
          }
        });
      } else {
        response = await this.client.GET('/raindrops/0', {
          params: {
            query: {
              search: params.search,
              sort: params.sort as any,
              tag: params.tag,
              important: params.important,
              duplicates: params.duplicates,
              broken: params.broken,
              highlight: params.highlight,
              domain: params.domain,
              perpage: params.perPage,
              page: params.page
            }
          }
        });
      }
      
      const { data, error } = response;
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return {
        items: data.items as Bookmark[] || [],
        count: data.count || 0
      };
    } catch (error) {
      return this.handleApiError(error, 'Failed to get bookmarks');
    }
  }

  async getBookmark(id: number): Promise<Bookmark> {
    try {
      const { data, error } = await this.client.GET('/raindrop/{id}', {
        params: { path: { id } }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.item) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return data.item as Bookmark;
    } catch (error) {
      return this.handleApiError(error, `Failed to get bookmark ${id}`);
    }
  }

  async createBookmark(collectionId: number, bookmark: Partial<Bookmark>): Promise<Bookmark> {
    try {
      const { data, error } = await this.client.POST('/raindrop', {
        body: {
          link: bookmark.link!,
          title: bookmark.title,
          excerpt: bookmark.excerpt,
          tags: bookmark.tags,
          important: bookmark.important || false,
          collection: { $id: collectionId },
          pleaseParse: {}
        }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.item) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return data.item as Bookmark;
    } catch (error) {
      return this.handleApiError(error, 'Failed to create bookmark');
    }
  }

  async updateBookmark(id: number, updates: Partial<Bookmark>): Promise<Bookmark> {
    try {
      const { data, error } = await this.client.PUT('/raindrop/{id}', {
        params: { path: { id } },
        body: {
          link: updates.link,
          title: updates.title,
          excerpt: updates.excerpt,
          note: updates.note,
          tags: updates.tags,
          important: updates.important,
          collection: updates.collection ? { $id: updates.collection.$id } : undefined,
          cover: updates.cover
        }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.item) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return data.item as Bookmark;
    } catch (error) {
      return this.handleApiError(error, `Failed to update bookmark ${id}`);
    }
  }

  async deleteBookmark(id: number): Promise<void> {
    try {
      const { error } = await this.client.DELETE('/raindrop/{id}', {
        params: { path: { id } }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
    } catch (error) {
      return this.handleApiError(error, `Failed to delete bookmark ${id}`);
    }
  }
  
  async permanentDeleteBookmark(id: number): Promise<void> {
    try {
      const { error } = await this.client.DELETE('/raindrop/{id}/permanent', {
        params: { path: { id } }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
    } catch (error) {
      return this.handleApiError(error, `Failed to permanently delete bookmark ${id}`);
    }
  }

  async batchUpdateBookmarks(
    ids: number[], 
    updates: { tags?: string[]; collection?: number; important?: boolean; broken?: boolean; }
  ): Promise<{ result: boolean }> {
    try {
      const { data, error } = await this.client.PUT('/raindrops', {
        body: {
          ids,
          tags: updates.tags,
          collection: updates.collection ? { $id: updates.collection } : undefined,
          important: updates.important,
          broken: updates.broken
        }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      return { result: data?.result || false };
    } catch (error) {
      return this.handleApiError(error, 'Failed to batch update bookmarks');
    }
  }

  // Tags - Type-safe with openapi-fetch
  async getTags(collectionId?: number): Promise<{ _id: string; count: number }[]> {
    try {
      let response;
      if (collectionId !== undefined) {
        response = await this.client.GET('/tags/{collectionId}', {
          params: { path: { id: collectionId } }
        });
      } else {
        response = await this.client.GET('/tags/0');
      }
      
      const { data, error } = response;
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.items) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return data.items as { _id: string; count: number }[];
    } catch (error) {
      return this.handleApiError(error, 'Failed to get tags');
    }
  }

  async getTagsByCollection(collectionId: number): Promise<{ _id: string; count: number }[]> {
    return this.getTags(collectionId);
  }

  async deleteTags(collectionId: number | undefined, tags: string[]): Promise<{ result: boolean }> {
    try {
      let response;
      if (collectionId !== undefined) {
        response = await this.client.DELETE('/tags/{collectionId}', {
          params: { path: { id: collectionId } },
          body: { tags }
        });
      } else {
        response = await this.client.DELETE('/tags/0', {
          body: { tags }
        });
      }
      
      const { data, error } = response;
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      return { result: data?.result || false };
    } catch (error) {
      return this.handleApiError(error, 'Failed to delete tags');
    }
  }

  async renameTag(collectionId: number | undefined, oldName: string, newName: string): Promise<{ result: boolean }> {
    try {
      let response;
      if (collectionId !== undefined) {
        response = await this.client.PUT('/tags/{collectionId}', {
          params: { path: { id: collectionId } },
          body: { from: oldName, to: newName }
        });
      } else {
        response = await this.client.PUT('/tags/0', {
          body: { from: oldName, to: newName }
        });
      }
      
      const { data, error } = response;
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      return { result: data?.result || false };
    } catch (error) {
      return this.handleApiError(error, 'Failed to rename tag');
    }
  }

  async mergeTags(collectionId: number | undefined, tags: string[], newName: string): Promise<{ result: boolean }> {
    try {
      let response;
      if (collectionId !== undefined) {
        response = await this.client.PUT('/tags/{collectionId}', {
          params: { path: { id: collectionId } },
          body: { tags, to: newName }
        });
      } else {
        response = await this.client.PUT('/tags/0', {
          body: { tags, to: newName }
        });
      }
      
      const { data, error } = response;
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      return { result: data?.result || false };
    } catch (error) {
      return this.handleApiError(error, 'Failed to merge tags');
    }
  }

  // User - Type-safe with openapi-fetch
  async getUserInfo() {
    try {
      const { data, error } = await this.client.GET('/user');
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.user) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return data.user;
    } catch (error) {
      return this.handleApiError(error, 'Failed to get user info');
    }
  }

  async getUserStats() {
    try {
      const { data, error } = await this.client.GET('/user/stats');
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.stats) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return data.stats;
    } catch (error) {
      return this.handleApiError(error, 'Failed to get user stats');
    }
  }

  async getCollectionStats(collectionId: number) {
    try {
      const { data, error } = await this.client.GET('/collection/{id}/stats', {
        params: { path: { id: collectionId } }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.stats) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return data.stats;
    } catch (error) {
      return this.handleApiError(error, `Failed to get collection stats for ${collectionId}`);
    }
  }

  // Collections management - Type-safe with openapi-fetch
  async reorderCollections(sort: string): Promise<{ result: boolean }> {
    try {
      const { data, error } = await this.client.PUT('/collections/sort', {
        body: { sort }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      return { result: data?.result || false };
    } catch (error) {
      return this.handleApiError(error, 'Failed to reorder collections');
    }
  }

  async toggleCollectionsExpansion(expand: boolean): Promise<{ result: boolean }> {
    try {
      const { data, error } = await this.client.PUT('/collections/collapsed', {
        body: { collapsed: !expand }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      return { result: data?.result || false };
    } catch (error) {
      return this.handleApiError(error, 'Failed to toggle collections expansion');
    }
  }

  async mergeCollections(targetCollectionId: number, collectionIds: number[]): Promise<{ result: boolean }> {
    try {
      const { data, error } = await this.client.PUT('/collection/{id}/merge', {
        params: { path: { id: targetCollectionId } },
        body: { with: collectionIds }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      return { result: data?.result || false };
    } catch (error) {
      return this.handleApiError(error, 'Failed to merge collections');
    }
  }

  async removeEmptyCollections(): Promise<{ count: number }> {
    try {
      const { data, error } = await this.client.PUT('/collections/clean');
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      return { count: data?.count || 0 };
    } catch (error) {
      return this.handleApiError(error, 'Failed to remove empty collections');
    }
  }

  async emptyTrash(): Promise<{ result: boolean }> {
    try {
      const { data, error } = await this.client.PUT('/collection/-99/clear');
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      return { result: data?.result || false };
    } catch (error) {
      return this.handleApiError(error, 'Failed to empty trash');
    }
  }

  // Highlights - Type-safe with openapi-fetch
  async getHighlights(raindropId: number): Promise<Highlight[]> {
    try {
      const { data, error } = await this.client.GET('/raindrop/{id}/highlights', {
        params: { path: { id: raindropId } }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.items) {
        return [];
      }
      
      return data.items.map((item: any) => this.mapHighlightData({
        ...item, 
        raindrop: item.raindrop || { _id: raindropId }
      })).filter((h): h is Highlight => h !== null);
    } catch (error) {
      // Return empty array for highlights since they might not exist
      if ((error as any)?.status === 404) {
        return [];
      }
      return this.handleApiError(error, `Failed to get highlights for raindrop ${raindropId}`);
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
    try {
      const { data, error } = await this.client.GET('/highlights/{collectionId}', {
        params: { path: { collectionId } }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.items) {
        return [];
      }
      
      return data.items.map((item: any) => this.mapHighlightData(item)).filter((h): h is Highlight => h !== null);
    } catch (error) {
      // Return empty array for highlights since they might not exist
      if ((error as any)?.status === 404) {
        return [];
      }
      return this.handleApiError(error, `Failed to get highlights for collection ${collectionId}`);
    }
  }

  async createHighlight(raindropId: number, highlightData: { text: string; note?: string; color?: string }): Promise<Highlight> {
    try {
      const { data, error } = await this.client.POST('/highlights', {
        body: {
          raindrop: { $id: raindropId },
          text: highlightData.text,
          note: highlightData.note,
          color: highlightData.color as any || 'yellow'
        }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.item) {
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
      return this.handleApiError(error, 'Failed to create highlight');
    }
  }

  async updateHighlight(id: number, updates: { text?: string; note?: string; color?: string }): Promise<Highlight> {
    try {
      const { data, error } = await this.client.PUT('/highlights/{id}', {
        params: { path: { id } },
        body: {
          text: updates.text,
          note: updates.note,
          color: updates.color as any
        }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.item) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      const highlight = this.mapHighlightData(data.item);
      
      if (!highlight) {
        throw new Error('Failed to update highlight: Invalid response data');
      }
      
      return highlight;
    } catch (error) {
      return this.handleApiError(error, `Failed to update highlight ${id}`);
    }
  }

  async deleteHighlight(id: number): Promise<void> {
    try {
      const { error } = await this.client.DELETE('/highlights/{id}', {
        params: { path: { id } }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
    } catch (error) {
      return this.handleApiError(error, `Failed to delete highlight ${id}`);
    }
  }

  // Search - Type-safe with openapi-fetch
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
    try {
      const { data, error } = await this.client.GET('/raindrops', {
        params: {
          query: {
            search: params.search,
            collection: params.collection,
            tags: params.tags,
            createdStart: params.createdStart,
            createdEnd: params.createdEnd,
            important: params.important,
            media: params.media,
            page: params.page,
            perpage: params.perPage,
            sort: params.sort as any
          }
        }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return {
        items: data.items as Bookmark[] || [],
        count: data.count || 0
      };
    } catch (error) {
      return this.handleApiError(error, 'Failed to search raindrops');
    }
  }

  // Upload file - Type-safe with openapi-fetch
  async uploadFile(collectionId: number, file: any): Promise<Bookmark> {
    try {
      const { data, error } = await this.client.PUT('/raindrop/file', {
        body: {
          file: file,
          collectionId: collectionId.toString()
        }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.item) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return data.item as Bookmark;
    } catch (error) {
      return this.handleApiError(error, 'Failed to upload file');
    }
  }

  // Reminder management - Type-safe with openapi-fetch
  async setReminder(raindropId: number, reminder: { date: string; note?: string }): Promise<Bookmark> {
    try {
      const { data, error } = await this.client.PUT('/raindrop/{id}/reminder', {
        params: { path: { id: raindropId } },
        body: {
          date: reminder.date,
          note: reminder.note
        }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.item) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return data.item as Bookmark;
    } catch (error) {
      return this.handleApiError(error, `Failed to set reminder for bookmark ${raindropId}`);
    }
  }

  async deleteReminder(raindropId: number): Promise<Bookmark> {
    try {
      const { data, error } = await this.client.DELETE('/raindrop/{id}/reminder', {
        params: { path: { id: raindropId } }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.item) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return data.item as Bookmark;
    } catch (error) {
      return this.handleApiError(error, `Failed to delete reminder for bookmark ${raindropId}`);
    }
  }

  // Import functionality - Type-safe with openapi-fetch
  async importBookmarks(collectionId: number, file: any, options: {
    format?: 'html' | 'csv' | 'pocket' | 'instapaper' | 'netscape' | 'readwise';
    mode?: 'add' | 'replace';
  } = {}): Promise<{ imported: number; duplicates: number }> {
    try {
      const { data, error } = await this.client.POST('/import', {
        body: {
          file,
          collection: collectionId.toString(),
          format: options.format,
          mode: options.mode || 'add',
          parse: true
        }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return {
        imported: data.imported || 0,
        duplicates: data.duplicates || 0
      };
    } catch (error) {
      return this.handleApiError(error, 'Failed to import bookmarks');
    }
  }

  // Check import status
  async getImportStatus(): Promise<{
    status: 'in-progress' | 'ready' | 'error';
    progress?: number;
    imported?: number;
    duplicates?: number;
    error?: string;
  }> {
    try {
      const { data, error } = await this.client.GET('/import/status');
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return {
        status: data.status,
        progress: data.progress,
        imported: data.imported,
        duplicates: data.duplicates,
        error: data.error
      };
    } catch (error) {
      return this.handleApiError(error, 'Failed to get import status');
    }
  }

  // Export functionality - Type-safe with openapi-fetch
  async exportBookmarks(options: {
    collection?: number;
    format: 'csv' | 'html' | 'pdf';
    broken?: boolean;
    duplicates?: boolean;
  }): Promise<{ url: string }> {
    try {
      const { data, error } = await this.client.POST('/export', {
        body: {
          collection: options.collection,
          format: options.format,
          broken: options.broken || false,
          duplicates: options.duplicates || false
        }
      });
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result || !data.url) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return { url: data.url };
    } catch (error) {
      return this.handleApiError(error, 'Failed to export bookmarks');
    }
  }

  // Check export status
  async getExportStatus(): Promise<{
    status: 'in-progress' | 'ready' | 'error';
    progress?: number;
    url?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await this.client.GET('/export/status');
      
      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }
      
      if (!data?.result) {
        throw new Error('Invalid response structure from Raindrop.io API');
      }
      
      return {
        status: data.status,
        progress: data.progress,
        url: data.url,
        error: data.error
      };
    } catch (error) {
      return this.handleApiError(error, 'Failed to get export status');
    }
  }
}

export default RaindropService;
