#!/usr/bin/env bun
/**
 * Tool Migration Script
 * 
 * This script helps migrate MCP tools to use output validation schemas.
 * It analyzes tool outputs and suggests the appropriate schema validation.
 */

import fs from 'fs';
import path from 'path';

// Define tool categories and their corresponding schemas
const TOOL_CATEGORIES = {
    // Collection tools
    'collection': {
        single: 'CollectionResponseSchema',
        list: 'CollectionListResponseSchema',
        patterns: ['getCollection', 'createCollection', 'updateCollection', 'collection_get', 'collection_create']
    },
    
    // Bookmark tools
    'bookmark': {
        single: 'BookmarkResponseSchema',
        list: 'BookmarkListResponseSchema',
        patterns: ['getBookmark', 'createBookmark', 'updateBookmark', 'searchBookmarks', 'bookmark_', 'getBookmarks']
    },
    
    // Tag tools
    'tag': {
        single: 'TagResponseSchema',
        list: 'TagResponseSchema',
        patterns: ['getTag', 'createTag', 'updateTag', 'renameTag', 'deleteTag', 'tag_', 'getTags']
    },
    
    // Highlight tools
    'highlight': {
        single: 'HighlightResponseSchema',
        list: 'HighlightResponseSchema',
        patterns: ['getHighlight', 'createHighlight', 'updateHighlight', 'highlight_', 'getHighlights']
    },
    
    // User tools
    'user': {
        single: 'UserResponseSchema',
        list: 'UserResponseSchema',
        patterns: ['getUser', 'getUserInfo', 'user_info']
    },
    
    // Stats tools
    'stats': {
        single: 'StatsResponseSchema',
        list: 'StatsResponseSchema',
        patterns: ['getStats', 'getUserStats', 'user_stats', 'statistics']
    },
    
    // Import/Export tools
    'import_export': {
        single: 'ImportExportResponseSchema',
        list: 'ImportExportResponseSchema',
        patterns: ['import', 'export', 'getImportStatus', 'getExportStatus']
    },
    
    // Operation result tools
    'operation': {
        single: 'OperationResultResponseSchema',
        list: 'OperationResultResponseSchema',
        patterns: ['delete', 'remove', 'move', 'bulk', 'batch', 'merge', 'empty']
    }
};

/**
 * Determines the appropriate schema for a tool based on its name
 */
function getSchemaForTool(toolName: string): { schema: string; category: string; isList: boolean } {
    const lowerName = toolName.toLowerCase();
    
    for (const [category, config] of Object.entries(TOOL_CATEGORIES)) {
        for (const pattern of config.patterns) {
            if (lowerName.includes(pattern.toLowerCase())) {
                // Determine if it's a list operation
                const isList = lowerName.includes('list') || 
                              lowerName.includes('all') || 
                              lowerName.includes('search') ||
                              lowerName.includes('get') && lowerName.includes('s'); // e.g., getBookmarks
                
                return {
                    schema: isList ? config.list : config.single,
                    category: category,
                    isList: isList
                };
            }
        }
    }
    
    // Default to generic response schema
    return {
        schema: 'MCPResponseSchema',
        category: 'general',
        isList: false
    };
}

/**
 * Extracts tool names from a service file
 */
function extractToolNames(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const toolRegex = /this\.server\.tool\(\s*['"](.*?)['"],/g;
    const tools: string[] = [];
    let match;
    
    while ((match = toolRegex.exec(content)) !== null) {
        tools.push(match[1]);
    }
    
    return tools;
}

/**
 * Generates validation template for a tool
 */
function generateValidationTemplate(toolName: string, schemaInfo: ReturnType<typeof getSchemaForTool>): string {
    const { schema, category, isList } = schemaInfo;
    
    return `
    // Tool: ${toolName}
    // Schema: ${schema}
    // Category: ${category}
    // Is List: ${isList}
    
    createValidatedToolHandler(async (params) => {
        try {
            // Original tool logic here...
            
            return createToolResponse([{
                type: "text",
                text: "...",
                metadata: {
                    // Add appropriate metadata fields
                    category: '${category}' as const
                }
            }], undefined, ${schema});
        } catch (error) {
            throw new Error(\`Failed to execute ${toolName}: \${(error as Error).message}\`);
        }
    }, ${schema}),
    createToolMetadata(${schema}, '${category}')
    `;
}

/**
 * Analyzes tools in both service files
 */
function analyzeTools() {
    const serviceFiles = [
        'src/services/mcp.service.ts',
        'src/services/mcp-optimized.service.ts'
    ];
    
    console.log('🔍 Analyzing MCP tools for validation migration...\n');
    
    for (const filePath of serviceFiles) {
        if (!fs.existsSync(filePath)) {
            console.log(`❌ File not found: ${filePath}`);
            continue;
        }
        
        console.log(`📁 Analyzing ${filePath}:`);
        const tools = extractToolNames(filePath);
        
        console.log(`   Found ${tools.length} tools:\n`);
        
        const categorizedTools: Record<string, string[]> = {};
        
        for (const tool of tools) {
            const schemaInfo = getSchemaForTool(tool);
            const key = `${schemaInfo.category}:${schemaInfo.schema}`;
            
            if (!categorizedTools[key]) {
                categorizedTools[key] = [];
            }
            categorizedTools[key].push(tool);
            
            console.log(`   • ${tool} → ${schemaInfo.schema} (${schemaInfo.category})`);
        }
        
        console.log('\n📊 Summary by category:');
        for (const [key, tools] of Object.entries(categorizedTools)) {
            const [category, schema] = key.split(':');
            console.log(`   ${category}: ${tools.length} tools (${schema})`);
        }
        
        console.log('\n' + '='.repeat(60) + '\n');
    }
}

/**
 * Generates migration guide
 */
function generateMigrationGuide() {
    console.log('\n📋 MIGRATION GUIDE\n');
    console.log('To update tools with validation:');
    console.log('');
    console.log('1. Import the necessary schemas:');
    console.log('   import { CollectionResponseSchema, BookmarkResponseSchema, ... } from "../schemas/output.js";');
    console.log('   import { createValidatedToolHandler, createToolMetadata } from "../schemas/validation.js";');
    console.log('');
    console.log('2. Update tool definitions:');
    console.log('   - Replace the handler function with createValidatedToolHandler()');
    console.log('   - Add schema validation and metadata generation');
    console.log('   - Use createToolResponse() for consistent response structure');
    console.log('');
    console.log('3. Add metadata to tool definitions:');
    console.log('   - Add createToolMetadata() as the last parameter');
    console.log('   - Include appropriate category and schema information');
    console.log('');
    console.log('4. Update return statements:');
    console.log('   - Use createToolResponse() instead of manual object creation');
    console.log('   - Include proper metadata with category field');
    console.log('');
}

// Run analysis
if (import.meta.main) {
    analyzeTools();
    generateMigrationGuide();
}