#!/usr/bin/env bun
/**
 * Test script to validate MCP output schemas
 * 
 * This script tests the output validation schemas to ensure they work correctly
 * with the MCP tool outputs.
 */

import { describe, it, expect } from 'bun:test';
import { 
    CollectionResponseSchema, 
    CollectionListResponseSchema,
    BookmarkResponseSchema,
    TagResponseSchema,
    validateToolOutput,
    createToolResponse
} from '../src/schemas/output.js';
import { 
    validateToolOutput as validateOutput,
    createToolMetadata
} from '../src/schemas/validation.js';

describe('MCP Output Schema Validation', () => {
    
    it('should validate a single collection response', () => {
        const validResponse = {
            content: [{
                type: "text",
                text: "My Collection",
                metadata: {
                    id: 12345,
                    title: "My Collection",
                    count: 25,
                    public: false,
                    created: "2024-01-01T00:00:00Z",
                    lastUpdate: "2024-01-02T00:00:00Z",
                    category: "collection"
                }
            }]
        };

        expect(() => validateOutput(validResponse, CollectionResponseSchema)).not.toThrow();
        const validated = validateOutput(validResponse, CollectionResponseSchema);
        expect(validated.content).toHaveLength(1);
        expect(validated.content[0].metadata.id).toBe(12345);
    });

    it('should validate a collection list response', () => {
        const validResponse = {
            content: [
                {
                    type: "text",
                    text: "Collection 1",
                    metadata: {
                        id: 1,
                        title: "Collection 1",
                        count: 10,
                        public: true,
                        created: "2024-01-01T00:00:00Z",
                        lastUpdate: "2024-01-02T00:00:00Z",
                        category: "collection"
                    }
                },
                {
                    type: "text",
                    text: "Collection 2",
                    metadata: {
                        id: 2,
                        title: "Collection 2",
                        count: 5,
                        public: false,
                        created: "2024-01-01T00:00:00Z",
                        lastUpdate: "2024-01-02T00:00:00Z",
                        category: "collection"
                    }
                }
            ]
        };

        expect(() => validateOutput(validResponse, CollectionListResponseSchema)).not.toThrow();
        const validated = validateOutput(validResponse, CollectionListResponseSchema);
        expect(validated.content).toHaveLength(2);
    });

    it('should validate a bookmark response', () => {
        const validResponse = {
            content: [{
                type: "text",
                text: "My Bookmark",
                metadata: {
                    id: 54321,
                    title: "My Bookmark",
                    link: "https://example.com",
                    excerpt: "A sample bookmark",
                    tags: ["tag1", "tag2"],
                    created: "2024-01-01T00:00:00Z",
                    lastUpdate: "2024-01-02T00:00:00Z",
                    type: "link",
                    important: false,
                    category: "bookmark"
                }
            }],
            metadata: {
                total: 1,
                page: 0
            }
        };

        expect(() => validateOutput(validResponse, BookmarkResponseSchema)).not.toThrow();
        const validated = validateOutput(validResponse, BookmarkResponseSchema);
        expect(validated.content[0].metadata.id).toBe(54321);
        expect(validated.metadata?.total).toBe(1);
    });

    it('should reject invalid response structure', () => {
        const invalidResponse = {
            content: [{
                type: "text",
                text: "Invalid",
                metadata: {
                    id: "not-a-number", // This should be a number
                    title: "Invalid Collection"
                }
            }]
        };

        expect(() => validateOutput(invalidResponse, CollectionResponseSchema)).toThrow();
    });

    it('should create tool metadata with schema information', () => {
        const metadata = createToolMetadata(CollectionResponseSchema, 'collections');
        
        expect(metadata).toHaveProperty('category');
        expect(metadata).toHaveProperty('outputSchema');
        expect(metadata).toHaveProperty('hasValidation');
        expect(metadata.category).toBe('collections');
        expect(metadata.hasValidation).toBe(true);
        expect(metadata.outputSchema).toHaveProperty('$schema');
    });

    it('should create streaming tool metadata', () => {
        const metadata = createToolMetadata(CollectionResponseSchema, 'collections', true);
        
        expect(metadata).toHaveProperty('streaming');
        expect(metadata.streaming).toHaveProperty('supported');
        expect(metadata.streaming).toHaveProperty('chunkSchema');
        expect(metadata.streaming.supported).toBe(true);
    });
});

// Run tests manually if this script is executed directly
if (import.meta.main) {
    console.log('Running MCP output schema validation tests...');
    
    try {
        // Test collection response
        const collectionResponse = {
            content: [{
                type: "text",
                text: "Test Collection",
                metadata: {
                    id: 123,
                    title: "Test Collection",
                    count: 10,
                    public: false,
                    created: "2024-01-01T00:00:00Z",
                    lastUpdate: "2024-01-02T00:00:00Z",
                    category: "collection"
                }
            }]
        };
        
        validateOutput(collectionResponse, CollectionResponseSchema);
        console.log('✓ Collection response validation passed');
        
        // Test metadata generation
        const metadata = createToolMetadata(CollectionResponseSchema, 'collections');
        console.log('✓ Tool metadata generation passed');
        console.log('Generated metadata keys:', Object.keys(metadata));
        
        console.log('\nAll tests passed! 🎉');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}