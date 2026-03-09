import { describe, expect, it, vi, beforeEach } from "vitest";
import { suggestionTools } from "../src/tools/suggestions.js";

describe("suggest_tags tool", () => {
  let mockContext: any;
  const suggestTags = suggestionTools.find(
    (t) => t.name === "suggest_tags",
  )! as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      mcpReq: {
        requestSampling: vi.fn(),
      },
    };
  });

  it("calls requestSampling with bookmark metadata", async () => {
    mockContext.mcpReq.requestSampling.mockResolvedValueOnce({
      content: { type: "text", text: "ai, technology, software" },
    });

    const result = await suggestTags.handler(
      {
        url: "https://example.com",
        title: "Example Title",
        description: "An example description",
      },
      mockContext,
    );

    expect(mockContext.mcpReq.requestSampling).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.objectContaining({
              text: expect.stringContaining("Example Title"),
            }),
          }),
        ]),
      }),
    );

    const firstContent = result.content[0] as { type: "text"; text: string };
    expect(firstContent.text).toContain("ai, technology, software");
  });

  it("handles case where AI Sampling is not supported", async () => {
    const result = await suggestTags.handler(
      { url: "https://example.com", title: "Example" },
      { raindropService: {} } as any,
    );

    const firstContent = result.content[0] as { type: "text"; text: string };
    expect(firstContent.text).toContain("AI Sampling is not supported");
  });

  it("handles requestSampling errors gracefully", async () => {
    mockContext.mcpReq.requestSampling.mockRejectedValueOnce(
      new Error("Sampling failed"),
    );

    const result = await suggestTags.handler(
      { url: "https://example.com", title: "Example" },
      mockContext,
    );

    const firstContent = result.content[0] as { type: "text"; text: string };
    expect(firstContent.text).toContain(
      "Failed to get tag suggestions: Sampling failed",
    );
  });
});
