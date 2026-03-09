# Implementation Plan: Optimize Duplicate Deletion (Efficient Pattern)

## Phase 1: Research and Integration
- [x] Task: Review current `bulk` and `cleanup` tool implementations in `src/tools/` [checkpoint: a113299]
- [x] Task: Identify the best hook point for the "Efficient Pattern" (either `bulk_edit_raindrops` or a new higher-level function) [checkpoint: a113299]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Research and Integration' (Protocol in workflow.md) [checkpoint: a113299]

## Phase 2: Duplicate Discovery and Batching
- [x] Task: Implement the "Global Search for Count" logic for initial estimation [checkpoint: 328a1fa]
- [x] Task: Implement "Per-Collection Discovery" for duplicates using `collection + duplicate:true` search [checkpoint: 328a1fa]
- [x] Task: Write failing tests for collection-scoped duplicate retrieval [checkpoint: 328a1fa]
- [x] Task: Implement collection-scoped duplicate retrieval logic to pass tests [checkpoint: 328a1fa]
- [x] Task: Conductor - User Manual Verification 'Phase 2: Duplicate Discovery and Batching' (Protocol in workflow.md) [checkpoint: 328a1fa]

## Phase 3: Optimized Bulk Deletion Implementation
- [x] Task: Implement the core loop for iterating through collections and batching removals (50 per page) [checkpoint: 3cb61ac]
- [x] Task: Write failing tests for bulk removal within a single collection context [checkpoint: 3cb61ac]
- [x] Task: Implement bulk removal logic using `bulk_edit_raindrops` (operation: "remove") to pass tests [checkpoint: 3cb61ac]
- [x] Task: Conductor - User Manual Verification 'Phase 3: Optimized Bulk Deletion Implementation' (Protocol in workflow.md) [checkpoint: 3cb61ac]

## Phase 4: Supporting Logic (Dry Run, Fail Fast, Output Format)
- [x] Task: Implement `dryRun` flag support to report counts without execution [checkpoint: 3cb61ac]
- [x] Task: Implement `Fail Fast` error policy for `bulk_edit` failures [checkpoint: 3cb61ac]
- [x] Task: Implement the minimal "Output Format" (Action, Count, Errors only) [checkpoint: 3cb61ac]
- [x] Task: Write integration tests covering all support flags and the final reported format [checkpoint: 3cb61ac]
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Supporting Logic (Dry Run, Fail Fast, Output Format)' (Protocol in workflow.md)
