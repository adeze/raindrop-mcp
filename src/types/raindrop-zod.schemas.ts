import { z } from "zod";

/**
 * Input schema for managing Raindrop collections (CRUD).
 * @see {@link https://developer.raindrop.io/}
 */
export const CollectionManageInputSchema = z.object({
    operation: z.enum(['create', 'update', 'delete']),
    id: z.number().optional(),
    title: z.string().optional(),
    parentId: z.number().optional(),
});

/**
 * Input schema for Raindrop bookmark tools.
 * @see {@link https://developer.raindrop.io/} for API details.
 */
export const BookmarkInputSchema = z.object({
    url: z.string().url(),
    title: z.string(),
    tags: z.array(z.string()).optional(),
    important: z.boolean().optional(),
    collectionId: z.number().optional(),
    description: z.string().optional(),
});

/**
 * Output schema for Raindrop bookmark tools.
 * @see {@link https://developer.raindrop.io/}
 */
export const BookmarkOutputSchema = z.object({
    id: z.number(),
    url: z.string().url(),
    title: z.string(),
    tags: z.array(z.string()).optional(),
    important: z.boolean().optional(),
    collectionId: z.number().optional(),
    description: z.string().optional(),
});

/**
 * Input schema for Raindrop collection tools.
 * @see {@link https://developer.raindrop.io/}
 */
export const CollectionInputSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    color: z.string().optional(),
    parentId: z.number().optional(),
});

/**
 * Output schema for Raindrop collection tools.
 * @see {@link https://developer.raindrop.io/}
 */
export const CollectionOutputSchema = z.object({
    id: z.number(),
    title: z.string(),
    description: z.string().optional(),
    color: z.string().optional(),
    parentId: z.number().optional(),
});

/**
 * Input schema for Raindrop highlight tools.
 * @see {@link https://developer.raindrop.io/}
 */
export const HighlightInputSchema = z.object({
    bookmarkId: z.number(),
    text: z.string(),
    note: z.string().optional(),
    color: z.string().optional(),
});

/**
 * Output schema for Raindrop highlight tools.
 * @see {@link https://developer.raindrop.io/}
 */
export const HighlightOutputSchema = z.object({
    id: z.number(),
    bookmarkId: z.number(),
    text: z.string(),
    note: z.string().optional(),
    color: z.string().optional(),
});

/**
 * Input schema for Raindrop tag tools.
 * @see {@link https://developer.raindrop.io/}
 */
export const TagInputSchema = z.object({
    collectionId: z.number().optional(),
    tagNames: z.array(z.string()),
    newName: z.string().optional(),
    operation: z.enum(["rename", "merge", "delete"]),
});

/**
 * Output schema for Raindrop tag tools.
 * @see {@link https://developer.raindrop.io/}
 */
export const TagOutputSchema = z.object({
    tagNames: z.array(z.string()),
    success: z.boolean(),
});

/**
 * Output schema for diagnostics tool.
 * @see {@link https://github.com/modelcontextprotocol/typescript-sdk}
 */
export const DiagnosticsOutputSchema = z.object({
    status: z.string(),
    environment: z.record(z.string(), z.any()).optional(),
});

/**
 * Schema for Raindrop tag objects.
 * @see {@link https://developer.raindrop.io/}
 */
// ...existing code...

export const tagSchema = z.object({
    _id: z.string(),
    count: z.number().optional(),
    name: z.string().optional(),
});
