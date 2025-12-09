#!/usr/bin/env bun
/**
 * Debug Tag Search Script
 *
 * Purpose: Investigate tag search discrepancies in Raindrop MCP
 *
 * Usage:
 *   bun run scripts/debug-tag-search.ts "@claude"
 *   bun run scripts/debug-tag-search.ts "vacation"
 *
 * What it does:
 * 1. Searches for bookmarks by specified tag using MCP service
 * 2. Fetches full bookmark details for each result
 * 3. Displays actual tags on each bookmark
 * 4. Identifies partial vs exact matches
 * 5. Shows discrepancies between search count and actual matches
 */

import RaindropService from '../src/services/raindrop.service.js';

const RAINDROP_TOKEN = process.env.RAINDROP_ACCESS_TOKEN;

if (!RAINDROP_TOKEN) {
    console.error('❌ Error: RAINDROP_ACCESS_TOKEN environment variable not set');
    console.error('   Export it first: export RAINDROP_ACCESS_TOKEN=your_token_here');
    process.exit(1);
}

const searchTag = process.argv[2];

if (!searchTag) {
    console.error('❌ Error: No tag specified');
    console.error('   Usage: bun run scripts/debug-tag-search.ts "@claude"');
    process.exit(1);
}

console.log('🔍 Raindrop Tag Search Debugger\n');
console.log(`Searching for tag: "${searchTag}"`);
console.log(`Token: ${RAINDROP_TOKEN.substring(0, 10)}...${RAINDROP_TOKEN.substring(RAINDROP_TOKEN.length - 5)}\n`);

const service = new RaindropService(RAINDROP_TOKEN);

async function debugTagSearch() {
    try {
        // Method 1: Search WITHOUT exact match (old behavior - shows API bug)
        console.log('━━━ Method 1: WITHOUT exactTagMatch (shows API full-text search bug) ━━━');
        const result1 = await service.getBookmarks({ tag: searchTag, perPage: 50, exactTagMatch: false });
        console.log(`API reported count: ${result1.count}`);
        console.log(`Items returned: ${result1.items.length}\n`);

        // Method 2: Search WITH exact match (new fix)
        console.log('━━━ Method 2: WITH exactTagMatch=true (client-side filtering) ━━━');
        const result2 = await service.getBookmarks({ tag: searchTag, perPage: 50, exactTagMatch: true });
        console.log(`API reported count (after filtering): ${result2.count}`);
        console.log(`Items returned: ${result2.items.length}\n`);

        // Method 3: Search with 'tags' parameter (array) + exact match
        console.log('━━━ Method 3: Using "tags" parameter (array) + exactTagMatch ━━━');
        const result3 = await service.getBookmarks({ tags: [searchTag], perPage: 50, exactTagMatch: true });
        console.log(`API reported count: ${result3.count}`);
        console.log(`Items returned: ${result3.items.length}\n`);

        // Analyze results from Method 1 (unfixed)
        console.log('━━━ Detailed Analysis (Method 1 - UNFIXED results) ━━━\n');

        const exactMatches: any[] = [];
        const partialMatches: any[] = [];

        for (const bookmark of result1.items) {
            const tags = bookmark.tags || [];
            const hasExactMatch = tags.includes(searchTag);

            if (hasExactMatch) {
                exactMatches.push(bookmark);
            } else {
                // Check for partial matches
                const partialMatch = tags.find((tag: string) =>
                    tag.toLowerCase().includes(searchTag.toLowerCase()) ||
                    searchTag.toLowerCase().includes(tag.toLowerCase())
                );
                if (partialMatch) {
                    partialMatches.push(bookmark);
                }
            }

            const matchType = hasExactMatch ? '✅ EXACT' : '⚠️  PARTIAL';
            console.log(`${matchType} | ID: ${bookmark._id} | "${bookmark.title?.substring(0, 50)}..."`);
            console.log(`         Tags: [${tags.join(', ')}]`);
            console.log();
        }

        // Summary
        console.log('━━━ Summary ━━━');
        console.log(`Total results from API: ${result1.count}`);
        console.log(`Items actually returned: ${result1.items.length}`);
        console.log(`✅ Exact matches: ${exactMatches.length}`);
        console.log(`⚠️  Partial matches: ${partialMatches.length}`);
        console.log(`❓ Neither exact nor partial: ${result1.items.length - exactMatches.length - partialMatches.length}\n`);

        if (result1.count !== exactMatches.length) {
            console.log('⚠️  DISCREPANCY DETECTED!');
            console.log(`   API says ${result1.count} matches, but only ${exactMatches.length} are exact matches.`);
            console.log(`   Possible causes:`);
            console.log(`   • API doing substring/partial matching`);
            console.log(`   • Caching issues`);
            console.log(`   • Tags stored in multiple formats`);
            console.log();
        }

        // Compare Methods - Show the fix working
        console.log('━━━ Fix Verification ━━━');
        console.log(`Method 1 (no filter): ${result1.count} results (includes false positives)`);
        console.log(`Method 2 (with exactTagMatch): ${result2.count} results ✅`);
        console.log(`Method 3 (tags array + exactTagMatch): ${result3.count} results ✅\n`);

        if (result2.count === exactMatches.length && result3.count === exactMatches.length) {
            console.log('✅ FIX WORKING! Exact tag match filtering returns correct count.');
        } else {
            console.log('⚠️  Something unexpected - check filtering logic');
        }
        console.log();

        // Recommendations
        console.log('━━━ Recommendations ━━━');
        if (partialMatches.length > 0) {
            console.log('1. Add client-side filtering for exact tag matches');
            console.log('2. Use post-processing to filter out partial matches');
        }
        if (result1.count !== exactMatches.length) {
            console.log('3. Update MCP tools to validate exact matches');
            console.log('4. Add warning when discrepancy > 5 bookmarks');
        }
        console.log('5. Document this behavior in CLAUDE_USAGE_GUIDE.md');
        console.log();

        // Show exact match IDs for manual verification
        console.log('━━━ Exact Match IDs (for manual verification in Raindrop UI) ━━━');
        exactMatches.forEach(bm => {
            console.log(`• ${bm._id} - ${bm.title}`);
        });

    } catch (error: any) {
        console.error('❌ Error during debug:');
        console.error(error.message);
        if (error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Run the debug
debugTagSearch();
