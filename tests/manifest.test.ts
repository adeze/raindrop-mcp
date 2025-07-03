/**
 * Manifest Validation Test for DXT Compliance
 * 
 * This test validates the manifest.json against DXT requirements:
 * - All required fields present
 * - All tools have unique, stable IDs and clear descriptions  
 * - Tools have proper categories, inputSchema, and outputSchema
 * - Compatibility and user_config are properly defined
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const manifestPath = path.join(__dirname, '../manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

describe('Manifest DXT Compliance', () => {
  it('should have all required fields', () => {
    const requiredFields = ['dxt_version', 'name', 'version', 'description', 'author', 'server'];
    requiredFields.forEach(field => {
      expect(manifest).toHaveProperty(field);
      expect(manifest[field]).toBeDefined();
    });
  });

  it('should have a valid tools array', () => {
    expect(manifest.tools).toBeDefined();
    expect(Array.isArray(manifest.tools)).toBe(true);
    expect(manifest.tools.length).toBeGreaterThan(0);
  });

  it('should have tools with proper structure', () => {
    const requiredToolFields = ['id', 'name', 'description', 'category', 'inputSchema', 'outputSchema'];
    
    manifest.tools.forEach((tool, index) => {
      requiredToolFields.forEach(field => {
        expect(tool).toHaveProperty(field);
        expect(tool[field]).toBeDefined();
      });
      
      // Tool ID should match name
      expect(tool.id).toBe(tool.name);
      
      // Schemas should be objects
      expect(typeof tool.inputSchema).toBe('object');
      expect(typeof tool.outputSchema).toBe('object');
      
      // Description should be meaningful
      expect(tool.description.length).toBeGreaterThan(10);
    });
  });

  it('should have unique tool IDs', () => {
    const toolIds = manifest.tools.map(tool => tool.id);
    const uniqueIds = [...new Set(toolIds)];
    expect(toolIds.length).toBe(uniqueIds.length);
  });

  it('should have expected tool categories', () => {
    const categories = [...new Set(manifest.tools.map(tool => tool.category))];
    const expectedCategories = ['Collections', 'Bookmarks', 'Tags', 'Highlights', 'User', 'Import/Export', 'General'];
    
    expectedCategories.forEach(expectedCategory => {
      expect(categories).toContain(expectedCategory);
    });
  });

  it('should have tools_generated flag set to true', () => {
    expect(manifest.tools_generated).toBe(true);
  });

  it('should have valid compatibility section', () => {
    expect(manifest.compatibility).toBeDefined();
    expect(manifest.compatibility.platforms).toBeDefined();
    expect(Array.isArray(manifest.compatibility.platforms)).toBe(true);
    expect(manifest.compatibility.runtimes).toBeDefined();
    expect(manifest.compatibility.runtimes.node).toBeDefined();
  });

  it('should have valid user_config section', () => {
    expect(manifest.user_config).toBeDefined();
    expect(manifest.user_config.api_key).toBeDefined();
    expect(manifest.user_config.api_key.required).toBe(true);
    expect(manifest.user_config.api_key.sensitive).toBe(true);
  });

  it('should have proper tool count distribution', () => {
    const toolsByCategory = manifest.tools.reduce((acc, tool) => {
      acc[tool.category] = (acc[tool.category] || 0) + 1;
      return acc;
    }, {});

    // Verify expected tool counts per category
    expect(toolsByCategory.Collections).toBe(7);
    expect(toolsByCategory.Bookmarks).toBe(6);  
    expect(toolsByCategory.Tags).toBe(2);
    expect(toolsByCategory.Highlights).toBe(4);
    expect(toolsByCategory.User).toBe(2);
    expect(toolsByCategory['Import/Export']).toBe(3);
    expect(toolsByCategory.General).toBe(1);
    
    // Total should be 25 tools
    expect(manifest.tools.length).toBe(25);
  });
});