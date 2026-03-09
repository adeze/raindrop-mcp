# Specification: Optimize Duplicate Deletion (Efficient Pattern)

## Overview

This track implements the "Efficient Duplicate Deletion Pattern" to minimize round-trips and handle Raindrop API constraints (specifically that `bulk_edit` requires all IDs to belong to the same `collectionId`).

## Functional Requirements

1.  **Duplicate Discovery**:
    - Perform a global search (`duplicate:true`) to get the total count of duplicate bookmarks for reporting and `dryRun` purposes.
    - Process duplicates per-collection by iterating through all user collections.
    - Search for `duplicate:true` scoped to each specific `collectionId`.
2.  **Bulk Deletion**:
    - For each collection found to have duplicates, use the `bulk_edit_raindrops` tool with `operation: "remove"` and the specific `collectionId`.
    - Batch IDs in groups of 50 (the API max per page).
3.  **Dry Run**:
    - Support a `dryRun` flag. If `true`, the tool should report the number of duplicates found per collection without performing deletions.
4.  **Error Handling**:
    - **Fail Fast**: If a `bulk_edit` call fails for a collection, stop the process immediately and report the error along with the work completed so far.
5.  **Output Format**:
    - Report: Action taken, Count of items affected, and any specific errors with `collectionId` and failed IDs.
    - Do NOT return full bookmark objects.

## Non-Functional Requirements

- **Token Efficiency**: Minimize API calls. Do not re-fetch data already in context.
- **Performance**: Use parallel processing where possible if it doesn't violate rate limits (though the pattern suggests sequential collection processing for safety).
- **Testability**: Write tests to verify `bulk_edit` success by ensuring all IDs belong to the `collectionId`.

## Acceptance Criteria

- [ ] Tool correctly identifies duplicates across multiple collections.
- [ ] Tool successfully deletes duplicates using the efficient per-collection bulk pattern.
- [ ] `dryRun` mode correctly reports counts without modifying data.
- [ ] Tool handles the `Fail Fast` policy correctly on API errors.
- [ ] Tool follows the requested "Token-Efficient Patterns" and output format.

## Out of Scope

- Automatic resolution of which duplicate version to keep.
- Moving duplicates to a staging collection (explicitly forbidden by the pattern).
