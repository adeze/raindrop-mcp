import { describe, expect, it, vi, beforeEach } from "vitest";
import RaindropService from "../src/services/raindrop.service.js";

// Mock openapi-fetch
vi.mock("openapi-fetch", () => ({
  default: vi.fn(() => ({
    GET: vi.fn().mockResolvedValue({ data: { items: [], count: 0 } }),
    use: vi.fn(),
  })),
}));

describe("RaindropService.getBookmarks filter mapping", () => {
  let service: RaindropService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RaindropService("fake-token");
  });

  it("maps new filters to search string", async () => {
    const mockGet = (service as any).client.GET;

    await service.getBookmarks({
      createdStart: "2023-01-01",
      createdEnd: "2023-12-31",
      media: "video",
      duplicates: true,
    });

    expect(mockGet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({
          query: expect.objectContaining({
            search: expect.stringContaining("created:>=2023-01-01"),
          }),
        }),
      }),
    );

    const searchString = mockGet.mock.calls[0][1].params.query.search;
    expect(searchString).toContain("created:>=2023-01-01");
    expect(searchString).toContain("created:<=2023-12-31");
    expect(searchString).toContain("type:video");
    expect(searchString).toContain("duplicate:true");
  });
});
