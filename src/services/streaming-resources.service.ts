import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import raindropService from './raindrop.service.js';
import StreamingService from './streaming.service.js';
import { type Bookmark, type Highlight } from '../types/raindrop.js';

/**
 * Streaming-aware resources for Raindrop MCP server
 * These resources are designed to handle large datasets efficiently
 */
export class StreamingResources {
  private server: McpServer;
  private streamingService: StreamingService;

  constructor(server: McpServer) {
    this.server = server;
    this.streamingService = new StreamingService(server);
  }

  /**
   * Initialize streaming resources
   */
  initializeStreamingResources() {
    // Streaming highlights resource
    this.server.resource(
      'streaming-highlights',
      'highlights://stream/all',
      async (uri) => {
        console.log(`[STREAMING] Fetching all highlights with chunked loading...`);
        
        const highlights: Highlight[] = [];
        let chunkCount = 0;
        
        await this.streamingService.streamHighlights(
          { chunkSize: 25 },
          (chunk) => {
            highlights.push(...chunk.items);
            chunkCount++;
            console.log(`[STREAMING] Loaded chunk ${chunkCount}: ${chunk.items.length} highlights`);
          }
        );

        console.log(`[STREAMING] Completed loading ${highlights.length} highlights in ${chunkCount} chunks`);

        return {
          contents: highlights.map(highlight => ({
            uri: `${uri.href}/${highlight._id}`,
            text: highlight.text,
            metadata: {
              id: highlight._id,
              raindropId: highlight.raindrop?._id,
              raindropTitle: highlight.raindrop?.title,
              raindropLink: highlight.raindrop?.link,
              note: highlight.note,
              color: highlight.color,
              created: highlight.created,
              lastUpdate: highlight.lastUpdate,
              title: highlight.title,
              tags: highlight.tags,
              link: highlight.link,
              domain: highlight.domain,
              excerpt: highlight.excerpt,
              streamingInfo: {
                chunkNumber: Math.floor(highlights.indexOf(highlight) / 25) + 1,
                totalChunks: chunkCount
              }
            }
          })),
          metadata: {
            total: highlights.length,
            streamingEnabled: true,
            chunksLoaded: chunkCount,
            loadingMethod: 'streaming'
          }
        };
      }
    );

    // Streaming search results resource
    this.server.resource(
      'streaming-search',
      new ResourceTemplate('search://stream/{query}', { list: undefined }),
      async (uri, { query }) => {
        console.log(`[STREAMING] Searching for "${query}" with chunked loading...`);
        
        const bookmarks: Bookmark[] = [];
        let totalFound = 0;
        let chunkCount = 0;
        
        await this.streamingService.streamSearchResults(
          { search: Array.isArray(query) ? query.join(' ') : query, chunkSize: 25 },
          (chunk) => {
            bookmarks.push(...chunk.items);
            totalFound = chunk.total;
            chunkCount++;
            console.log(`[STREAMING] Search chunk ${chunkCount}: ${chunk.items.length} bookmarks (${chunk.hasMore ? 'more available' : 'complete'})`);
          }
        );

        console.log(`[STREAMING] Search completed: ${bookmarks.length} bookmarks loaded in ${chunkCount} chunks`);

        return {
          contents: bookmarks.map(bookmark => ({
            uri: bookmark.link,
            text: bookmark.title || "Untitled Bookmark",
            metadata: {
              id: bookmark._id,
              collection: bookmark.collection?.$id,
              tags: bookmark.tags,
              created: bookmark.created,
              lastUpdate: bookmark.lastUpdate,
              type: bookmark.type,
              important: bookmark.important,
              excerpt: bookmark.excerpt,
              streamingInfo: {
                chunkNumber: Math.floor(bookmarks.indexOf(bookmark) / 25) + 1,
                totalChunks: chunkCount,
                query: query
              }
            }
          })),
          metadata: {
            query: query,
            total: totalFound,
            retrieved: bookmarks.length,
            streamingEnabled: true,
            chunksLoaded: chunkCount,
            loadingMethod: 'streaming'
          }
        };
      }
    );

    // Collection highlights with streaming
    this.server.resource(
      'streaming-collection-highlights',
      new ResourceTemplate('highlights://stream/collection/{collectionId}', { list: undefined }),
      async (uri, { collectionId }) => {
        console.log(`[STREAMING] Fetching highlights for collection ${collectionId} with chunked loading...`);
        
        const highlights: Highlight[] = [];
        let chunkCount = 0;
        
        await this.streamingService.streamHighlights(
          { collectionId: Number(collectionId), chunkSize: 25 },
          (chunk) => {
            highlights.push(...chunk.items);
            chunkCount++;
            console.log(`[STREAMING] Collection highlights chunk ${chunkCount}: ${chunk.items.length} highlights`);
          }
        );

        return {
          contents: highlights.map(highlight => ({
            uri: `${uri.href}/${highlight._id}`,
            text: highlight.text,
            metadata: {
              id: highlight._id,
              raindropId: highlight.raindrop?._id,
              raindropTitle: highlight.raindrop?.title,
              raindropLink: highlight.raindrop?.link,
              note: highlight.note,
              color: highlight.color,
              created: highlight.created,
              lastUpdate: highlight.lastUpdate,
              tags: highlight.tags,
              collectionId: Number(collectionId),
              streamingInfo: {
                chunkNumber: Math.floor(highlights.indexOf(highlight) / 25) + 1,
                totalChunks: chunkCount
              }
            }
          })),
          metadata: {
            collectionId: Number(collectionId),
            total: highlights.length,
            streamingEnabled: true,
            chunksLoaded: chunkCount,
            loadingMethod: 'streaming'
          }
        };
      }
    );

    // Raindrop highlights with streaming  
    this.server.resource(
      'streaming-raindrop-highlights',
      new ResourceTemplate('highlights://stream/raindrop/{raindropId}', { list: undefined }),
      async (uri, { raindropId }) => {
        console.log(`[STREAMING] Fetching highlights for raindrop ${raindropId} with chunked loading...`);
        
        const highlights: Highlight[] = [];
        let chunkCount = 0;
        
        await this.streamingService.streamHighlights(
          { raindropId: Number(raindropId), chunkSize: 25 },
          (chunk) => {
            highlights.push(...chunk.items);
            chunkCount++;
            console.log(`[STREAMING] Raindrop highlights chunk ${chunkCount}: ${chunk.items.length} highlights`);
          }
        );

        return {
          contents: highlights.map(highlight => ({
            uri: `${uri.href}/${highlight._id}`,
            text: highlight.text,
            metadata: {
              id: highlight._id,
              raindropId: Number(raindropId),
              raindropTitle: highlight.raindrop?.title,
              raindropLink: highlight.raindrop?.link,
              note: highlight.note,
              color: highlight.color,
              created: highlight.created,
              lastUpdate: highlight.lastUpdate,
              tags: highlight.tags,
              streamingInfo: {
                chunkNumber: Math.floor(highlights.indexOf(highlight) / 25) + 1,
                totalChunks: chunkCount
              }
            }
          })),
          metadata: {
            raindropId: Number(raindropId),
            total: highlights.length,
            streamingEnabled: true,
            chunksLoaded: chunkCount,
            loadingMethod: 'streaming'
          }
        };
      }
    );

    // Large collections resource with streaming
    this.server.resource(
      'streaming-collections',
      'collections://stream/all',
      async (uri) => {
        console.log(`[STREAMING] Fetching collections (streaming-aware)...`);
        
        // Collections are typically small, but we'll add streaming awareness
        const collections = await raindropService.getCollections();
        
        console.log(`[STREAMING] Loaded ${collections.length} collections`);

        return {
          contents: collections.map(collection => ({
            uri: `${uri.href}/${collection._id}`,
            text: collection.title,
            metadata: {
              id: collection._id,
              count: collection.count,
              parent: collection.parent?.$id,
              sort: collection.sort,
              public: collection.public,
              streamingInfo: {
                loadingMethod: 'direct', // Collections are small enough for direct loading
                note: 'Collections dataset is small - streaming not required'
              }
            }
          })),
          metadata: {
            total: collections.length,
            streamingEnabled: false,
            loadingMethod: 'direct',
            reason: 'Dataset size does not require streaming'
          }
        };
      }
    );
  }

  /**
   * Get information about streaming resource capabilities
   */
  getStreamingResourceInfo() {
    return {
      resources: {
        'highlights://stream/all': {
          description: 'All highlights loaded with streaming support',
          streaming: true,
          chunkSize: 25,
          estimatedSize: 'large'
        },
        'search://stream/{query}': {
          description: 'Search results with streaming support',
          streaming: true,
          chunkSize: 25,
          estimatedSize: 'variable'
        },
        'highlights://stream/collection/{collectionId}': {
          description: 'Collection highlights with streaming support',
          streaming: true,
          chunkSize: 25,
          estimatedSize: 'medium'
        },
        'highlights://stream/raindrop/{raindropId}': {
          description: 'Raindrop highlights with streaming support',
          streaming: true,
          chunkSize: 25,
          estimatedSize: 'small'
        },
        'collections://stream/all': {
          description: 'Collections with streaming awareness',
          streaming: false,
          reason: 'Dataset typically small',
          estimatedSize: 'small'
        }
      },
      guidelines: {
        whenToUseStreaming: [
          'When fetching all highlights (potentially thousands)',
          'When performing searches that may return many results',
          'When accessing large collections with many bookmarks'
        ],
        chunkingSizes: {
          small: '1-25 items',
          medium: '25-100 items', 
          large: '100+ items'
        }
      }
    };
  }
}

export default StreamingResources;