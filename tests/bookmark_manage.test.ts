import { describe, expect, it, vi, beforeEach } from "vitest";
import { bookmarkTools } from "../src/tools/bookmarks.js";
import type { ToolHandlerContext } from "../src/tools/common.js";

// Pull the bookmark_manage handler out of the exported tool list.
const bookmarkManageTool = bookmarkTools.find(
  (t: any) => t.name === "bookmark_manage",
)!;

function makeContext(serviceOverrides: Partial<any> = {}): ToolHandlerContext {
  const raindropService = {
    createBookmark: vi.fn(),
    updateBookmark: vi.fn().mockResolvedValue({ _id: 1 }),
    deleteBookmark: vi.fn().mockResolvedValue(undefined),
    ...serviceOverrides,
  };
  return {
    raindropService: raindropService as any,
    mcpServer: {},
  };
}

describe("bookmark_manage tool — update", () => {
  let ctx: ToolHandlerContext;

  beforeEach(() => {
    ctx = makeContext();
  });

  it("maps collectionId into the nested {collection: {$id}} shape the Raindrop API expects", async () => {
    await (bookmarkManageTool as any).handler(
      {
        operation: "update",
        id: 123,
        url: "https://example.com",
        title: "Example",
        collectionId: 99,
      },
      ctx,
    );

    const updateSpy = (ctx.raindropService as any).updateBookmark;
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const [id, payload] = updateSpy.mock.calls[0];
    expect(id).toBe(123);
    expect(payload.collection).toEqual({ $id: 99 });
  });

  it("omits collection from the payload when collectionId is not provided", async () => {
    await (bookmarkManageTool as any).handler(
      {
        operation: "update",
        id: 123,
        url: "https://example.com",
        title: "Example",
        tags: ["a", "b"],
      },
      ctx,
    );

    const updateSpy = (ctx.raindropService as any).updateBookmark;
    const [, payload] = updateSpy.mock.calls[0];
    expect(payload).not.toHaveProperty("collection");
    expect(payload.tags).toEqual(["a", "b"]);
  });

  it("preserves other fields alongside a collection move", async () => {
    await (bookmarkManageTool as any).handler(
      {
        operation: "update",
        id: 5,
        url: "https://example.com/x",
        title: "New title",
        tags: ["updated"],
        important: true,
        collectionId: 42,
      },
      ctx,
    );

    const updateSpy = (ctx.raindropService as any).updateBookmark;
    const [, payload] = updateSpy.mock.calls[0];
    expect(payload).toMatchObject({
      link: "https://example.com/x",
      title: "New title",
      tags: ["updated"],
      important: true,
      collection: { $id: 42 },
    });
  });
});
