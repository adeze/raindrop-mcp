import { z } from "zod";
import type { ToolHandlerContext } from "./common.js";
import { defineTool, textContent, makeBookmarkLink } from "./common.js";

const LibraryAuditInputSchema = z.object({
  details: z.boolean().optional().describe("Include links to the identified bookmarks"),
});

/**
 * Tool to scan the entire library for broken links and duplicates.
 */
const libraryAuditTool = defineTool({
  name: "library_audit",
  description: "Scans the entire library for broken links and duplicate bookmarks.",
  inputSchema: LibraryAuditInputSchema,
  handler: async (args, { raindropService, reportProgress }: ToolHandlerContext) => {
    const progress = typeof reportProgress === 'function' ? reportProgress : () => {};
    
    progress({ progress: 0, total: 100 });
    
    // Step 1: Scan for broken links
    progress({ progress: 10, total: 100 });
    const broken = await raindropService.getBookmarks({ broken: true, perPage: 50 });
    
    // Step 2: Scan for duplicates
    progress({ progress: 50, total: 100 });
    const duplicates = await raindropService.getBookmarks({ duplicates: true, perPage: 50 });
    
    progress({ progress: 100, total: 100 });

    const summary = `Audit Results:\n- Broken links: ${broken.count}\n- Potential duplicates: ${duplicates.count}`;
    const content = [textContent(summary)];

    if (args.details) {
      if (broken.items.length > 0) {
        content.push(textContent("\nBroken Links (First 50):"));
        broken.items.forEach(item => content.push(makeBookmarkLink(item)));
      }
      if (duplicates.items.length > 0) {
        content.push(textContent("\nPotential Duplicates (First 50):"));
        duplicates.items.forEach(item => content.push(makeBookmarkLink(item)));
      }
    }

    return { content };
  }
});

export const cleanupTools = [libraryAuditTool];
