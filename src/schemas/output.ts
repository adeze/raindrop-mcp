import { z } from "zod";

/**
 * MCP Tool Output Validation Schemas
 * 
 * These schemas validate the output of MCP tools and provide schema documentation
 * for tool metadata. They ensure consistent response structure and enable
 * automatic validation of tool outputs.
 */

// Base MCP Content Schema - supports both text and resource types
export const MCPTextContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  metadata: z.record(z.any()).optional()
});

export const MCPResourceContentSchema = z.object({
  type: z.literal("resource"),
  resource: z.object({
    text: z.string(),
    uri: z.string(),
    metadata: z.record(z.any()).optional()
  })
});

export const MCPContentSchema = z.union([MCPTextContentSchema, MCPResourceContentSchema]);

// Base MCP Response Schema
export const MCPResponseSchema = z.object({
  content: z.array(MCPContentSchema),
  metadata: z.record(z.any()).optional()
});

// Collection-specific schemas
export const CollectionContentMetadataSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  count: z.number(),
  public: z.boolean().optional(),
  created: z.string(),
  lastUpdate: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  view: z.enum(['list', 'simple', 'grid', 'masonry']).optional(),
  category: z.literal('collection').optional()
});

export const CollectionResponseSchema = z.object({
  content: z.array(z.object({
    type: z.literal("text"),
    text: z.string(),
    metadata: CollectionContentMetadataSchema
  })),
  metadata: z.object({
    total: z.number().optional(),
    page: z.number().optional()
  }).optional()
});

export const CollectionListResponseSchema = z.object({
  content: z.array(z.object({
    type: z.literal("text"),
    text: z.string(),
    metadata: CollectionContentMetadataSchema
  }))
});

// Bookmark-specific schemas
export const BookmarkContentMetadataSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  link: z.string(),
  excerpt: z.string().optional(),
  tags: z.array(z.string()),
  collectionId: z.number().optional(),
  created: z.string(),
  lastUpdate: z.string(),
  type: z.enum(['link', 'article', 'image', 'video', 'document', 'audio']),
  important: z.boolean(),
  domain: z.string().optional(),
  category: z.literal('bookmark').optional()
});

export const BookmarkResponseSchema = z.object({
  content: z.array(z.union([
    z.object({
      type: z.literal("text"),
      text: z.string(),
      metadata: BookmarkContentMetadataSchema
    }),
    z.object({
      type: z.literal("resource"),
      resource: z.object({
        text: z.string(),
        uri: z.string(),
        metadata: BookmarkContentMetadataSchema
      })
    })
  ])),
  metadata: z.object({
    total: z.number().optional(),
    page: z.number().optional(),
    collectionId: z.number().optional()
  }).optional()
});

export const BookmarkListResponseSchema = z.object({
  content: z.array(z.union([
    z.object({
      type: z.literal("text"),
      text: z.string(),
      metadata: BookmarkContentMetadataSchema
    }),
    z.object({
      type: z.literal("resource"),
      resource: z.object({
        text: z.string(),
        uri: z.string(),
        metadata: BookmarkContentMetadataSchema
      })
    })
  ]))
});

// Tag-specific schemas
export const TagContentMetadataSchema = z.object({
  name: z.string(),
  count: z.number(),
  category: z.literal('tag').optional()
});

export const TagResponseSchema = z.object({
  content: z.array(z.object({
    type: z.literal("text"),
    text: z.string(),
    metadata: TagContentMetadataSchema
  }))
});

// Highlight-specific schemas
export const HighlightContentMetadataSchema = z.object({
  id: z.number(),
  text: z.string(),
  note: z.string().optional(),
  color: z.string().optional(),
  created: z.string(),
  lastUpdate: z.string().optional(),
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
  link: z.string().optional(),
  domain: z.string().optional(),
  raindrop: z.object({
    _id: z.number(),
    title: z.string().optional(),
    link: z.string().optional(),
    collection: z.object({
      $id: z.number()
    }).optional()
  }).optional(),
  category: z.literal('highlight').optional()
});

export const HighlightResponseSchema = z.object({
  content: z.array(z.object({
    type: z.literal("text"),
    text: z.string(),
    metadata: HighlightContentMetadataSchema
  }))
});

// User-specific schemas
export const UserContentMetadataSchema = z.object({
  id: z.number(),
  email: z.string(),
  fullName: z.string().optional(),
  pro: z.boolean(),
  registered: z.string(),
  config: z.record(z.any()).optional(),
  category: z.literal('user').optional()
});

export const UserResponseSchema = z.object({
  content: z.array(z.object({
    type: z.literal("text"),
    text: z.string(),
    metadata: UserContentMetadataSchema
  }))
});

// Statistics schemas
export const StatsContentMetadataSchema = z.object({
  count: z.number(),
  lastBookmarkCreated: z.string(),
  lastBookmarkUpdated: z.string(),
  today: z.number().optional(),
  tags: z.number().optional(),
  collections: z.number().optional(),
  category: z.literal('stats').optional()
});

export const StatsResponseSchema = z.object({
  content: z.array(z.object({
    type: z.literal("text"),
    text: z.string(),
    metadata: StatsContentMetadataSchema
  }))
});

// Import/Export schemas
export const ImportExportStatusMetadataSchema = z.object({
  status: z.enum(['in-progress', 'ready', 'error']),
  progress: z.number().optional(),
  url: z.string().optional(),
  error: z.string().optional(),
  imported: z.number().optional(),
  duplicates: z.number().optional(),
  category: z.enum(['import', 'export']).optional()
});

export const ImportExportResponseSchema = z.object({
  content: z.array(z.object({
    type: z.literal("text"),
    text: z.string(),
    metadata: ImportExportStatusMetadataSchema
  }))
});

// Operation result schemas
export const OperationResultMetadataSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  affectedCount: z.number().optional(),
  operation: z.string().optional(),
  category: z.literal('operation').optional()
});

export const OperationResultResponseSchema = z.object({
  content: z.array(z.object({
    type: z.literal("text"),
    text: z.string(),
    metadata: OperationResultMetadataSchema
  }))
});

// Streaming output schemas (for tools that support streaming)
export const StreamingChunkSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  metadata: z.object({
    chunkIndex: z.number(),
    isComplete: z.boolean(),
    totalChunks: z.number().optional()
  })
});

export const StreamingResponseSchema = z.object({
  content: z.array(StreamingChunkSchema),
  metadata: z.object({
    streaming: z.literal(true),
    totalChunks: z.number().optional()
  })
});

// Union of all response schemas for validation
export const AnyToolResponseSchema = z.union([
  MCPResponseSchema,
  CollectionResponseSchema,
  CollectionListResponseSchema,
  BookmarkResponseSchema,
  BookmarkListResponseSchema,
  TagResponseSchema,
  HighlightResponseSchema,
  UserResponseSchema,
  StatsResponseSchema,
  ImportExportResponseSchema,
  OperationResultResponseSchema,
  StreamingResponseSchema
]);

// Export types
export type MCPContent = z.infer<typeof MCPContentSchema>;
export type MCPResponse = z.infer<typeof MCPResponseSchema>;
export type CollectionResponse = z.infer<typeof CollectionResponseSchema>;
export type BookmarkResponse = z.infer<typeof BookmarkResponseSchema>;
export type TagResponse = z.infer<typeof TagResponseSchema>;
export type HighlightResponse = z.infer<typeof HighlightResponseSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type StatsResponse = z.infer<typeof StatsResponseSchema>;
export type ImportExportResponse = z.infer<typeof ImportExportResponseSchema>;
export type OperationResultResponse = z.infer<typeof OperationResultResponseSchema>;
export type StreamingResponse = z.infer<typeof StreamingResponseSchema>;
export type AnyToolResponse = z.infer<typeof AnyToolResponseSchema>;