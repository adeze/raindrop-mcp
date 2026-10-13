import { afterEach, expect, it, vi } from "vite-plus/test";
import RaindropService from "../src/services/raindrop.service.js";
import { RaindropMCPService } from "../src/services/raindropmcp.service.js";

afterEach(() => vi.unstubAllGlobals());

it("uses collection-scoped requests, server-side tag filters and move payloads", async () => {
  const requests: Request[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      requests.push(request);
      return Response.json({
        result: true,
        items: [],
        count: 0,
        item: {
          _id: 1,
          title: "Bookmark",
          link: "https://example.com",
          tags: [],
        },
      });
    }),
  );
  const service = new RaindropService("offline-test");
  await service.getBookmarks(
    { collection: 7, tag: "coffee beans", tags: ['a"b'], important: false },
    true,
  );
  const search = new URL(requests.at(-1)!.url);
  expect(search.pathname).toBe("/rest/v1/raindrops/7");
  expect(search.searchParams.get("search")).toBe(
    '#"a\\\"b" #"coffee beans" -important:true',
  );
  expect(search.searchParams.has("tag")).toBe(false);
  await service.batchUpdateBookmarks([1], { collection: -1 }, 7);
  expect(new URL(requests.at(-1)!.url).pathname).toBe("/rest/v1/raindrops/7");
  expect(await requests.at(-1)!.clone().json()).toEqual({
    ids: [1],
    collection: { $id: -1 },
  });
  await service.batchDeleteBookmarksInCollection(7, [1]);
  expect(requests.at(-1)!.method).toBe("DELETE");
  expect(new URL(requests.at(-1)!.url).pathname).toBe("/rest/v1/raindrops/7");
  await service.getTagsByCollection(7);
  expect(new URL(requests.at(-1)!.url).pathname).toBe("/rest/v1/tags/7");
  const calls = requests.length;
  await expect(
    service.batchUpdateBookmarks([1], { collection: 8 }, 0),
  ).rejects.toThrow("Collection 0");
  await expect(
    service.batchDeleteBookmarksInCollection(0, [1]),
  ).rejects.toThrow("Collection 0");
  expect(requests).toHaveLength(calls);
  const mcp = new RaindropMCPService();
  mcp.raindropService = service;
  await mcp.callTool("bookmark_manage", {
    operation: "update",
    id: 1,
    collectionId: 8,
  });
  expect(await requests.at(-1)!.clone().json()).toEqual({
    collection: { $id: 8 },
  });
});

it("requires explicit confirmation on every direct delete/remove tool", async () => {
  const mcp = new RaindropMCPService();
  const methods = [
    "deleteBookmark",
    "deleteCollection",
    "deleteTags",
    "deleteHighlight",
    "batchDeleteBookmarksInCollection",
  ] as const;
  const spies = methods.map((method) =>
    vi.spyOn(mcp.raindropService, method).mockResolvedValue(true as never),
  );
  for (const [tool, args] of [
    ["bookmark_manage", { operation: "delete", id: 1 }],
    ["collection_manage", { operation: "delete", id: 1 }],
    ["tag_manage", { operation: "delete", collectionId: 7, tagNames: ["tag"] }],
    [
      "highlight_manage",
      { operation: "delete", id: 1, bookmarkId: 1, text: "highlight" },
    ],
    ["bulk_edit_raindrops", { operation: "remove", collectionId: 7, ids: [1] }],
  ] as const) {
    for (const confirm of [undefined, false]) {
      await expect(mcp.callTool(tool, { ...args, confirm })).rejects.toThrow(
        "confirm: true",
      );
    }
    expect(spies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    await mcp.callTool(tool, { ...args, confirm: true });
    spies.forEach((spy) => spy.mockClear());
  }
});
