import { beforeEach, describe, expect, it, vi } from "vitest";
import { bookmarkTools } from "../src/tools/bookmarks.js";

describe("bookmark_search tool with new filters", () => {
  let mockService: {
    getBookmarks: ReturnType<typeof vi.fn>;
  };
  const bookmarkSearch = bookmarkTools.find(
    (t) => t.name === "bookmark_search",
  )! as any;

  beforeEach(() => {
    mockService = {
      getBookmarks: vi.fn(),
    };
  });

  it("maps date filters to search query", async () => {
    mockService.getBookmarks.mockResolvedValueOnce({ count: 0, items: [] });

    await bookmarkSearch.handler(
      {
        createdStart: "2023-01-01T00:00:00Z",
        createdEnd: "2023-12-31T23:59:59Z",
      },
      { raindropService: mockService } as any,
    );

    expect(mockService.getBookmarks).toHaveBeenCalledWith(
      expect.objectContaining({
        createdStart: "2023-01-01T00:00:00Z",
        createdEnd: "2023-12-31T23:59:59Z",
      }),
      undefined,
    );
  });

  it("maps media filter to search query", async () => {
    mockService.getBookmarks.mockResolvedValueOnce({ count: 0, items: [] });

    await bookmarkSearch.handler({ media: "image" }, {
      raindropService: mockService,
    } as any);

    expect(mockService.getBookmarks).toHaveBeenCalledWith(
      expect.objectContaining({
        media: "image",
      }),
      undefined,
    );
  });

  it("maps duplicates filter to search query", async () => {
    mockService.getBookmarks.mockResolvedValueOnce({ count: 0, items: [] });

    await bookmarkSearch.handler({ duplicates: true }, {
      raindropService: mockService,
    } as any);

    expect(mockService.getBookmarks).toHaveBeenCalledWith(
      expect.objectContaining({
        duplicates: true,
      }),
      undefined,
    );
  });
});
