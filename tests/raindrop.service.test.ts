import { config } from "dotenv";
import { beforeEach, describe, expect, it } from "vitest";
import RaindropService from "../src/services/raindrop.service.js";
import type { components } from "../src/types/raindrop.schema.js";
type _Collection = components["schemas"]["Collection"];
type _Bookmark = components["schemas"]["Bookmark"];
type _Highlight = components["schemas"]["Highlight"];
type _Tag = components["schemas"]["Tag"];
config();

// Test constants for known collection and raindrop IDs (populate these as needed)
const _TEST_COLLECTION_ID = 55725911; // <-- set your known collection ID here
const TEST_RAINDROP_ID = 1286757883; // <-- set your known raindrop/bookmark ID here

describe("RaindropService Read-Only API Integration", () => {
  let service: RaindropService;

  beforeEach(() => {
    service = new RaindropService();
  });

  it("fetches user info", async () => {
    const user = await service.getUserInfo();
    expect(user).toBeDefined();
    expect(user).toHaveProperty("email");
  });

  it("fetches user stats", async () => {
    const stats = await service.getUserStats();
    expect(stats).toBeDefined();
    if (stats) {
      expect(stats.bookmarks).toBeDefined();
      expect(stats.collections).toBeDefined();
      console.log("Stats from service:", stats);
    }
  });

  it("fetches highlights for a specific bookmark (may return empty or 404)", async () => {
    try {
      const highlights = await service.getHighlights(TEST_RAINDROP_ID);
      expect(Array.isArray(highlights)).toBe(true);
    } catch (error: any) {
      // 404 is acceptable if the bookmark has no highlights or doesn't exist
      expect(error.code).toBe("NOT_FOUND");
    }
  });

  it("fetches all highlights", async () => {
    const highlights = await service.getAllHighlights();
    expect(Array.isArray(highlights)).toBe(true);
  });

  it("handles error for invalid bookmark id in getHighlights", async () => {
    await expect(service.getHighlights(-1)).rejects.toThrow();
  });
});
