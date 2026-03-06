# Implementation Plan: Advanced Bookmark Cleanup & SDK Enhancements

## Phase 1: Foundation & Audit (with Progress)
- [ ] Task: Implement Library Audit Tool
    - [ ] Write failing tests for library_audit tool (broken/duplicate detection)
    - [ ] Implement library_audit logic using Raindrop search API
    - [ ] Integrate MCP Progress reporting for large libraries
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Audit' (Protocol in workflow.md)

## Phase 2: Automated Cleanup (with Elicitation)
- [ ] Task: Implement Trash Cleanup
    - [ ] Write failing tests for empty_trash tool
    - [ ] Implement empty_trash tool (DELETE /raindrops/0)
    - [ ] Integrate MCP Elicitation for user confirmation before deletion
- [ ] Task: Implement Collection Cleanup
    - [ ] Write failing tests for remove_empty_collections tool
    - [ ] Implement remove_empty_collections tool (PUT /collections/clean)
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Automated Cleanup' (Protocol in workflow.md)

## Phase 3: Smart Organization & SDK Polish
- [ ] Task: Implement AI Suggestions Tool
    - [ ] Write failing tests for get_suggestions tool
    - [ ] Implement get_suggestions tool (GET /raindrops/suggest)
- [ ] Task: Refine Resource Templates
    - [ ] Formally register bookmark/collection URI templates in listResources
    - [ ] Ensure dynamic resolution is optimized
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Smart Organization' (Protocol in workflow.md)
