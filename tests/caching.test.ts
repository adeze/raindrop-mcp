import { describe, expect, it, vi, beforeEach } from "vite-plus/test";
import RaindropService from "../src/services/raindrop.service.js";

// Mock openapi-fetch
vi.mock("openapi-fetch", () => ({
  default: vi.fn(() => ({
    GET: vi.fn().mockResolvedValue({
      data: { items: [{ _id: 1, title: "Test" }], count: 1 },
    }),
    POST: vi.fn(),
    PUT: vi.fn(),
    DELETE: vi.fn(),
    use: vi.fn(),
  })),
}));

describe("RaindropService Caching Logic", () => {
  let service: RaindropService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RaindropService("fake-token");
  });

  it("getCollections should use cache and only call API once", async () => {
    const mockGet = (service as any).client.GET;

    // First call - should call API
    const cols1 = await service.getCollections();
    expect(cols1).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Second call - should return cached value and NOT call API
    const cols2 = await service.getCollections();
    expect(cols2).toHaveLength(1);
    expect(cols2).toEqual(cols1);
    expect(mockGet).toHaveBeenCalledTimes(1); // Still 1
  });

  it("getBookmark should use cache and only call API once", async () => {
    const mockGet = (service as any).client.GET;
    mockGet.mockResolvedValue({
      data: { item: { _id: 123, title: "Bookmark" } },
    });

    // First call
    const b1 = await service.getBookmark(123);
    expect(b1._id).toBe(123);
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Second call
    const b2 = await service.getBookmark(123);
    expect(b2).toEqual(b1);
    expect(mockGet).toHaveBeenCalledTimes(1); // Still 1
  });

  it("getBookmarks should use cache and only call API once for same query", async () => {
    const mockGet = (service as any).client.GET;
    mockGet.mockResolvedValue({ data: { items: [], count: 0 } });

    const params = { search: "test", collection: 123 };

    // First call
    await service.getBookmarks(params);
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Second call with same params
    await service.getBookmarks(params);
    expect(mockGet).toHaveBeenCalledTimes(1); // Still 1

    // Third call with different params
    await service.getBookmarks({ ...params, search: "other" });
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it("modifying collections should clear collection cache", async () => {
    const mockGet = (service as any).client.GET;
    const mockPost = (service as any).client.POST;
    mockPost.mockResolvedValue({ data: { item: { _id: 1, title: "New" } } });

    await service.getCollections();
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Create a collection
    await service.createCollection("New");

    // Should call API again after cache cleared
    await service.getCollections();
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it("modifying a bookmark should clear bookmark and search cache", async () => {
    const mockGet = (service as any).client.GET;
    const mockPut = (service as any).client.PUT;

    mockGet.mockResolvedValue({
      data: { item: { _id: 123, title: "Initial" }, items: [], count: 0 },
    });
    mockPut.mockResolvedValue({
      data: { item: { _id: 123, title: "Updated" } },
    });

    await service.getBookmark(123);
    await service.getBookmarks({ search: "test" });
    expect(mockGet).toHaveBeenCalledTimes(2);

    // Update bookmark
    await service.updateBookmark(123, { title: "Updated" });

    // Should call API again
    await service.getBookmark(123);
    expect(mockGet).toHaveBeenCalledTimes(3);

    await service.getBookmarks({ search: "test" });
    expect(mockGet).toHaveBeenCalledTimes(4);

    const client = (service as any).client;
    client.POST.mockResolvedValue({
      data: { item: { _id: 456, text: "Highlight" } },
    });
    client.PUT.mockResolvedValue({
      data: { item: { _id: 456, text: "Updated" } },
    });
    client.DELETE.mockResolvedValue({ data: { result: true } });
    for (const mutate of [
      () => service.createHighlight(123, { text: "Highlight" }),
      () => service.updateHighlight(456, { text: "Updated" }),
      () => service.deleteHighlight(456),
    ]) {
      await service.getBookmarks({ highlight: true });
      const calls = mockGet.mock.calls.length;
      await mutate();
      await service.getBookmark(123);
      await service.getBookmarks({ highlight: true });
      expect(mockGet).toHaveBeenCalledTimes(calls + 2);
    }
  });

  it("should bypass cache when skipCache is true", async () => {
    const mockGet = (service as any).client.GET;
    mockGet.mockResolvedValue({ data: { items: [], count: 0 } });

    // First call - populates cache
    await service.getCollections();
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Second call with skipCache: true - should bypass cache and call API
    await service.getCollections(true);
    expect(mockGet).toHaveBeenCalledTimes(2);

    // Same for bookmarks
    mockGet.mockResolvedValue({ data: { item: { _id: 123 } } });
    await service.getBookmark(123);
    expect(mockGet).toHaveBeenCalledTimes(3);

    await service.getBookmark(123, true);
    expect(mockGet).toHaveBeenCalledTimes(4);
  });

  it("derives complete collection paths regardless of upstream order", async () => {
    const collections = [
      { _id: 3, title: "Grandchild", parent: { $id: 2 } },
      { _id: 2, title: "Child", parent: { $id: 1 } },
      { _id: 1, title: "Root" },
      { _id: 4, title: "Orphan", parent: { $id: 99 } },
    ];
    const getCollections = vi.spyOn(service, "getCollections");
    for (const items of [collections, [...collections].reverse()]) {
      getCollections.mockResolvedValue(items);
      const tree = await service.getCollectionTree();
      const root = tree.find((node) => node._id === 1)!;
      expect(root.path).toBe("Root");
      expect(root.children[0].path).toBe("Root > Child");
      expect(root.children[0].children[0].path).toBe(
        "Root > Child > Grandchild",
      );
      expect(tree.find((node) => node._id === 4)?.path).toBe("Orphan");
    }
  });

  it("retries transient HTTP failures while preserving permanent HTTP errors", async () => {
    vi.useFakeTimers();
    try {
      for (const status of [400, 403, 422, 501, 408, 500, 502, 503, 504]) {
        const instance = new RaindropService("fake-token");
        const client = (instance as any).client;
        const middleware = client.use.mock.calls[0][0];
        client.GET.mockImplementationOnce(() => {
          middleware.onResponse({ response: new Response(null, { status }) });
        });
        const result = instance.getCollections();
        const transient = [408, 500, 502, 503, 504].includes(status);
        const assertion = transient
          ? expect(result).resolves.toHaveLength(1)
          : expect(result).rejects.toMatchObject({ cause: { status } });
        await vi.runAllTimersAsync();
        await assertion;
        expect(client.GET).toHaveBeenCalledTimes(transient ? 2 : 1);
      }
    } finally {
      vi.useRealTimers();
    }
  });
});
