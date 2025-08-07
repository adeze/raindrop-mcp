// Helper to map API bookmark objects to strict Bookmark type
function mapApiBookmark(apiBookmark: any): Bookmark {
  return {
    _id: apiBookmark._id,
    title: apiBookmark.title ?? '',
    excerpt: apiBookmark.excerpt ?? '',
    note: apiBookmark.note ?? '',
    type: apiBookmark.type ?? 'link',
    tags: Array.isArray(apiBookmark.tags) ? apiBookmark.tags : [],
    cover: apiBookmark.cover ?? '',
    link: apiBookmark.link ?? '',
    domain: apiBookmark.domain ?? '',
    created: apiBookmark.created ?? '',
    lastUpdate: apiBookmark.lastUpdate ?? '',
    removed: apiBookmark.removed ?? false,
    media: apiBookmark.media ?? [],
    user: apiBookmark.user ?? { $id: 0 },
    collection: apiBookmark.collection ?? { $id: 0 },
    html: apiBookmark.html ?? '',
    important: apiBookmark.important ?? false,
    highlights: apiBookmark.highlights ?? [],
    reminder: apiBookmark.reminder,
    broken: apiBookmark.broken ?? false,
    duplicate: apiBookmark.duplicate ?? false,
    sort: apiBookmark.sort,
    cache: apiBookmark.cache,
  };
}
/**
 * RaindropService: Integration layer for Raindrop.io REST API.
 *
 * Provides methods for managing collections, bookmarks, highlights, and tags using the official Raindrop.io API.
 * All methods use openapi-fetch with generated TypeScript types for complete type safety.
 *
 * Throws descriptive errors for API failures and validation issues.
 */
import createClient from 'openapi-fetch';
import { z } from 'zod';
import type { Bookmark, Collection, Highlight, SearchParams } from '../types/raindrop.js';
import { CollectionSchema } from '../types/raindrop.js';
import type { paths } from '../types/raindrop.schema.js';


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

export default class RaindropService {
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


  // Collections - Type-safe with openapi-fetch
  async getCollections(): Promise<ApiResponse<Collection[]>> {
    try {
      const { data, error } = await this.client.GET('/collections');
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
      if (!data?.result || !data.items) {
        return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
      }
      const processedCollections = data.items.map((collection: any) => ({
        ...collection,
        sort: typeof collection.sort === 'number' ? collection.sort.toString() : collection.sort,
        parent: collection.parent === null ? undefined : collection.parent,
        description: typeof collection.description === 'string' ? collection.description : ''
      }));
      const parsed = CollectionSchema.array().safeParse(
        processedCollections.map(col => ({
          ...col,
          description: typeof col.description === 'string' ? col.description : ''
        }))
      );
      if (!parsed.success) {
        return { status: 'error', result: false, error: parsed.error.message };
      }
      // Ensure all collections have description: string
      const collectionsStrict = parsed.data.map(col => ({
        ...col,
        description: typeof col.description === 'string' ? col.description : '',
        color: typeof col.color === 'string' ? col.color : '',
        public: typeof col.public === 'boolean' ? col.public : false,
        cover: Array.isArray(col.cover) ? col.cover : [],
        expanded: typeof col.expanded === 'boolean' ? col.expanded : false,
        parent: col.parent
          ? { $id: col.parent.$id, title: typeof col.parent.title === 'string' ? col.parent.title : '' }
          : { $id: 0, title: '' },
        creatorRef: col.creatorRef
          ? { _id: col.creatorRef._id, name: typeof col.creatorRef.name === 'string' ? col.creatorRef.name : '' }
          : { _id: 0, name: '' },
        collaborators: Array.isArray(col.collaborators)
          ? col.collaborators.map((c: any) => ({
            ...c,
            name: typeof c.name === 'string' ? c.name : ''
          }))
          : []
      }));
      return { status: 'success', result: true, data: collectionsStrict };
    } catch (error) {
      return this.handleApiError(error, 'Failed to get collections');
    }
  }

  async getCollection(id: number): Promise<ApiResponse<Collection>> {
    try {
      const { data, error } = await this.client.GET('/collection/{id}', {
        params: { path: { id } }
      });
      if (error) {
        return this.handleApiError(error, `API Error`);
      }
      if (!data?.result || !data.item) {
        return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
      }
      return { status: 'success', result: true, data: data.item as Collection };
    } catch (error) {
      return this.handleApiError(error, `Failed to get collection ${id}`);
    }
  }

  async getChildCollections(parentId: number): Promise<ApiResponse<Collection[]>> {
    try {
      const { data, error } = await this.client.GET('/collections/{parentId}/childrens', {
        params: { path: { parentId } }
      });
      if (error) {
        return this.handleApiError(error, `API Error`);
      }
      if (!data?.result || !data.items) {
        return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
      }
      return { status: 'success', result: true, data: data.items as Collection[] };
    } catch (error) {
      return this.handleApiError(error, `Failed to get child collections for ${parentId}`);
    }
  }

  async createCollection(title: string, isPublic = false): Promise<ApiResponse<Collection>> {
    try {
      const body: { title: string; public: boolean } = {
        title,
        public: isPublic
      };
      const { data, error } = await this.client.POST('/collection', { body });
      if (error) {
        return this.handleApiError(error, `API Error`);
      }
      if (!data?.result || !data.item) {
        return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
      }
      return { status: 'success', result: true, data: data.item as Collection };
    } catch (error) {
      return this.handleApiError(error, 'Failed to create collection');
    }
  }

  async updateCollection(id: number, updates: Partial<Collection>): Promise<ApiResponse<Collection>> {
    try {
      const body: Partial<Collection> = {};
      (Object.keys(updates) as (keyof Collection)[]).forEach(key => {
        const value = updates[key];
        if (value !== undefined) {
          (body as any)[key] = value;
        }
      });
      const { data, error } = await this.client.PUT('/collection/{id}', {
        params: { path: { id } },
        body
      });
      if (error) {
        return this.handleApiError(error, `API Error`);
      }
      if (!data?.result || !data.item) {
        return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
      }
      return { status: 'success', result: true, data: data.item as Collection };
    } catch (error) {
      return this.handleApiError(error, `Failed to update collection ${id}`);
    }
  }

  async deleteCollection(id: number): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.client.DELETE('/collection/{id}', {
        params: { path: { id } }
      });
      if (error) {
        return this.handleApiError(error, `API Error`);
      }
      return { status: 'success', result: true, data: null };
    } catch (error) {
      return this.handleApiError(error, `Failed to delete collection ${id}`);
    }
  }

  async shareCollection(
    id: number,
    level: CollectionLevel,
    emails?: string[]
  ): Promise<ApiResponse<{ link: string; access: any[] }>> {
    try {
      const body: { level: CollectionLevel; emails?: string[] } = { level };
      if (emails !== undefined) {
        body.emails = emails;
      }
      const { data, error } = await this.client.PUT('/collection/{id}/sharing', {
        params: { path: { id } },
        body
      });
      if (error) {
        return this.handleApiError(error, `API Error`);
      }
      if (!data?.result) {
        return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
      }
      return { status: 'success', result: true, data: { link: data.link, access: data.access || [] } };
    } catch (error) {
      return this.handleApiError(error, `Failed to share collection ${id}`);
    }
  }

  // Bookmarks - Type-safe with openapi-fetch
  async getBookmarks(params: SearchParams = {}): Promise<ApiResponse<{ items: Bookmark[]; count: number }>> {
    try {
      let response;
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
      if (params.collection !== undefined) {
        response = await this.client.GET('/raindrops/{collectionId}', {
          params: {
            path: { id: params.collection },
            query
          }
        });
      } else {
        response = await this.client.GET('/raindrops/0', {
          params: { query }
        });
      }
      const { data, error } = response;
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
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
    } catch (error) {
      return this.handleApiError(error, 'Failed to get bookmarks');
    }
  }

  async getBookmark(id: number): Promise<ApiResponse<Bookmark>> {
    try {
      const { data, error } = await this.client.GET('/raindrop/{id}', {
        params: { path: { id } }
      });
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
      if (!data?.result || !data.item) {
        return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
      }
      return { status: 'success', result: true, data: mapApiBookmark(data.item) };
    } catch (error) {
      return this.handleApiError(error, `Failed to get bookmark ${id}`);
    }
  }

  async createBookmark(collectionId: number, bookmark: Partial<Bookmark>): Promise<ApiResponse<Bookmark>> {
    try {
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
      if (bookmark.tags !== undefined) body.tags = bookmark.tags;
      const { data, error } = await this.client.POST('/raindrop', { body });
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
      if (!data?.result || !data.item) {
        return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
      }
      return { status: 'success', result: true, data: mapApiBookmark(data.item) };
    } catch (error) {
      return this.handleApiError(error, 'Failed to create bookmark');
    }
  }

  async updateBookmark(id: number, updates: Partial<Bookmark>): Promise<ApiResponse<Bookmark>> {
    try {
      const body: Record<string, any> = {};
      if (updates.link !== undefined) body.link = updates.link;
      if (updates.title !== undefined) body.title = updates.title;
      if (updates.excerpt !== undefined) body.excerpt = updates.excerpt;
      if (updates.note !== undefined) body.note = updates.note;
      if (updates.tags !== undefined) body.tags = updates.tags;
      if (updates.important !== undefined) body.important = updates.important;
      if (updates.collection !== undefined) body.collection = { $id: updates.collection.$id };
      if (updates.cover !== undefined) body.cover = updates.cover;
      const { data, error } = await this.client.PUT('/raindrop/{id}', {
        params: { path: { id } },
        body
      });
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
      if (!data?.result || !data.item) {
        return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
      }
      return { status: 'success', result: true, data: mapApiBookmark(data.item) };
    } catch (error) {
      return this.handleApiError(error, `Failed to update bookmark ${id}`);
    }
  }

  async deleteBookmark(id: number): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.client.DELETE('/raindrop/{id}', {
        params: { path: { id } }
      });
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
      return { status: 'success', result: true, data: null };
    } catch (error) {
      return this.handleApiError(error, `Failed to delete bookmark ${id}`);
    }
  }

  async permanentDeleteBookmark(id: number): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.client.DELETE('/raindrop/{id}/permanent', {
        params: { path: { id } }
      });
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
      return { status: 'success', result: true, data: null };
    } catch (error) {
      return this.handleApiError(error, `Failed to permanently delete bookmark ${id}`);
    }
  }

  async batchUpdateBookmarks(
    ids: number[],
    updates: { tags?: string[]; collection?: number; important?: boolean; broken?: boolean; }
  ): Promise<{ result: boolean }> {
    try {
      const body: {
        ids: number[];
        tags?: string[];
        collection?: { $id: number };
        important?: boolean;
        broken?: boolean;
      } = {
        ids
      };
      if (updates.tags !== undefined) body.tags = updates.tags;
      if (updates.collection !== undefined) body.collection = { $id: updates.collection };
      if (updates.important !== undefined) body.important = updates.important;
      if (updates.broken !== undefined) body.broken = updates.broken;
      const { data, error } = await this.client.PUT('/raindrops', { body });

      if (error) {
        throw new Error(`API Error: ${JSON.stringify(error) || 'Unknown error'}`);
      }

      return { result: data?.result || false };
    } catch (error) {
      return this.handleApiError(error, 'Failed to batch update bookmarks');
    }
  }

  // Tags - Type-safe with openapi-fetch
  async getTags(collectionId?: number): Promise<ApiResponse<{ _id: string; count: number }[]>> {
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
        return this.handleApiError(error, 'API Error');
      }
      if (!data?.result || !data.items) {
        return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
      }
      return { status: 'success', result: true, data: data.items as { _id: string; count: number }[] };
    } catch (error) {
      return this.handleApiError(error, 'Failed to get tags');
    }
  }

  async getTagsByCollection(collectionId: number): Promise<ApiResponse<{ _id: string; count: number }[]>> {
    return this.getTags(collectionId);
  }

  async deleteTags(collectionId: number | undefined, tags: string[]): Promise<ApiResponse<{ result: boolean }>> {
    try {
      let response;
      if (collectionId !== undefined) {
        response = await this.client.DELETE('/tags/{collectionId}', {
          params: { path: { id: collectionId } },
          body: { tags: tags ?? [] }
        });
      } else {
        response = await this.client.DELETE('/tags/0', {
          body: { tags: tags ?? [] }
        });
      }
      const { data, error } = response;
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
      return { status: 'success', result: true, data: { result: data?.result ?? false } };
    } catch (error) {
      return this.handleApiError(error, 'Failed to delete tags');
    }
  }

  async renameTag(collectionId: number | undefined, oldName: string, newName: string): Promise<ApiResponse<{ result: boolean }>> {
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
        return this.handleApiError(error, 'API Error');
      }
      return { status: 'success', result: true, data: { result: data?.result ?? false } };
    } catch (error) {
      return this.handleApiError(error, 'Failed to rename tag');
    }
  }

  async mergeTags(collectionId: number | undefined, tags: string[], newName: string): Promise<ApiResponse<{ result: boolean }>> {
    try {
      let response;
      if (collectionId !== undefined) {
        response = await this.client.PUT('/tags/{collectionId}', {
          params: { path: { id: collectionId } },
          body: { tags: tags ?? [], to: newName }
        });
      } else {
        response = await this.client.PUT('/tags/0', {
          body: { tags: tags ?? [], to: newName }
        });
      }
      const { data, error } = response;
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
      return { status: 'success', result: true, data: { result: data?.result ?? false } };
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
      return { count: 0 };
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
  async getHighlights(raindropId: number): Promise<ApiResponse<Highlight[]>> {
    try {
      const { data, error } = await this.client.GET('/raindrop/{id}/highlights', {
        params: { path: { id: raindropId } }
      });
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
      if (!data?.result || !data.items) {
        return { status: 'success', result: true, data: [] };
      }
      const highlights = data.items.map((item: any) => this.mapHighlightData({
        ...item,
        raindrop: item.raindrop || { _id: raindropId }
      })).filter((h): h is Highlight => h !== null);
      return { status: 'success', result: true, data: highlights };
    } catch (error) {
      if ((error as any)?.status === 404) {
        return { status: 'success', result: true, data: [] };
      }
      return this.handleApiError(error, `Failed to get highlights for raindrop ${raindropId}`);
    }
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
    try {
      if (typeof collectionId !== 'number' || collectionId <= 0) {
        return { status: 'error', result: false, error: 'Invalid collection id' };
      }
      const { data: bookmarksRes, error: bookmarksError } = await this.client.GET('/raindrops/{collectionId}', {
        params: { path: { id: collectionId } }
      });
      if (bookmarksError) {
        return this.handleApiError(bookmarksError, 'API Error');
      }
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
    } catch (error) {
      return this.handleApiError(error, `Failed to get highlights for collection ${collectionId}`);
    }
  }

  async createHighlight(raindropId: number, highlightData: { text: string; note?: string; color?: string }): Promise<ApiResponse<Highlight>> {
    try {
      const allowedColors = [
        'yellow', 'blue', 'brown', 'cyan', 'gray', 'green', 'indigo', 'orange', 'pink', 'purple', 'red', 'teal'
      ] as const;
      let color: typeof allowedColors[number] = 'yellow';
      if (highlightData.color && allowedColors.includes(highlightData.color as any)) {
        color = highlightData.color as typeof allowedColors[number];
      }
      const body: { raindrop: { $id: number }; text: string; color: typeof allowedColors[number]; note?: string } = {
        raindrop: { $id: raindropId },
        text: highlightData.text,
        color
      };
      if (highlightData.note) body.note = highlightData.note;
      const { data, error } = await this.client.POST('/highlights', { body });
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
      if (!data?.result || !data.item) {
        return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
      }
      const highlight = this.mapHighlightData({
        ...data.item,
        raindrop: data.item.raindrop || { _id: raindropId }
      });
      if (!highlight) {
        return { status: 'error', result: false, error: 'Failed to create highlight: Invalid response data' };
      }
      return { status: 'success', result: true, data: highlight };
    } catch (error) {
      return this.handleApiError(error, 'Failed to create highlight');
    }
  }

  async updateHighlight(id: number, updates: { text?: string; note?: string; color?: string }): Promise<ApiResponse<Highlight>> {
    try {
      const allowedColors = [
        'yellow', 'blue', 'brown', 'cyan', 'gray', 'green', 'indigo', 'orange', 'pink', 'purple', 'red', 'teal'
      ] as const;
      const body: { text?: string; note?: string; color?: typeof allowedColors[number] } = {};
      if (updates.text) body.text = updates.text;
      if (updates.note) body.note = updates.note;
      if (updates.color && allowedColors.includes(updates.color as any)) body.color = updates.color as typeof allowedColors[number];
      const { data, error } = await this.client.PUT('/highlights/{id}', {
        params: { path: { id } },
        body
      });
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
      if (!data?.result || !data.item) {
        return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
      }
      const highlight = this.mapHighlightData(data.item);
      if (!highlight) {
        return { status: 'error', result: false, error: 'Failed to update highlight: Invalid response data' };
      }
      return { status: 'success', result: true, data: highlight };
    } catch (error) {
      return this.handleApiError(error, `Failed to update highlight ${id}`);
    }
  }

  async deleteHighlight(id: number): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.client.DELETE('/highlights/{id}', {
        params: { path: { id } }
      });
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
      return { status: 'success', result: true, data: null };
    } catch (error) {
      return this.handleApiError(error, `Failed to delete highlight ${id}`);
    }
  }

  // Search - Type-safe with openapi-fetch
  async search(params: SearchParams): Promise<ApiResponse<{ items: Bookmark[]; count: number }>> {
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
  }): Promise<ApiResponse<{ items: Bookmark[]; count: number }>> {
    try {
      const query: Record<string, any> = {};
      if (params.search) query.search = params.search;
      if (params.collection) query.collection = params.collection;
      if (params.tags) query.tags = params.tags;
      if (params.createdStart) query.createdStart = params.createdStart;
      if (params.createdEnd) query.createdEnd = params.createdEnd;
      if (params.important) query.important = params.important;
      if (params.media) query.media = params.media;
      if (params.page) query.page = params.page;
      if (params.perPage) query.perpage = params.perPage;
      if (params.sort) query.sort = params.sort;
      const { data, error } = await this.client.GET('/raindrops', {
        params: { query }
      });
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
      if (!data?.result || !Array.isArray(data.items)) {
        return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
      }
      // Map API items to Bookmark shape if needed
      const items: Bookmark[] = Array.isArray(data.items)
        ? data.items.map((item: any) => ({
          ...item,
          user: item.user ?? { _id: 0, name: '', email: '' } // fallback for missing user
        }))
        : [];
      return {
        status: 'success',
        result: true,
        data: {
          items,
          count: data.count ?? 0
        }
      };
    } catch (error) {
      return this.handleApiError(error, 'Failed to search raindrops');
    }
  }

  // Upload file - Type-safe with openapi-fetch
  async uploadFile(collectionId: number, file: any): Promise<ApiResponse<Bookmark>> {
    try {
      const { data, error } = await this.client.PUT('/raindrop/file', {
        body: {
          file: file,
          collectionId: collectionId.toString()
        }
      });
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
      if (!data?.result || !data.item) {
        return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
      }
      return { status: 'success', result: true, data: mapApiBookmark(data.item) };
    } catch (error) {
      return this.handleApiError(error, 'Failed to upload file');
    }
  }

  // Reminder management - Type-safe with openapi-fetch
  async setReminder(raindropId: number, reminder: { date: string; note?: string }): Promise<ApiResponse<Bookmark>> {
    try {
      const body: { date: string; note?: string } = { date: reminder.date };
      if (reminder.note) body.note = reminder.note;
      const { data, error } = await this.client.PUT('/raindrop/{id}/reminder', {
        params: { path: { id: raindropId } },
        body
      });
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
      if (!data?.result || !data.item) {
        return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
      }
      return { status: 'success', result: true, data: mapApiBookmark(data.item) };
    } catch (error) {
      return this.handleApiError(error, `Failed to set reminder for bookmark ${raindropId}`);
    }
  }

  async deleteReminder(raindropId: number): Promise<ApiResponse<Bookmark>> {
    try {
      const { data, error } = await this.client.DELETE('/raindrop/{id}/reminder', {
        params: { path: { id: raindropId } }
      });
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
      if (!data?.result || !data.item) {
        return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
      }
      return { status: 'success', result: true, data: mapApiBookmark(data.item) };
    } catch (error) {
      return this.handleApiError(error, `Failed to delete reminder for bookmark ${raindropId}`);
    }
  }

  // Import functionality - Type-safe with openapi-fetch
  async importBookmarks(collectionId: number, file: any, options: {
    format?: 'html' | 'csv' | 'pocket' | 'instapaper' | 'netscape' | 'readwise';
    mode?: 'add' | 'replace';
  } = {}): Promise<ApiResponse<{ imported: number; duplicates: number }>> {
    try {
      const body: {
        file: any;
        collection?: string;
        format?: 'html' | 'csv' | 'pocket' | 'instapaper' | 'netscape' | 'readwise';
        mode: 'add' | 'replace';
        parse: boolean;
      } = {
        file,
        mode: options.mode ?? 'add',
        parse: true
      };
      if (collectionId) body.collection = collectionId.toString();
      if (options.format) body.format = options.format;
      const { data, error } = await this.client.POST('/import', { body });
      if (error) {
        return this.handleApiError(error, 'API Error');
      }
      if (!data?.result) {
        return { status: 'error', result: false, error: 'Invalid response structure from Raindrop.io API' };
      }
      return {
        status: 'success',
        result: true,
        data: {
          imported: data.imported ?? 0,
          duplicates: data.duplicates ?? 0
        }
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

      const result: {
        status: 'in-progress' | 'ready' | 'error';
        progress?: number;
        imported?: number;
        duplicates?: number;
        error?: string;
      } = {
        status: data.status
      };
      if (typeof data.progress === 'number') result.progress = data.progress;
      if (typeof data.imported === 'number') result.imported = data.imported;
      if (typeof data.duplicates === 'number') result.duplicates = data.duplicates;
      if (typeof data.error === 'string') result.error = data.error;
      return result;
    } catch (error) {
      return this.handleApiError(error, 'Failed to get import status');
    }
  }


}
