# Implementation Plan: Advanced Bookmark Cleanup & Full SDK Conformance

## Phase 1: Foundation & Audit (with Progress)
- [x] Task: Implement Library Audit Tool (3b68575)
    - [x] Write failing tests for library_audit tool
    - [x] Implement library_audit logic using Raindrop search API
    - [x] Integrate MCP Progress reporting for large libraries
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Audit' (Protocol in workflow.md)

## Phase 2: Automated Cleanup (with Elicitation)
- [ ] Task: Implement Trash Cleanup
    - [ ] Write failing tests for empty_trash tool
    - [ ] Implement empty_trash tool (DELETE /raindrops/0)
    - [ ] Integrate MCP Elicitation for user confirmation
- [ ] Task: Implement Collection Cleanup
    - [ ] Write failing tests for remove_empty_collections tool
    - [ ] Implement remove_empty_collections tool (PUT /collections/clean)
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Automated Cleanup' (Protocol in workflow.md)

## Phase 3: Smart Organization (with Sampling)
- [ ] Task: Implement AI Suggestions Tool
    - [ ] Write failing tests for get_suggestions tool
    - [ ] Implement get_suggestions tool (GET /raindrops/suggest)
    - [ ] Integrate MCP Sampling to ask AI for refined filing advice
- [ ] Task: Refine Resource Templates
    - [ ] Formally register bookmark/collection URI templates in manifest
    - [ ] Optimize dynamic resolution logic
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Smart Organization' (Protocol in workflow.md)

## Phase 4: Robustness & Scale (Pagination)
- [ ] Task: Implement Native MCP Pagination
    - [ ] Update RaindropService to support pagination cursors
    - [ ] Update collection_list to support pagination
    - [ ] Update bookmark_search to support pagination
    - [ ] Update listRaindrops to support pagination
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Robustness & Scale' (Protocol in workflow.md)
