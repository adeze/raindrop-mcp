# Implementation Plan: Advanced Bookmark Cleanup & Full SDK Conformance

## Phase 1: Foundation & Audit (Refinements & Progress)
- [x] Task: Implement Library Audit Tool (3b68575)
- [ ] Task: Enhance Diagnostics Tool
    - [ ] Write tests for health stats in diagnostics
    - [ ] Update diagnostics tool to include total bookmarks, broken links, and duplicate counts from Raindrop API
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Audit' (Protocol in workflow.md)

## Phase 2: Automated Cleanup (Elicitation & Progress)
- [ ] Task: Implement Trash Cleanup
    - [ ] Write failing tests for empty_trash tool
    - [ ] Implement empty_trash tool (DELETE /raindrops/0)
    - [ ] Integrate MCP Elicitation for user confirmation
- [ ] Task: Implement Collection Cleanup
    - [ ] Write failing tests for remove_empty_collections tool
    - [ ] Implement remove_empty_collections tool (PUT /collections/clean)
- [ ] Task: Enhance Bulk Edit Tool
    - [ ] Integrate MCP Progress reporting into bulk_edit_raindrops
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Automated Cleanup' (Protocol in workflow.md)

## Phase 3: Smart Organization (Sampling & Templates)
- [ ] Task: Implement AI Suggestions Tool
    - [ ] Write failing tests for get_suggestions tool
    - [ ] Implement get_suggestions tool (GET /raindrops/suggest)
    - [ ] Integrate MCP Sampling to ask AI for refined filing advice
- [ ] Task: Refine Resource Templates
    - [ ] Formally register bookmark/collection URI templates in manifest
    - [ ] Optimize dynamic resolution logic
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Smart Organization' (Protocol in workflow.md)

## Phase 4: Robustness & Scale (Pagination & Roots)
- [ ] Task: Implement Native MCP Pagination
    - [ ] Update RaindropService to support pagination cursors
    - [ ] Update collection_list, bookmark_search, and listRaindrops to support pagination
- [ ] Task: Implement Roots Capability
    - [ ] Register `roots` capability in server initialization
    - [ ] Add handler for `listRoots` to expose local context
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Robustness & Scale' (Protocol in workflow.md)
