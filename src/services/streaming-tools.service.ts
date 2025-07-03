import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import raindropService from './raindrop.service.js';
import StreamingService from './streaming.service.js';
import { type Bookmark, type Highlight } from '../types/raindrop.js';

/**
 * Streaming-aware tools for Raindrop MCP server
 * These tools are designed to handle large responses efficiently using streaming
 */
export class StreamingTools {
  private server: McpServer;
  private streamingService: StreamingService;

  constructor(server: McpServer) {
    this.server = server;
    this.streamingService = new StreamingService(server);
  }

  /**
   * Initialize streaming tools
   */
  initializeStreamingTools() {
    // Streaming search bookmarks tool
    this.server.tool(
      'streamSearchBookmarks',
      'Search bookmarks with streaming results for large datasets',
      {
        search: z.string().optional().describe('Search query'),
        collection: z.number().optional().describe('Collection ID'),
        tags: z.array(z.string()).optional().describe('Filter by tags'),
        createdStart: z.string().optional().describe('Created after date (ISO format)'),
        createdEnd: z.string().optional().describe('Created before date (ISO format)'),
        important: z.boolean().optional().describe('Only important bookmarks'),
        media: z.enum(['image', 'video', 'document', 'audio']).optional().describe('Media type filter'),
        sort: z.string().optional().describe('Sort order (e.g., "title", "-created")'),
        chunkSize: z.number().optional().describe('Number of results per chunk (default: 25, max: 50)'),
        streaming: z.boolean().optional().describe('Enable streaming mode for large results (default: true)')
      },
      async (params) => {
        const chunkSize = Math.min(params.chunkSize || 25, 50);
        const streaming = params.streaming !== false;
        
        if (!streaming) {
          // Fall back to regular search
          const result = await raindropService.searchRaindrops({
            ...params,
            perPage: chunkSize
          });
          
          return {
            content: [{
              type: "text",
              text: `Found ${result.count} bookmarks (showing first ${result.items.length})`,
              metadata: {
                total: result.count,
                items: result.items.map(bookmark => ({
                  type: "resource",
                  resource: {
                    uri: bookmark.link,
                    text: bookmark.title || "Untitled Bookmark",
                    metadata: {
                      id: bookmark._id,
                      collection: bookmark.collection?.$id,
                      tags: bookmark.tags,
                      created: bookmark.created,
                      important: bookmark.important,
                      excerpt: bookmark.excerpt
                    }
                  }
                }))
              }
            }]
          };
        }

        // Streaming mode
        const results: Bookmark[] = [];
        let totalCount = 0;
        
        await this.streamingService.streamSearchResults(
          { ...params, chunkSize },
          (chunk) => {
            results.push(...chunk.items);
            totalCount = chunk.total;
          },
          (progress) => {
            // Progress notifications would be sent here in a real streaming implementation
            console.log(`Search progress: ${progress.percentage}% (${progress.current}/${progress.total})`);
          }
        );

        return {
          content: [{
            type: "text",
            text: `Streaming search completed. Found ${totalCount} bookmarks.`,
            metadata: {
              total: totalCount,
              streamed: true,
              chunks: Math.ceil(results.length / chunkSize),
              summary: {
                collections: [...new Set(results.map(b => b.collection?.$id).filter(Boolean))],
                tags: [...new Set(results.flatMap(b => b.tags || []))].slice(0, 20),
                mediaTypes: [...new Set(results.map(b => b.type).filter(Boolean))]
              }
            }
          }]
        };
      }
    );

    // Streaming highlights tool
    this.server.tool(
      'streamHighlights',
      'Stream highlights with support for large datasets',
      {
        raindropId: z.number().optional().describe('Get highlights for specific raindrop'),
        collectionId: z.number().optional().describe('Get highlights for specific collection'),
        chunkSize: z.number().optional().describe('Number of highlights per chunk (default: 25)'),
        streaming: z.boolean().optional().describe('Enable streaming mode (default: true)')
      },
      async (params) => {
        const chunkSize = params.chunkSize || 25;
        const streaming = params.streaming !== false;
        
        if (!streaming) {
          // Fall back to regular fetch
          let highlights: Highlight[] = [];
          
          if (params.raindropId) {
            highlights = await raindropService.getHighlights(params.raindropId);
          } else if (params.collectionId) {
            highlights = await raindropService.getHighlightsByCollection(params.collectionId);
          } else {
            highlights = await raindropService.getAllHighlights();
          }
          
          return {
            content: [{
              type: "text",
              text: `Found ${highlights.length} highlights`,
              metadata: {
                count: highlights.length,
                highlights: highlights.map(h => ({
                  id: h._id,
                  text: h.text,
                  raindropId: h.raindrop?._id,
                  created: h.created,
                  color: h.color
                }))
              }
            }]
          };
        }

        // Streaming mode
        const results: Highlight[] = [];
        let totalProcessed = 0;
        
        await this.streamingService.streamHighlights(
          { ...params, chunkSize },
          (chunk) => {
            results.push(...chunk.items);
            totalProcessed += chunk.items.length;
          },
          (progress) => {
            console.log(`Highlights progress: ${progress.percentage}% (${progress.current} processed)`);
          }
        );

        return {
          content: [{
            type: "text",
            text: `Streaming highlights completed. Processed ${totalProcessed} highlights.`,
            metadata: {
              total: totalProcessed,
              streamed: true,
              chunks: Math.ceil(results.length / chunkSize),
              summary: {
                colors: [...new Set(results.map(h => h.color).filter(Boolean))],
                raindrops: [...new Set(results.map(h => h.raindrop?._id).filter(Boolean))].length,
                averageLength: results.length > 0 ? Math.round(results.reduce((sum, h) => sum + h.text.length, 0) / results.length) : 0
              }
            }
          }]
        };
      }
    );

    // Streaming export tool
    this.server.tool(
      'streamExportBookmarks',
      'Export bookmarks with streaming progress updates',
      {
        format: z.enum(['csv', 'html', 'pdf']).describe('Export format'),
        collectionId: z.number().optional().describe('Export specific collection'),
        broken: z.boolean().optional().describe('Include broken links'),
        duplicates: z.boolean().optional().describe('Include duplicates'),
        progressUpdates: z.boolean().optional().describe('Enable progress streaming (default: true)')
      },
      async (params) => {
        const enableProgress = params.progressUpdates !== false;
        
        if (!enableProgress) {
          // Fall back to regular export
          const result = await raindropService.exportBookmarks(params);
          return {
            content: [{
              type: "text",
              text: `Export started. Check status at: ${result.url}`,
              metadata: { url: result.url }
            }]
          };
        }

        // Streaming progress mode
        const progressUpdates: Array<{ status: string; message: string; url?: string }> = [];
        
        const result = await this.streamingService.streamExportProgress(
          params,
          (progress) => {
            progressUpdates.push(progress);
            console.log(`Export progress: ${progress.status} - ${progress.message}`);
          }
        );

        return {
          content: [{
            type: "text",
            text: `Export completed successfully. Download URL: ${result.url}`,
            metadata: {
              url: result.url,
              streamed: true,
              progressUpdates: progressUpdates,
              format: params.format,
              collection: params.collectionId
            }
          }]
        };
      }
    );

    // Streaming import status tool
    this.server.tool(
      'streamImportStatus',
      'Monitor import progress with streaming updates',
      {
        progressUpdates: z.boolean().optional().describe('Enable progress streaming (default: true)')
      },
      async (params) => {
        const enableProgress = params.progressUpdates !== false;
        
        if (!enableProgress) {
          // Fall back to regular status check
          const status = await raindropService.getImportStatus();
          return {
            content: [{
              type: "text",
              text: `Import status: ${status.status}`,
              metadata: status
            }]
          };
        }

        // Streaming progress mode
        const progressUpdates: Array<{ status: string; message: string }> = [];
        
        const result = await this.streamingService.streamImportProgress(
          (progress) => {
            progressUpdates.push(progress);
            console.log(`Import progress: ${progress.status} - ${progress.message}`);
          }
        );

        return {
          content: [{
            type: "text",
            text: `Import monitoring completed. Final status: ${result.status}`,
            metadata: {
              finalStatus: result.status,
              streamed: true,
              progressUpdates: progressUpdates
            }
          }]
        };
      }
    );
  }

  /**
   * Get streaming capabilities info
   */
  getStreamingCapabilities() {
    return {
      tools: {
        streamSearchBookmarks: {
          supports: ['chunked_results', 'progress_updates'],
          maxChunkSize: 50,
          defaultChunkSize: 25
        },
        streamHighlights: {
          supports: ['chunked_results', 'progress_updates'],
          maxChunkSize: 50,
          defaultChunkSize: 25
        },
        streamExportBookmarks: {
          supports: ['progress_updates', 'long_running'],
          estimatedTime: '30-300 seconds'
        },
        streamImportStatus: {
          supports: ['progress_updates', 'long_running'],
          estimatedTime: '30-300 seconds'
        }
      },
      transports: {
        http: {
          streaming: true,
          sse: true,
          chunked: true
        },
        stdio: {
          streaming: true,
          progressive: true,
          chunked: false
        }
      }
    };
  }
}

export default StreamingTools;