# Specification: In-Memory Caching Strategy (Keyv)

## Overview

This track implements a systematic in-memory caching strategy using the `Keyv` library to minimize round-trips to the Raindrop.io API, reduce token usage, and improve response latency.

## Functional Requirements

1.  **Caching Library**:
    - Integrate `Keyv` with the `@keyv/memory` adapter for unified, type-safe caching logic.
2.  **Cache Targets & TTL Policies**:
    - **Collections**: Cache the full collection list. TTL: 1 hour.
    - **Bookmark Details**: Cache individual bookmark objects (from `get_raindrop`). TTL: 15 minutes.
    - **Search Results**: Cache specific search query results (from `bookmark_search`). TTL: 5 minutes.
3.  **Cache Invalidation**:
    - Clear relevant cache entries when "manage" tools (create, update, delete) are successfully called.
    - Specifically:
      - Any collection creation/update/delete clears the "Collections" cache.
      - Bookmark update/delete clears the specific "Bookmark Details" entry and potentially related "Search Results".
4.  **Bypass Mechanism**:
    - Support a `skipCache` flag (optional) in tool inputs to force a fresh fetch from the API.

## Non-Functional Requirements

- **Token Efficiency**: Prevent redundant API calls for data already fetched in the same session.
- **Observability**: Log cache hits and misses (debug level) to verify performance improvements.
- **Minimal Footprint**: Ensure the cache logic doesn't add significant memory overhead.

## Acceptance Criteria

- [ ] `Keyv` is correctly integrated into `RaindropService`.
- [ ] Collections are served from the cache within the TTL window.
- [ ] Cache is automatically invalidated upon successful data modification.
- [ ] Latency for repeat requests is significantly reduced.

## Out of Scope

- Persistent file-system caching (deferred per user choice).
- Cross-user cache isolation (server is currently single-user per instance).
