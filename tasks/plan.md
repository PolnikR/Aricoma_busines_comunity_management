# Implementation Plan: Compact Recovery Inventory

## Overview

Replace the long nested inventory cards in Recovery Application and Recovery
Group detail drawers with the approved compact design. Keep the existing API,
lazy loading, error handling, and detail-drawer placement unchanged.

## Design Decisions

- Show a summary header with entity identity and found/total counts.
- Render groups, tiers, and volumes as native accessible disclosure rows.
- Keep rows collapsed by default so large inventories remain short.
- Show source-to-target relations only inside an expanded volume.
- Keep complete provider payloads behind a nested technical JSON disclosure.
- Use the existing design tokens, Badge, and ResponseBodyViewer components.

## Tasks

1. Update group inventory tests, then implement summary metrics and compact
   volume disclosures with source-to-target relation rows.
2. Update application inventory tests, then implement summary metrics and
   compact tier disclosures with dense VM rows.
3. Add localized summary labels and verify both components and their parent
   detail drawers.

## Verification

- Focused component and detail-drawer tests pass.
- TypeScript build passes.
- Changed-file ESLint and `git diff --check` pass.
- The compact design is reviewed in the local browser.

## Assumptions

- Provider objects remain open JSON maps.
- A display label is selected from common name/id properties with a clear
  fallback when a provider omits them.
- No API contract, query behavior, edit form, or drawer footer changes.
