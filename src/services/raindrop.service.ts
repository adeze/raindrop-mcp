// Simple, clean openapi-fetch REST client
import createClient from "openapi-fetch";
import { RateLimiterMemory } from "rate-limiter-flexible";
import {
    AuthError,
    NotFoundError,
    RateLimitError,
    UpstreamError,
    ValidationError,
} from "../types/mcpErrors.js";
import type { components, paths } from "../types/raindrop.schema.js";
import { createLogger } from "../utils/logger.js";

type Bookmark = components["schemas"]["Bookmark"];
type Collection = components["schemas"]["Collection"];
type Highlight = components["schemas"]["Highlight"];
type HighlightColor = NonNullable<Highlight["color"]>;

export default class RaindropService {
  private client;
  private rateLimiter?: RateLimiterMemory;
  private logger = createLogger("raindrop-service");

  constructor(token?: string) {
    this.client = createClient<paths>({
      baseUrl: "https://api.raindrop.io/rest/v1",
      headers: {
        Authorization: `Bearer ${token || process.env.RAINDROP_ACCESS_TOKEN}`,
      },
    });

    // Conservative rate limiting: 30 points per 60 seconds (2 requests/second max)
    // Provides buffer for Raindrop.io's rate limits and reduces spikes
    const points = Number(process.env.RAINDROP_RATE_LIMIT_POINTS || 30);
    const duration = Number(
      process.env.RAINDROP_RATE_LIMIT_DURATION_SECONDS || 60,
    );
    this.rateLimiter = new RateLimiterMemory({
      points,
      duration,
      keyPrefix: "raindrop",
    });

    this.client.use({
      onRequest({ request }) {
        if (process.env.NODE_ENV === "development") {
          // Use project logger instead of console to avoid polluting STDIO
          const logger = createLogger("raindrop-service");
          logger.debug(`${request.method} ${request.url}`);
        }
        return request;
      },
      onResponse({ response }) {
        if (!response.ok) {
          if (response.status === 401)
            throw new AuthError("Unauthorized: check RAINDROP_ACCESS_TOKEN");
          if (response.status === 429)
            throw new RateLimitError("Rate limited by Raindrop.io");
          if (response.status === 404)
            throw new NotFoundError("Resource not found");
          throw new UpstreamError(
            `API Error: ${response.status} ${response.statusText}`,
          );
        }
        return response;
      },
    });
  }

  private async withRateLimit<T>(
    fn: () => Promise<T>,
    retryCount = 0,
  ): Promise<T> {
    const maxRetries = 3;
    try {
      if (this.rateLimiter) {
        await this.rateLimiter.consume("global");
      }
      return await fn();
    } catch (err: any) {
      // Non-retryable errors: auth, not found, validation
      if (err instanceof AuthError || err instanceof NotFoundError) {
        throw err;
      }

      // Handle rate limiter rejection (msBeforeNext is set by rate-limiter-flexible)
      if (err?.msBeforeNext !== undefined) {
        const retryMs = Math.max(0, Number(err.msBeforeNext));
        const waitTimeMs = Math.min(retryMs + 500, 5000); // Add buffer, cap at 5s

        if (retryCount < maxRetries) {
          this.logger.warn(
            `Rate limited, retrying in ${Math.ceil(waitTimeMs / 1000)}s (attempt ${retryCount + 1}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
          return this.withRateLimit(fn, retryCount + 1);
        }

        throw new RateLimitError(
          `Rate limit exceeded after ${maxRetries} retries. Retry after ${Math.ceil(retryMs / 1000)}s`,
          err,
        );
      }

      // Retry transient upstream errors with exponential backoff
      if (err instanceof UpstreamError && retryCount < maxRetries) {
        const backoffMs = Math.min(500 * Math.pow(2, retryCount), 5000); // 500ms, 1s, 2s, capped at 5s
        this.logger.warn(
          `Transient error, retrying in ${Math.ceil(backoffMs / 1000)}s (attempt ${retryCount + 1}/${maxRetries}): ${err.message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return this.withRateLimit(fn, retryCount + 1);
      }

      if (err instanceof RateLimitError) {
        throw err;
      }

      throw err instanceof Error
        ? err
        : new UpstreamError("Unknown upstream error", err);
    }
  }

  /**
   * Fetch all collections
   * Raindrop.io API: GET /collections
   */
  async getCollections(): Promise<Collection[]> {
    return this.withRateLimit(async () => {
      const { data } = await this.client.GET("/collections");
      return [...((data?.items as Collection[]) || [])];
    });
  }

  /**
   * Fetch a single collection by ID
   * Raindrop.io API: GET /collection/{id}
   */
  async getCollection(id: number): Promise<Collection> {
    return this.withRateLimit(async () => {
      const { data } = await this.client.GET("/collection/{id}", {
        params: { path: { id } },
      });
      if (!data?.item) throw new NotFoundError("Collection not found");
      return data.item as Collection;
    });
  }

  /**
   * Fetch child collections for a parent collection
   * Raindrop.io API: GET /collections/{parentId}/childrens
   */
  async getChildCollections(parentId: number): Promise<Collection[]> {
    return this.withRateLimit(async () => {
      const { data } = await this.client.GET(
        "/collections/{parentId}/childrens",
        {
          params: { path: { parentId } },
        },
      );
      return [...((data?.items as Collection[]) || [])];
    });
  }

  /**
   * Get all collections organized as a tree with breadcrumb paths.
   */
  async getCollectionTree(): Promise<Array<Collection & { path: string; children: any[] }>> {
    const collections = await this.getCollections();
    const tree: any[] = [];
    const map = new Map<number, any>();

    // Initialize map
    collections.forEach((c) => {
      map.set(c._id, { ...c, children: [], path: c.title });
    });

    // Build hierarchy and paths
    collections.forEach((c) => {
      const node = map.get(c._id);
      if (c.parent?.$id && map.has(c.parent.$id)) {
        const parent = map.get(c.parent.$id);
        parent.children.push(node);
        node.path = `${parent.path} > ${c.title}`;
      } else {
        tree.push(node);
      }
    });

    return tree;
  }

  /**
   * Create a new collection
   * Raindrop.io API: POST /collection
   */
  async createCollection(title: string, isPublic = false): Promise<Collection> {
    return this.withRateLimit(async () => {
      if (!title?.trim())
        throw new ValidationError("Collection title is required");
      const { data } = await this.client.POST("/collection", {
        body: { title, public: isPublic },
      });
      if (!data?.item) throw new UpstreamError("Failed to create collection");
      return data.item;
    });
  }

  /**
   * Update a collection
   * Raindrop.io API: PUT /collection/{id}
   */
  async updateCollection(
    id: number,
    updates: Partial<Collection>,
  ): Promise<Collection> {
    return this.withRateLimit(async () => {
      const { data } = await this.client.PUT("/collection/{id}", {
        params: { path: { id } },
        body: updates,
      });
      if (!data?.item) throw new UpstreamError("Failed to update collection");
      return data.item;
    });
  }

  /**
   * Delete a collection
   * Raindrop.io API: DELETE /collection/{id}
   */
  async deleteCollection(id: number): Promise<void> {
    await this.withRateLimit(async () => {
      await this.client.DELETE("/collection/{id}", {
        params: { path: { id } },
      });
    });
  }

  /**
   * Share a collection
   * Raindrop.io API: PUT /collection/{id}/sharing
   */
  async shareCollection(
    id: number,
    level: string,
    emails?: string[],
  ): Promise<{ link: string; access: any[] }> {
    return this.withRateLimit(async () => {
      const body: any = { level };
      if (emails) body.emails = emails;
      const { data } = await this.client.PUT("/collection/{id}/sharing", {
        params: { path: { id } },
        body,
      });
      return { link: data?.link || "", access: [...((data?.access as any[]) || [])] };
    });
  }

  /**
   * Fetch bookmarks (search, filter, etc)
   * Raindrop.io API: GET /raindrops/{collectionId} or /raindrops/0
   */
  async getBookmarks(
    params: {
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
      notag?: boolean;
      highlight?: boolean;
      domain?: string;
    } = {},
  ): Promise<{ items: Bookmark[]; count: number }> {
    return this.withRateLimit(async () => {
      const query: any = {};
      const searchParts = params.search ? [params.search] : [];
      
      if (params.tags) query.tag = params.tags.join(",");
      if (params.tag) query.tag = params.tag;
      if (params.important !== undefined) {
        searchParts.push("important:true");
      }
      if (params.page) query.page = params.page;
      if (params.perPage) query.perpage = params.perPage;
      if (params.sort) query.sort = params.sort;
      
      if (params.duplicates === true) {
        searchParts.push("duplicates:true");
      }
      if (params.broken === true) {
        searchParts.push("broken:true");
      }
      if (params.notag === true) {
        searchParts.push("notag:true");
      }
      if (params.highlight === true) {
        searchParts.push("highlights:true");
      }
      
      if (searchParts.length > 0) {
        query.search = searchParts.join(" ");
      }

      if (params.domain) query.domain = params.domain;
      const endpoint = params.collection ? "/raindrops/{id}" : "/raindrops/0";
      const options = params.collection
        ? { params: { path: { id: params.collection }, query } }
        : { params: { query } };
      
      const { data } = await (this.client as any).GET(endpoint, options);
      return {
        items: (data?.items as Bookmark[]) || [],
        count: data?.count || 0,
      };
    });
  }

  /**
   * Fetch a single bookmark by ID
   * Raindrop.io API: GET /raindrop/{id}
   */
  async getBookmark(id: number): Promise<Bookmark> {
    return this.withRateLimit(async () => {
      const { data } = await this.client.GET("/raindrop/{id}", {
        params: { path: { id } },
      });
      if (!data?.item) throw new NotFoundError("Bookmark not found");
      return (data.item as any) as Bookmark;
    });
  }


  /**
   * Fetch AI-powered suggestions for a URL or existing bookmark.
   * Raindrop.io API: POST /raindrop/suggest or GET /raindrop/{id}/suggest
   */
  async getSuggestions(target: string | number): Promise<components["schemas"]["SuggestionsResponse"]> {
    return this.withRateLimit(async () => {
      if (typeof target === "number") {
        const { data } = await this.client.GET("/raindrop/{id}/suggest", {
          params: { path: { id: target } },
        });
        return data as components["schemas"]["SuggestionsResponse"];
      } else {
        const { data } = await this.client.POST("/raindrop/suggest", {
          body: { link: target },
        });
        return data as components["schemas"]["SuggestionsResponse"];
      }
    });
  }

  /**
   * Create a new bookmark
   * Raindrop.io API: POST /raindrop
   */
  async createBookmark(
    collectionId: number,
    bookmark: {
      link: string;
      title?: string;
      excerpt?: string;
      tags?: string[];
      important?: boolean;
    },
  ): Promise<Bookmark> {
    return this.withRateLimit(async () => {
      if (!bookmark.link)
        throw new ValidationError("Bookmark link is required");
      const { data } = await this.client.POST("/raindrop", {
        body: {
          link: bookmark.link,
          ...(bookmark.title && { title: bookmark.title }),
          ...(bookmark.excerpt && { excerpt: bookmark.excerpt }),
          ...(bookmark.tags && { tags: bookmark.tags }),
          important: bookmark.important || false,
          collection: { $id: collectionId },
          pleaseParse: {},
        },
      });
      if (!data?.item) throw new UpstreamError("Failed to create bookmark");
      return data.item as Bookmark;
    });
  }

  /**
   * Update a bookmark
   * Raindrop.io API: PUT /raindrop/{id}
   */
  async updateBookmark(
    id: number,
    updates: Partial<Bookmark>,
  ): Promise<Bookmark> {
    return this.withRateLimit(async () => {
      const { data } = await this.client.PUT("/raindrop/{id}", {
        params: { path: { id } },
        body: updates,
      });
      if (!data?.item) throw new UpstreamError("Failed to update bookmark");
      return data.item as Bookmark;
    });
  }

  /**
   * Delete a bookmark
   * Raindrop.io API: DELETE /raindrop/{id}
   */
  async deleteBookmark(id: number): Promise<void> {
    await this.withRateLimit(async () => {
      await this.client.DELETE("/raindrop/{id}", {
        params: { path: { id } },
      });
    });
  }

  /**
   * Batch update bookmarks
   * Raindrop.io API: PUT /raindrops
   */
  async batchUpdateBookmarks(
    ids: number[],
    updates: {
      tags?: string[];
      collection?: number;
      important?: boolean;
      broken?: boolean;
    },
  ): Promise<boolean> {
    const body: any = { ids };
    if (updates.tags) body.tags = updates.tags;
    if (updates.collection) body.collection = { $id: updates.collection };
    if (updates.important !== undefined) body.important = updates.important;
    if (updates.broken !== undefined) body.broken = updates.broken;
    const { data } = await this.client.PUT("/raindrops", { body });
    return !!data?.result;
  }

  /**
   * Batch update bookmarks in a specific collection
   * Raindrop.io API: PUT /raindrops/{collectionId}
   */
  async batchUpdateBookmarksInCollection(
    collectionId: number,
    updates: {
      ids: number[];
      tags?: string[];
      important?: boolean;
      broken?: boolean;
    },
  ): Promise<boolean> {
    return this.withRateLimit(async () => {
      const { data } = await this.client.PUT("/raindrops/{collectionId}", {
        params: { path: { id: collectionId } as any },
        body: updates,
      });
      return !!(data as any)?.result;
    });
  }

  /**
   * Batch delete bookmarks in a specific collection or empty trash
   * Raindrop.io API: DELETE /raindrops/{collectionId}
   */
  async batchDeleteBookmarksInCollection(
    collectionId: number,
    ids?: number[],
  ): Promise<boolean> {
    return this.withRateLimit(async () => {
      const { data } = await this.client.DELETE("/raindrops/{collectionId}", {
        params: { path: { id: collectionId } as any },
        body: ids ? { ids } : undefined,
      });
      return !!(data as any)?.result;
    });
  }

  /**
   * Empty trash
   * Raindrop.io API: DELETE /raindrops/-99
   */
  async emptyTrash(): Promise<boolean> {
    return this.batchDeleteBookmarksInCollection(-99);
  }

  /**
   * Remove all empty collections
   * Raindrop.io API: PUT /collections/clean
   */
  async removeEmptyCollections(): Promise<boolean> {
    return this.withRateLimit(async () => {
      const { data } = await this.client.PUT("/collections/clean");
      return !!(data as any)?.result;
    });
  }

  /**
   * Fetch tags for a collection or all
   * Raindrop.io API: GET /tags/{collectionId} or /tags/0
   */
  async getTags(
    collectionId?: number,
  ): Promise<{ _id: string; count: number }[]> {
    const endpoint = collectionId ? "/tags/{collectionId}" : "/tags/0";
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
  async getTagsByCollection(
    collectionId: number,
  ): Promise<{ _id: string; count: number }[]> {
    return this.getTags(collectionId);
  }

  /**
   * Delete tags from a collection
   * Raindrop.io API: DELETE /tags/{collectionId}
   */
  async deleteTags(
    collectionId: number | undefined,
    tags: string[],
  ): Promise<boolean> {
    const endpoint = collectionId ? "/tags/{collectionId}" : "/tags/0";
    const options = {
      ...(collectionId && { params: { path: { id: collectionId } } }),
      body: { tags },
    };
    const { data } = await (this.client as any).DELETE(endpoint, options);
    return !!data?.result;
  }

  /**
   * Rename a tag in a collection
   * Raindrop.io API: PUT /tags/{collectionId}
   */
  async renameTag(
    collectionId: number | undefined,
    oldName: string,
    newName: string,
  ): Promise<boolean> {
    const endpoint = collectionId ? "/tags/{collectionId}" : "/tags/0";
    const options = {
      ...(collectionId && { params: { path: { id: collectionId } } }),
      body: { from: oldName, to: newName },
    };
    const { data } = await (this.client as any).PUT(endpoint, options);
    return !!data?.result;
  }

  /**
   * Merge tags in a collection
   * Raindrop.io API: PUT /tags/{collectionId}
   */
  async mergeTags(
    collectionId: number | undefined,
    tags: string[],
    newName: string,
  ): Promise<boolean> {
    const endpoint = collectionId ? "/tags/{collectionId}" : "/tags/0";
    const options = {
      ...(collectionId && { params: { path: { id: collectionId } } }),
      body: { tags, to: newName },
    };
    const { data } = await (this.client as any).PUT(endpoint, options);
    return !!data?.result;
  }

  /**
   * Fetch user info
   * Raindrop.io API: GET /user
   */
  async getUserInfo(): Promise<{ email: string; [key: string]: any }> {
    const { data } = await this.client.GET("/user");
    if (!data?.user) throw new Error("User not found");
    return data.user;
  }

  /**
   * Fetch user statistics (total bookmarks, collections, highlights, tags)
   * Raindrop.io API: GET /user/stats, /collections, and /tags/0
   */
  async getUserStats(): Promise<components["schemas"]["UserStatsResponse"]["stats"]> {
    return this.withRateLimit(async () => {
      // 1. Get system counts from /user/stats (bookmarks, trash)
      const statsResponse = await this.client.GET("/user/stats");
      const statsData = statsResponse.data as any;
      
      // 2. Get collection count from /collections
      const collectionsResponse = await this.client.GET("/collections");
      
      // 3. Get tag count from /tags/0
      const tagsResponse = await this.client.GET("/tags/0");

      const items = statsData?.items || [];
      const totalBookmarks = items.find((i: any) => i._id === 0)?.count || 0;
      const trashCount = items.find((i: any) => i._id === -99)?.count || 0;
      
      return {
        bookmarks: totalBookmarks,
        trash: trashCount,
        collections: collectionsResponse.data?.items?.length || 0,
        highlights: 0, // No direct total highlights count available
        tags: tagsResponse.data?.items?.length || 0,
      };
    });
  }

  /**
   * Fetch highlights for a specific bookmark
   * Raindrop.io API: GET /raindrop/{id}/highlights
   */
  async getHighlights(raindropId: number): Promise<Highlight[]> {
    const { data } = await this.client.GET("/raindrop/{id}/highlights", {
      params: { path: { id: raindropId } },
    });
    if (!data?.items) throw new Error("No highlights found");
    return [...((data.items as Highlight[]) || [])];
  }

  /**
   * Fetch all highlights across all bookmarks
   * Raindrop.io API: GET /raindrops/0
   */
  async getAllHighlights(): Promise<Highlight[]> {
    return this.withRateLimit(async () => {
      const { data } = await this.client.GET("/raindrops/0");
      const items = (data as any)?.items || [];
      return items.flatMap((bookmark: any) =>
        Array.isArray(bookmark.highlights) ? bookmark.highlights : [],
      );
    });
  }

  /**
   * Create a highlight for a bookmark
   * Raindrop.io API: POST /highlights
   */
  async createHighlight(
    bookmarkId: number,
    highlight: {
      text: string;
      note?: string;
      color?: HighlightColor;
    },
  ): Promise<Highlight> {
    return this.withRateLimit(async () => {
      const { data } = await this.client.POST("/highlights", {
        body: {
          ...highlight,
          raindrop: { $id: bookmarkId },
          color: (highlight.color ?? "yellow") as HighlightColor,
        },
      });
      if (!data?.item) throw new UpstreamError("Failed to create highlight");
      return data.item as Highlight;
    });
  }

  /**
   * Update a highlight
   * Raindrop.io API: PUT /highlights/{id}
   */
  async updateHighlight(
    id: number,
    updates: {
      text?: string;
      note?: string;
      color?: HighlightColor;
    },
  ): Promise<Highlight> {
    return this.withRateLimit(async () => {
      const { data } = await this.client.PUT("/highlights/{id}", {
        params: { path: { id } },
        body: updates,
      });
      if (!data?.item) throw new UpstreamError("Failed to update highlight");
      return data.item as Highlight;
    });
  }

  /**
   * Delete a highlight
   * Raindrop.io API: DELETE /highlights/{id}
   */
  async deleteHighlight(id: number): Promise<void> {
    await this.withRateLimit(async () => {
      await this.client.DELETE("/highlights/{id}", {
        params: { path: { id } },
      });
    });
  }
}
