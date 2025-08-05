import { beforeAll, describe, expect, it } from 'vitest';
import RaindropService from '../services/raindrop.service';

// Use valid options for RaindropService.exportBookmarks
const exportOptions = {
  format: 'csv' as const,
  collection: undefined,
  broken: false,
  duplicates: false,
};

describe('RaindropService exportBookmarks', () => {
  let exportFilePath: string;

  beforeAll(async () => {
    // Call the exportBookmarks function
    const result = await new RaindropService().exportBookmarks(exportOptions);
    // The result should contain a URL to the exported file
    exportFilePath = result?.url || '';
  });

  it('should export a file (returns a valid URL)', async () => {
    expect(exportFilePath).toBeTruthy();
    expect(exportFilePath).toMatch(/^https?:\/\//);
  });
});
