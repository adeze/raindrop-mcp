import { z } from "zod";


export const collectionManageInputSchema = z.object({
    operation: z.enum(['create', 'update', 'delete']),
    id: z.number().optional(),
    title: z.string().optional(),
    parentId: z.number().optional(),
    color: z.string().optional(),
    description: z.string().optional()
});

export const bookmarkManageInputSchema = z.object({
    operation: z.enum(['create', 'update', 'delete']),
    id: z.number().optional(),
    collectionId: z.number().optional(),
    url: z.string().url().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    important: z.boolean().optional(),
    data: z.any().optional()
});

export const tagManageInputSchema = z.object({
    operation: z.enum(['rename', 'merge', 'delete']),
    tagNames: z.array(z.string()).optional(),
    newName: z.string().optional(),
    collectionId: z.number().optional()
});

export const highlightManageInputSchema = z.object({
    operation: z.enum(['create', 'update', 'delete']),
    id: z.number().optional(),
    bookmarkId: z.number().optional(),
    text: z.string().optional(),
    note: z.string().optional(),
    color: z.string().optional()
});

export const bookmarkSearchInputSchema = z.object({
    query: z.string().optional(),
    collectionId: z.number().optional(),
    tags: z.array(z.string()).optional(),
    important: z.boolean().optional(),
    limit: z.number().min(1).max(100).optional().default(25),
    offset: z.number().min(0).optional().default(0),
    sample: z.number().min(1).max(100).optional()
});


export const collectionSchema = z.object({
    _id: z.number(),
    title: z.string(),
    description: z.string().optional(),
    count: z.number().optional(),
    parent: z.any().optional(),
    color: z.string().optional(),
    created: z.string().optional(),
    lastUpdate: z.string().optional(),
    expanded: z.boolean().optional(),
    access: z.any().optional(),
});

export const bookmarkSchema = z.object({
    _id: z.number(),
    title: z.string(),
    link: z.string(),
    excerpt: z.string().optional(),
    tags: z.array(z.string()).optional(),
    created: z.string().optional(),
    lastUpdate: z.string().optional(),
    important: z.boolean().optional(),
    collection: z.any().optional(),
});

export const highlightSchema = z.object({
    _id: z.string(),
    text: z.string(),
    note: z.string().optional(),
    color: z.string().optional(),
    created: z.string().optional(),
    lastUpdate: z.string().optional(),
    bookmarkId: z.number().optional(),
});

export const tagSchema = z.object({
    _id: z.string(),
    count: z.number().optional(),
    name: z.string().optional(),
});
