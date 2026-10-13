import { config } from "dotenv";
import { afterEach, describe, expect, it } from "vite-plus/test";
import RaindropService from "../src/services/raindrop.service.js";

config();

const runDestructiveLiveTest =
  Boolean(process.env.RAINDROP_ACCESS_TOKEN?.trim()) &&
  process.env.RUN_DESTRUCTIVE_LIVE_TESTS === "true" &&
  process.env.CONFIRM_DESTRUCTIVE_LIVE_TESTS === "DELETE_ONLY_TEST_BOOKMARKS";
const describeDestructive = runDestructiveLiveTest ? describe : describe.skip;

describeDestructive("RaindropService destructive live integration", () => {
  const service = new RaindropService();
  let createdBookmarkId: number | undefined;

  const permanentlyDeleteTestBookmark = async () => {
    if (!createdBookmarkId) return;

    try {
      // First delete moves the bookmark to Trash; second delete permanently removes it.
      await service.deleteBookmark(createdBookmarkId);
      await service.deleteBookmark(createdBookmarkId);
    } catch {
      // Cleanup is best-effort: the assertion below reports an unexpected survivor.
    }
  };

  afterEach(async () => {
    await permanentlyDeleteTestBookmark();
  });

  it("creates, retrieves, and permanently removes only its own bookmark", async () => {
    const nonce = crypto.randomUUID();
    const url = `https://github.com/adeze/raindrop-mcp?e2e=${nonce}`;
    const bookmark = await service.createBookmark(0, {
      link: url,
      title: `raindrop-mcp destructive E2E ${nonce}`,
      tags: ["raindrop-mcp-e2e"],
    });
    createdBookmarkId = bookmark._id;

    expect(createdBookmarkId).toEqual(expect.any(Number));
    const retrieved = await service.getBookmark(createdBookmarkId, true);
    expect(retrieved._id).toBe(createdBookmarkId);
    expect(retrieved.link).toBe(url);

    await permanentlyDeleteTestBookmark();
    await expect(
      service.getBookmark(createdBookmarkId, true),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    createdBookmarkId = undefined;
  }, 30_000);
});
