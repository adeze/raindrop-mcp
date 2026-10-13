import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { RaindropMCPService } from "../src/services/raindropmcp.service.js";

describe("Destructive Cleanup Tools Confirmation", () => {
  let mcpService: RaindropMCPService;

  beforeEach(() => {
    mcpService = new RaindropMCPService();
    vi.spyOn(mcpService.raindropService, "getUserStats").mockResolvedValue({
      bookmarks: 10,
      collections: 3,
      highlights: 0,
      tags: 2,
      trash: 4,
    });
    vi.spyOn(mcpService.raindropService, "emptyTrash").mockResolvedValue(true);
    vi.spyOn(
      mcpService.raindropService,
      "removeEmptyCollections",
    ).mockResolvedValue(true);
  });

  describe("empty_trash", () => {
    it("should request confirmation when confirm is false", async () => {
      const result = await mcpService.callTool("empty_trash", {
        confirm: false,
      });
      expect(result.content[0].text).toContain(
        "To permanently empty it, call this tool again with 'confirm: true'",
      );
      expect(mcpService.raindropService.emptyTrash).not.toHaveBeenCalled();
    });

    it("should request confirmation when confirm is omitted", async () => {
      const result = await mcpService.callTool("empty_trash", {});
      expect(result.content[0].text).toContain(
        "To permanently empty it, call this tool again with 'confirm: true'",
      );
      expect(mcpService.raindropService.emptyTrash).not.toHaveBeenCalled();
    });
  });

  describe("cleanup_collections", () => {
    it("should request confirmation when confirm is false", async () => {
      const result = await mcpService.callTool("cleanup_collections", {
        confirm: false,
      });
      expect(result.content[0].text).toContain(
        "Call this tool again with 'confirm: true' to proceed",
      );
      expect(
        mcpService.raindropService.removeEmptyCollections,
      ).not.toHaveBeenCalled();
    });

    it("should request confirmation when confirm is omitted", async () => {
      const result = await mcpService.callTool("cleanup_collections", {});
      expect(result.content[0].text).toContain(
        "Call this tool again with 'confirm: true' to proceed",
      );
      expect(
        mcpService.raindropService.removeEmptyCollections,
      ).not.toHaveBeenCalled();
    });
  });
});
