# Implementation Plan: Optimize Duplicate Deletion (Efficient Pattern)

## Phase 1: Research and Integration
- [x] Task: Review current `bulk` and `cleanup` tool implementations in `src/tools/` [checkpoint: a113299]
- [x] Task: Identify the best hook point for the "Efficient Pattern" (either `bulk_edit_raindrops` or a new higher-level function) [checkpoint: a113299]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Research and Integration' (Protocol in workflow.md) [checkpoint: a113299]

## Phase 2: Duplicate Discovery and Batching
- [x] Task: Implement the "Global Search for Count" logic for initial estimation [checkpoint: 0ced4f3]
- [x] Task: Implement "Per-Collection Discovery" for duplicates using `collection + duplicate:true` search [checkpoint: 0ced4f3]
- [x] Task: Write failing tests for collection-scoped duplicate retrieval [checkpoint: 0ced4f3]
- [x] Task: Implement collection-scoped duplicate retrieval logic to pass tests [checkpoint: 0ced4f3]
- [x] Task: Conductor - User Manual Verification 'Phase 2: Duplicate Discovery and Batching' (Protocol in workflow.md) [checkpoint: 0ced4f3]

## Phase 3: Optimized Bulk Deletion Implementation
- [ ] Task: Implement the core loop for iterating through collections and batching removals (50 per page)
- [ ] Task: Write failing tests for bulk removal within a single collection context
- [ ] Task: Implement bulk removal logic using `bulk_edit_raindrops` (operation: "remove") to pass tests
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Optimized Bulk Deletion Implementation' (Protocol in workflow.md)

## Phase 4: Supporting Logic (Dry Run, Fail Fast, Output Format)
- [ ] Task: Implement `dryRun` flag support to report counts without execution
- [ ] Task: Implement `Fail Fast` error policy for `bulk_edit` failures
- [ ] Task: Implement the minimal "Output Format" (Action, Count, Errors only)
- [ ] Task: Write integration tests covering all support flags and the final reported format
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Supporting Logic (Dry Run, Fail Fast, Output Format)' (Protocol in workflow.md)
