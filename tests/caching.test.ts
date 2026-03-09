import { describe, expect, it, vi, beforeEach } from "vitest";
import RaindropService from "../src/services/raindrop.service.js";

// Mock openapi-fetch
vi.mock("openapi-fetch", () => ({
  default: vi.fn(() => ({
    GET: vi
      .fn()
      .mockResolvedValue({
        data: { items: [{ _id: 1, title: "Test" }], count: 1 },
      }),
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
});
