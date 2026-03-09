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

/**
 * Tool to remove duplicate bookmarks using an optimized pattern.
 */
const removeDuplicatesTool = defineTool({
  name: "remove_duplicates",
  description: "Optimized duplicate deletion pattern. Scans all collections and removes duplicates in batches of 50 to minimize round-trips. Supports dry run to report counts without deleting.",
  inputSchema: z.object({
    dryRun: z.boolean().optional().default(true).describe("If true, only reports the number of duplicates found without deleting them."),
  }),
  handler: async (args: { dryRun?: boolean }, { raindropService, reportProgress }: ToolHandlerContext) => {
    const progress = typeof reportProgress === 'function' ? reportProgress : () => {};
    progress({ progress: 0, total: 100 });

    // Step 1: Global Search for Count (Initial Estimation)
    const globalDuplicates = await raindropService.getBookmarks({ duplicates: true, perPage: 1 });
    const totalEstimated = globalDuplicates.count;

    if (totalEstimated === 0) {
      return {
        content: [textContent("No duplicates found in the entire library.")],
      };
    }

    // Step 2: Per-Collection Discovery
    const collections = await raindropService.getCollections();
    const collectionDuplicatesMap = new Map<number, number[]>();
    let totalFound = 0;

    // Add "Unsorted" (0) and "Trash" (-99) if needed, but getCollections usually returns user collections
    // The pattern says "Iterate through all user collections"
    const allCollectionIds = [0, ...collections.map(c => c._id).filter((id): id is number => id !== undefined)];

    for (let i = 0; i < allCollectionIds.length; i++) {
      const colId = allCollectionIds[i];
      if (colId === undefined) continue; // Should not happen with filter
      progress({ progress: 10 + (i / allCollectionIds.length) * 40, total: 100 });
      
      const colDuplicates = await raindropService.getBookmarks({ 
        collection: colId, 
        duplicates: true,
        perPage: 50 // Get first batch to see if any exist
      });

      if (colDuplicates.count > 0) {
        // Fetch all duplicate IDs for this collection if more than one page
        let allIds = colDuplicates.items.map(item => item._id).filter((id): id is number => id !== undefined);
        if (colDuplicates.count > 50) {
          const totalPages = Math.ceil(colDuplicates.count / 50);
          for (let p = 1; p < totalPages; p++) {
            const nextBatch = await raindropService.getBookmarks({
              collection: colId,
              duplicates: true,
              perPage: 50,
              page: p
            });
            allIds = allIds.concat(nextBatch.items.map(item => item._id).filter((id): id is number => id !== undefined));
          }
        }
        collectionDuplicatesMap.set(colId, allIds);
        totalFound += allIds.length;
      }
    }

    if (totalFound === 0) {
      return {
        content: [textContent(`Global search estimated ${totalEstimated} duplicates, but per-collection scan found none. This may be due to cross-collection duplicates which cannot be safely bulk-deleted.`)],
      };
    }

    if (args.dryRun) {
      let report = `Dry Run: Found ${totalFound} duplicates across ${collectionDuplicatesMap.size} collections.\n`;
      collectionDuplicatesMap.forEach((ids, colId) => {
        const colName = colId === 0 ? "Unsorted" : (collections.find(c => c._id === colId)?.title || `ID: ${colId}`);
        report += `- ${colName}: ${ids.length} duplicates\n`;
      });
      report += "\nTo delete these items, call this tool again with 'dryRun: false'.";
      return { content: [textContent(report)] };
    }

    // Step 3: Optimized Bulk Deletion
    let totalDeleted = 0;
    const errors: { collectionId: number; ids: number[]; message: string }[] = [];

    const collectionEntries = Array.from(collectionDuplicatesMap.entries());
    for (let i = 0; i < collectionEntries.length; i++) {
      const entry = collectionEntries[i];
      if (!entry) continue;
      const [colId, ids] = entry;
      progress({ progress: 50 + (i / collectionEntries.length) * 50, total: 100 });

      // Batch in groups of 50
      for (let j = 0; j < ids.length; j += 50) {
        const batch = ids.slice(j, j + 50);
        try {
          const success = await raindropService.batchDeleteBookmarksInCollection(colId, batch);
          if (success) {
            totalDeleted += batch.length;
          } else {
            errors.push({ collectionId: colId, ids: batch, message: "API returned failure" });
            // Fail Fast policy
            return {
              content: [textContent(`Fail Fast: Stopped after error in collection ${colId}. Total deleted so far: ${totalDeleted}.\nErrors: ${JSON.stringify(errors)}`)]
            };
          }
        } catch (error: any) {
          errors.push({ collectionId: colId, ids: batch, message: error.message });
          // Fail Fast policy
          return {
            content: [textContent(`Fail Fast: Stopped after exception in collection ${colId}: ${error.message}. Total deleted so far: ${totalDeleted}.\nErrors: ${JSON.stringify(errors)}`)]
          };
        }
      }
    }

    return {
      content: [textContent(`Successfully deleted ${totalDeleted} duplicates across ${collectionDuplicatesMap.size} collections.`)]
    };
  }
});

export const cleanupTools = [libraryAuditTool, emptyTrashTool, cleanupCollectionsTool, removeDuplicatesTool];
