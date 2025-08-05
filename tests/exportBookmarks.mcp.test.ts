import { beforeAll, describe, expect, it } from 'vitest';
import { RaindropMCPService } from '../src/services/raindropmcp.service';

const exportOptions = {
  operation: 'export_bookmarks',
  format: 'csv',
  collectionId: undefined,
  includeBroken: false,
  includeDuplicates: false,
};

describe('RaindropMCPService import_export tool', () => {
  let exportResult: any;

  beforeAll(async () => {
    // Create service instance
    const mcpService = new RaindropMCPService();
    // Use the public callTool method to invoke the MCP tool
    exportResult = await mcpService.callTool('import_export', exportOptions);
  });

  it('should export a file (returns a valid URL)', async () => {
    expect(exportResult).toBeTruthy();
    expect(exportResult.result).toBeTruthy();
    expect(exportResult.result.url).toMatch(/^https?:\/\//);
  });
});
