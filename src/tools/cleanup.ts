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
  handler: async (args: z.infer<typeof LibraryAuditInputSchema>, { raindropService, reportProgress }: ToolHandlerContext) => {
    const progress = typeof reportProgress === 'function' ? reportProgress : () => {};
    
    progress({ progress: 0, total: 100 });
    
    // Step 1: Scan for broken links
    progress({ progress: 10, total: 100 });
    const broken = await raindropService.getBookmarks({ broken: true, perPage: 50 });
    
    // Step 2: Scan for duplicates
    progress({ progress: 40, total: 100 });
    const duplicates = await raindropService.getBookmarks({ duplicates: true, perPage: 50 });

    // Step 3: Scan for untagged items
    progress({ progress: 70, total: 100 });
    const untagged = await raindropService.getBookmarks({ notag: true, perPage: 50 });
    
    progress({ progress: 100, total: 100 });

    const summary = `Audit Results:\n- Broken links: ${broken.count}\n- Potential duplicates: ${duplicates.count}\n- Untagged items: ${untagged.count}`;
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
      if (untagged.items.length > 0) {
        content.push(textContent("\nUntagged Items (First 50):"));
        untagged.items.forEach(item => content.push(makeBookmarkLink(item)));
      }
    }

    return { content };
  }
});

/**
 * Tool to permanently empty the trash.
 */
const emptyTrashTool = defineTool({
  name: "empty_trash",
  description: "Permanently delete all bookmarks currently in the trash collection. Requires 'confirm: true' to execute.",
  inputSchema: z.object({
    confirm: z.boolean().optional().describe("Set to true to actually perform the deletion. If false or omitted, returns counts of items to be deleted."),
  }),
  handler: async (args: { confirm?: boolean }, { raindropService }: ToolHandlerContext) => {
    const stats = await raindropService.getUserStats();
    const trashCount = stats?.trash || 0;

    if (!args.confirm) {
      return {
        content: [textContent(`Trash contains ${trashCount} items. To permanently empty it, call this tool again with 'confirm: true'.`)],
      };
    }

    if (trashCount === 0) {
      return {
        content: [textContent("Trash is already empty.")],
      };
    }

    const success = await raindropService.emptyTrash();
    return {
      content: [textContent(success ? `Successfully emptied trash (${trashCount} items removed).` : "Failed to empty trash.")],
    };
  },
});

/**
 * Tool to remove empty collections.
 */
const cleanupCollectionsTool = defineTool({
  name: "cleanup_collections",
  description: "Remove all collections that do not contain any bookmarks. Requires 'confirm: true' to execute.",
  inputSchema: z.object({
    confirm: z.boolean().optional().describe("Set to true to actually perform the cleanup."),
  }),
  handler: async (args: { confirm?: boolean }, { raindropService }: ToolHandlerContext) => {
    if (!args.confirm) {
      const stats = await raindropService.getUserStats();
      return {
        content: [textContent(`Are you sure you want to remove all empty collections? You currently have ${stats?.collections} total collections. Call this tool again with 'confirm: true' to proceed.`)],
      };
    }

    const success = await raindropService.removeEmptyCollections();
    return {
      content: [textContent(success ? "Empty collections removed successfully." : "Failed to remove empty collections.")],
    };
  },
});

export const cleanupTools = [libraryAuditTool, emptyTrashTool, cleanupCollectionsTool];
