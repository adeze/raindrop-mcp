import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanupTools } from "../src/tools/cleanup.js";
import RaindropService from "../src/services/raindrop.service.js";

// Mock RaindropService
vi.mock("../src/services/raindrop.service.js");

describe("remove_duplicates tool", () => {
  let mockService: any;
  const removeDuplicates = cleanupTools.find(
    (t) => t.name === "remove_duplicates",
  )!;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = new RaindropService() as any;
  });

  it("returns 'No duplicates found' if global count is 0", async () => {
    mockService.getBookmarks.mockResolvedValueOnce({ count: 0, items: [] });

    const result = await removeDuplicates.handler({ dryRun: true }, {
      raindropService: mockService,
    } as any);

    const firstContent = result.content[0] as { type: "text"; text: string };
    expect(firstContent.text).toContain("No duplicates found");
    expect(mockService.getBookmarks).toHaveBeenCalledWith(
      expect.objectContaining({ duplicates: true, perPage: 1 }),
    );
  });

  it("performs dry run and reports counts per collection", async () => {
    // 1. Global search
    mockService.getBookmarks.mockResolvedValueOnce({ count: 2, items: [] });
    // 2. Get collections
    mockService.getCollections.mockResolvedValueOnce([
      { _id: 123, title: "Test Collection" },
    ]);
    // 3. Per-collection search (Unsorted)
    mockService.getBookmarks.mockResolvedValueOnce({ count: 0, items: [] });
    // 4. Per-collection search (Test Collection)
    mockService.getBookmarks.mockResolvedValueOnce({
      count: 2,
      items: [{ _id: 1 }, { _id: 2 }],
    });

    const result = await removeDuplicates.handler({ dryRun: true }, {
      raindropService: mockService,
    } as any);

    const firstContent = result.content[0] as { type: "text"; text: string };
    expect(firstContent.text).toContain("Dry Run: Found 2 duplicates");
    expect(firstContent.text).toContain("Test Collection: 2 duplicates");
    expect(mockService.batchDeleteBookmarksInCollection).not.toHaveBeenCalled();
  });

  it("deletes duplicates in batches of 50 and handles Fail Fast", async () => {
    // 1. Global search
    mockService.getBookmarks.mockResolvedValueOnce({ count: 1, items: [] });
    // 2. Get collections
    mockService.getCollections.mockResolvedValueOnce([
      { _id: 123, title: "Test Collection" },
    ]);
    // 3. Per-collection search (Unsorted)
    mockService.getBookmarks.mockResolvedValueOnce({ count: 0, items: [] });
    // 4. Per-collection search (Test Collection)
    mockService.getBookmarks.mockResolvedValueOnce({
      count: 1,
      items: [{ _id: 99 }],
    });
    // 5. Batch delete (fails)
    mockService.batchDeleteBookmarksInCollection.mockResolvedValueOnce(false);

    const result = await removeDuplicates.handler({ dryRun: false }, {
      raindropService: mockService,
    } as any);

    const firstContent = result.content[0] as { type: "text"; text: string };
    expect(firstContent.text).toContain("Fail Fast: Stopped after error");
    expect(mockService.batchDeleteBookmarksInCollection).toHaveBeenCalledWith(
      123,
      [99],
    );
  });

  it("successfully deletes duplicates across multiple collections", async () => {
    // 1. Global search
    mockService.getBookmarks.mockResolvedValueOnce({ count: 2, items: [] });
    // 2. Get collections
    mockService.getCollections.mockResolvedValueOnce([
      { _id: 123, title: "Col A" },
      { _id: 456, title: "Col B" },
    ]);
    // 3. Unsorted
    mockService.getBookmarks.mockResolvedValueOnce({ count: 0, items: [] });
    // 4. Col A
    mockService.getBookmarks.mockResolvedValueOnce({
      count: 1,
      items: [{ _id: 1 }],
    });
    // 5. Col B
    mockService.getBookmarks.mockResolvedValueOnce({
      count: 1,
      items: [{ _id: 2 }],
    });
    // 6. Delete A
    mockService.batchDeleteBookmarksInCollection.mockResolvedValueOnce(true);
    // 7. Delete B
    mockService.batchDeleteBookmarksInCollection.mockResolvedValueOnce(true);

    const result = await removeDuplicates.handler({ dryRun: false }, {
      raindropService: mockService,
    } as any);

    const firstContent = result.content[0] as { type: "text"; text: string };
    expect(firstContent.text).toContain("Successfully deleted 2 duplicates");
    expect(mockService.batchDeleteBookmarksInCollection).toHaveBeenCalledTimes(
      2,
    );
  });

  it("batches deletions in groups of 50", async () => {
    const manyIds = Array.from({ length: 120 }, (_, i) => i + 1);
    const manyItems = manyIds.map((id) => ({ _id: id }));
    // 1. Global search
    mockService.getBookmarks.mockResolvedValueOnce({ count: 120, items: [] });
    // 2. Get collections
    mockService.getCollections.mockResolvedValueOnce([
      { _id: 123, title: "Test" },
    ]);
    // 3. Unsorted
    mockService.getBookmarks.mockResolvedValueOnce({ count: 0, items: [] });
    // 4. Test Collection (Discovery)
    mockService.getBookmarks.mockResolvedValueOnce({
      count: 120,
      items: manyItems.slice(0, 50),
    });
    mockService.getBookmarks.mockResolvedValueOnce({
      count: 120,
      items: manyItems.slice(50, 100),
    });
    mockService.getBookmarks.mockResolvedValueOnce({
      count: 120,
      items: manyItems.slice(100, 120),
    });
    // 5. Deletions (3 batches: 50, 50, 20)
    mockService.batchDeleteBookmarksInCollection.mockResolvedValue(true);

    const result = await removeDuplicates.handler({ dryRun: false }, {
      raindropService: mockService,
    } as any);

    const firstContent = result.content[0] as { type: "text"; text: string };
    expect(firstContent.text).toContain("Successfully deleted 120 duplicates");
    expect(mockService.batchDeleteBookmarksInCollection).toHaveBeenCalledTimes(
      3,
    );
    expect(
      mockService.batchDeleteBookmarksInCollection,
    ).toHaveBeenNthCalledWith(1, 123, manyIds.slice(0, 50));
    expect(
      mockService.batchDeleteBookmarksInCollection,
    ).toHaveBeenNthCalledWith(2, 123, manyIds.slice(50, 100));
    expect(
      mockService.batchDeleteBookmarksInCollection,
    ).toHaveBeenNthCalledWith(3, 123, manyIds.slice(100, 120));
  });
});
