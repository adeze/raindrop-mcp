# Implementation Plan: In-Memory Caching Strategy (Keyv)

## Phase 1: Setup and Integration

- [ ] Task: Install `keyv` and `@keyv/memory` packages.
- [ ] Task: Initialize `Keyv` instances in `RaindropService` for Collections, Bookmarks, and Search.
- [ ] Task: Write failing unit tests for basic cache `set` and `get` operations within the service.
- [ ] Task: Implement basic cache setup to pass the tests.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Setup and Integration' (Protocol in workflow.md)

## Phase 2: Implementation for Collections and Bookmarks

- [ ] Task: Integrate caching into `getCollections()` with a 1-hour TTL.
- [ ] Task: Integrate caching into `getBookmark()` with a 15-minute TTL.
- [ ] Task: Write failing tests for cache hits and TTL expiration for these methods.
- [ ] Task: Implement the cache logic to pass tests.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Implementation for Collections and Bookmarks' (Protocol in workflow.md)

## Phase 3: Search Caching and Invalidation

- [ ] Task: Integrate caching into `getBookmarks()` (search) using hashed query parameters as keys. TTL: 5 minutes.
- [ ] Task: Implement cache invalidation logic in `createCollection`, `updateCollection`, `deleteCollection`.
- [ ] Task: Implement cache invalidation logic in `updateBookmark`, `deleteBookmark`.
- [ ] Task: Write failing tests for automatic cache clearing after modifications.
- [ ] Task: Implement the invalidation logic to pass tests.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Search Caching and Invalidation' (Protocol in workflow.md)

## Phase 4: Supporting Features and Observability

- [ ] Task: Add `skipCache` parameter to relevant tools (bookmarks, collections, search).
- [ ] Task: Add debug logging for cache HIT/MISS/INVALIDATE events.
- [ ] Task: Write integration tests covering the `skipCache` bypass and final observability logs.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Supporting Features and Observability' (Protocol in workflow.md)
