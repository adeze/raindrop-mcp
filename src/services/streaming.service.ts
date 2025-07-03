import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import raindropService from './raindrop.service.js';
import { type Bookmark, type Highlight, type SearchParams } from '../types/raindrop.js';

/**
 * Streaming service for handling large response operations in the Raindrop MCP server.
 * This service implements chunked responses for search operations, large data fetches,
 * and long-running operations like export/import.
 */
export class StreamingService {
  private server: McpServer;
  
  constructor(server: McpServer) {
    this.server = server;
  }

  /**
   * Stream search results in chunks with pagination
   */
  async streamSearchResults(
    params: {
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
      chunkSize?: number;
    },
    onChunk: (chunk: { items: Bookmark[]; page: number; total: number; hasMore: boolean }) => void,
    onProgress?: (progress: { current: number; total: number; percentage: number }) => void
  ): Promise<void> {
    const chunkSize = params.chunkSize || 25;
    let page = params.page || 0;
    let totalProcessed = 0;
    let totalItems = 0;
    let hasMore = true;

    while (hasMore) {
      const searchParams = { ...params, page, perPage: chunkSize };
      const result = await raindropService.searchRaindrops(searchParams);
      
      // Set total on first iteration
      if (totalItems === 0) {
        totalItems = result.count;
      }
      
      totalProcessed += result.items.length;
      hasMore = result.items.length === chunkSize && totalProcessed < totalItems;
      
      onChunk({
        items: result.items,
        page,
        total: totalItems,
        hasMore
      });
      
      if (onProgress) {
        onProgress({
          current: totalProcessed,
          total: totalItems,
          percentage: totalItems > 0 ? Math.round((totalProcessed / totalItems) * 100) : 100
        });
      }
      
      page++;
    }
  }

  /**
   * Stream highlights in chunks
   */
  async streamHighlights(
    params: {
      raindropId?: number;
      collectionId?: number;
      chunkSize?: number;
    },
    onChunk: (chunk: { items: Highlight[]; page: number; total: number; hasMore: boolean }) => void,
    onProgress?: (progress: { current: number; total: number; percentage: number }) => void
  ): Promise<void> {
    const chunkSize = params.chunkSize || 25;
    let page = 0;
    let totalProcessed = 0;
    let hasMore = true;

    while (hasMore) {
      let highlights: Highlight[] = [];
      
      if (params.raindropId) {
        // Get highlights for specific raindrop (no pagination available)
        highlights = await raindropService.getHighlights(params.raindropId);
        hasMore = false;
      } else if (params.collectionId) {
        // Get highlights for specific collection (no pagination available)
        highlights = await raindropService.getHighlightsByCollection(params.collectionId);
        hasMore = false;
      } else {
        // Get all highlights with pagination
        highlights = await raindropService.getAllHighlightsByPage(page, chunkSize);
        hasMore = highlights.length === chunkSize;
      }

      if (highlights.length === 0) {
        hasMore = false;
      }

      totalProcessed += highlights.length;
      
      onChunk({
        items: highlights,
        page,
        total: totalProcessed, // For highlights, we don't know total upfront
        hasMore
      });
      
      if (onProgress) {
        onProgress({
          current: totalProcessed,
          total: totalProcessed, // Progressive total for highlights
          percentage: hasMore ? 50 : 100 // Show 50% until done, then 100%
        });
      }
      
      page++;
    }
  }

  /**
   * Stream export progress for long-running operations
   */
  async streamExportProgress(
    exportOptions: {
      collection?: number;
      format: 'csv' | 'html' | 'pdf';
      broken?: boolean;
      duplicates?: boolean;
    },
    onProgress: (progress: { status: string; url?: string; message: string }) => void
  ): Promise<{ url: string }> {
    // Start the export
    const exportResult = await raindropService.exportBookmarks(exportOptions);
    
    onProgress({
      status: 'in-progress',
      message: 'Export started successfully'
    });
    
    // Poll for status updates
    let status = 'in-progress';
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    
    while (status === 'in-progress' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      try {
        const statusResult = await raindropService.getExportStatus();
        status = statusResult.status;
        
        onProgress({
          status: statusResult.status,
          url: statusResult.url,
          message: `Export ${statusResult.status}${statusResult.url ? `. Download available.` : ''}`
        });
        
        if (status === 'ready') {
          return { url: statusResult.url || exportResult.url };
        }
        
        if (status === 'error') {
          throw new Error('Export failed');
        }
      } catch (error) {
        onProgress({
          status: 'error',
          message: `Export status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        throw error;
      }
      
      attempts++;
    }
    
    // If we reach here, export might still be in progress
    onProgress({
      status: 'timeout',
      message: 'Export is taking longer than expected. Please check status manually.'
    });
    
    return { url: exportResult.url };
  }

  /**
   * Stream import progress for long-running operations
   */
  async streamImportProgress(
    onProgress: (progress: { status: string; message: string }) => void
  ): Promise<{ status: string }> {
    // Get initial status
    let status = 'in-progress';
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    
    while (status === 'in-progress' && attempts < maxAttempts) {
      try {
        const statusResult = await raindropService.getImportStatus();
        status = statusResult.status;
        
        onProgress({
          status: statusResult.status,
          message: `Import ${statusResult.status}`
        });
        
        if (status !== 'in-progress') {
          return { status: statusResult.status };
        }
      } catch (error) {
        onProgress({
          status: 'error',
          message: `Import status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;
    }
    
    onProgress({
      status: 'timeout',
      message: 'Import is taking longer than expected. Please check status manually.'
    });
    
    return { status: 'timeout' };
  }

  /**
   * Create a streaming resource handler
   */
  createStreamingResourceHandler<T>(
    fetcher: (params: any) => Promise<T[]>,
    chunkSize: number = 25
  ) {
    return async (params: any) => {
      const items = await fetcher(params);
      
      // If response is small enough, return all at once
      if (items.length <= chunkSize) {
        return items;
      }
      
      // For large responses, we should use streaming
      // Note: This is a simplified version - in a real implementation,
      // we would need to integrate with the transport layer to send chunks
      console.log(`Large response detected (${items.length} items). Consider using streaming tools instead.`);
      
      return items;
    };
  }
}

/**
 * Streaming utilities for STDIO transport
 */
export class StdioStreamingService {
  /**
   * Send a streaming message chunk via STDIO
   */
  static sendStreamingMessage(
    message: JSONRPCMessage,
    isPartial: boolean = false,
    chunkIndex?: number,
    totalChunks?: number
  ): void {
    const streamingMessage = {
      ...message,
      meta: {
        streaming: true,
        partial: isPartial,
        chunkIndex: chunkIndex,
        totalChunks: totalChunks
      }
    };
    
    // Send to stdout for STDIO transport
    console.log(JSON.stringify(streamingMessage));
  }

  /**
   * Send progress update via STDIO
   */
  static sendProgressUpdate(
    requestId: string | number,
    progress: { current: number; total: number; percentage: number; message?: string }
  ): void {
    const progressMessage = {
      jsonrpc: '2.0',
      method: 'notifications/progress',
      params: {
        requestId,
        progress
      }
    };
    
    console.log(JSON.stringify(progressMessage));
  }
}

export default StreamingService;