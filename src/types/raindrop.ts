import { z } from "zod";



// Bookmark schema
export const BookmarkSchema = z.object({
  _id: z.number(),
  title: z.string(),
  excerpt: z.string().optional(),
  note: z.string().optional(),
  type: z.enum(["link", "article", "image", "video", "document", "audio"]),
  tags: z.array(z.string()),
  cover: z.string().optional(),
  link: z.string(),
  domain: z.string(),
  created: z.string(),
  lastUpdate: z.string(),
  removed: z.boolean(),
  media: z.array(z.object({
    link: z.string(),
    type: z.enum(["image", "video", "audio", "pdf", "doc"]),
    width: z.number().optional(),
    height: z.number().optional(),
  })).optional(),
  user: z.object({ $id: z.number() }),
  collection: z.object({ $id: z.number() }),
  html: z.string().optional(),
  important: z.boolean(),
  highlights: z.array(z.any()).optional(), // TODO: Use HighlightSchema
  reminder: z.object({ date: z.string(), note: z.string().optional() }).optional(),
  broken: z.boolean().optional(),
  duplicate: z.boolean().optional(),
  sort: z.number().optional(),
  cache: z.object({
    status: z.enum(["ready", "retry", "failed", "invalid-origin", "invalid-timeout"]),
    size: z.number(),
    created: z.string(),
  }).optional(),
});

// Highlight schema
export const HighlightSchema = z.object({
  _id: z.number(),
  text: z.string(),
  note: z.string().optional(),
  color: z.string().optional(),
  created: z.string(),
  lastUpdate: z.string().optional(),
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
  link: z.string().optional(),
  domain: z.string().optional(),
  excerpt: z.string().optional(),
  raindrop: z.object({
    _id: z.number(),
    title: z.string().optional(),
    link: z.string().optional(),
    collection: z.object({ $id: z.number() }).optional(),
  }),
});

// Tag schema (Raindrop API returns tags as strings, but sometimes as objects with _id and count)
export const TagSchema = z.object({
  _id: z.string().optional(),
  name: z.string().optional(),
  count: z.number().optional(),
});





// Raindrop.io types

/**
 * Represents a Raindrop.io user account.
 */
export type User = {
  _id: number;
  email: string;
  fullName?: string;
  pro: boolean;
  registered: string;
  config?: {
    broken_level: 'basic' | 'default' | 'strict';
    font_color: boolean;
    font_size: number;
    lang: string;
    last_collection: number;
    raindrops_sort: string;
    raindrops_view: string;
  };
};

/**
 * Represents a bookmark collection (folder) in Raindrop.io.
 */
export type Collection = {
  _id: number;
  title: string;
  description?: string;
  color?: string;
  public?: boolean;
  view: 'list' | 'simple' | 'grid' | 'masonry';
  sort: string;
  cover?: string[];
  count: number;
  expanded?: boolean;
  parent?: {
    $id: number;
    title?: string;
  };
  user: {
    $id: number;
  };
  created: string;
  lastUpdate: string;
  creatorRef?: {
    _id: number;
    name: string;
  };
  collaborators?: {
    _id: number;
    email: string;
    name?: string;
    role: 'owner' | 'viewer' | 'editor';
  }[];
};

export const CollectionSchema = z.object({
  _id: z.number(),
  title: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  public: z.boolean().optional(),
  view: z.enum(['list', 'simple', 'grid', 'masonry']),
  sort: z.string(),
  cover: z.array(z.string()).optional(),
  count: z.number(),
  expanded: z.boolean().optional(),
  parent: z
    .object({
      $id: z.number(),
      title: z.string().optional(),
    })
    .optional(),
  user: z.object({
    $id: z.number(),
  }),
  created: z.string(),
  lastUpdate: z.string(),
  creatorRef: z
    .object({
      _id: z.number(),
      name: z.string(),
    })
    .optional(),
  collaborators: z
    .array(
      z.object({
        _id: z.number(),
        email: z.string(),
        name: z.string().optional(),
        role: z.enum(['owner', 'viewer', 'editor']),
      })
    )
    .optional(),
});

export type Media = {
  link: string;
  type: 'image' | 'video' | 'audio' | 'pdf' | 'doc';
  width?: number;
  height?: number;
};

export type Bookmark = {
  _id: number;
  title: string;
  excerpt?: string;
  note?: string;
  type: 'link' | 'article' | 'image' | 'video' | 'document' | 'audio';
  tags: string[];
  cover?: string;
  link: string;
  domain: string;
  created: string;
  lastUpdate: string;
  removed: boolean;
  media?: Media[];
  user: {
    $id: number;
  };
  collection: {
    $id: number;
  };
  html?: string;
  important: boolean;
  highlights?: Highlight[];
  reminder?: {
    date: string;
    note?: string;
  };
  broken?: boolean;
  duplicate?: boolean;
  sort?: number;
  cache?: {
    status: 'ready' | 'retry' | 'failed' | 'invalid-origin' | 'invalid-timeout';
    size: number;
    created: string;
  };
};

export type Highlight = {
  _id: number;
  text: string;
  note?: string;
  color?: string;
  created: string;
  lastUpdate?: string;
  title?: string;
  tags?: string[];
  link?: string;
  domain?: string;
  excerpt?: string;
  raindrop: {
    _id: number;
    title?: string;
    link?: string;
    collection?: {
      $id: number;
    };
  };
};

export type HighlightContent = {
  uri: string;
  text: string;
  metadata: {
    id: string;
    note: string;
    created: string;
    title: string;
    tags?: string[];
    link: string;
    raindrop?: {
      _id: number;
      title?: string;
      link?: string;
    };
  };
};

export type SearchParams = {
  search?: string;
  collection?: number;
  tags?: string[];
  tag?: string; // Added for single tag filtering
  page?: number;
  perPage?: number;
  sort?: string;
  important?: boolean;
  duplicates?: boolean; // Added
  broken?: boolean; // Added
  highlight?: boolean; // Added
  domain?: string; // Added
  media?: 'image' | 'video' | 'document' | 'audio';
  word?: string;
  pleaseParse?: boolean;
  noparse?: boolean;
  since?: string; // ISO string date to filter bookmarks created/updated since this time
  created?: {
    $gte?: string;
    $lte?: string;
  };
};

export type UserStats = {
  count: number;
  lastBookmarkCreated: string;
  lastBookmarkUpdated: string;
  today: number;
  tags: number;
  collections: number;
};

export type CollectionStats = {
  count: number;
  lastBookmarkCreated: string;
  lastBookmarkUpdated: string;
  oldest: {
    id: number;
    created: string;
    title: string;
    link: string;
  };
  newest: {
    id: number;
    created: string;
    title: string;
    link: string;
  };
};

export type ImportOptions = {
  format?: 'html' | 'csv' | 'pocket' | 'instapaper' | 'netscape' | 'readwise';
  mode?: 'add' | 'replace';
};

export type ImportStatus = {
  status: 'in-progress' | 'ready' | 'error';
  progress?: number;
  imported?: number;
  duplicates?: number;
  error?: string;
};

export type ExportOptions = {
  collection?: number;
  format: 'csv' | 'html' | 'pdf';
  broken?: boolean;
  duplicates?: boolean;
};

export type ExportStatus = {
  status: 'in-progress' | 'ready' | 'error';
  progress?: number;
  url?: string;
  error?: string;
};