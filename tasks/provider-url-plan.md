# Implementation Plan: Provider URL Contract and Detail Display

## Overview

Extend provider responses and internal models with the backend-provided `url`
field, preserve it through validation and mapping, and display it in both
provider detail surfaces. Existing provider forms will not require a URL because
the current submit payload does not establish it as a user-entered field.

## Architecture Decisions

- Treat `url` as optional because provider types such as orchestration or storage
  may not expose a UI URL.
- Validate non-empty URLs at the API boundary with Zod when the field is present.
- Render a present URL as an accessible external link; render `-` when absent.
- Reuse the existing `details.url` translation and existing detail layout.

## Task List

### Phase 1: Contract and model

- [ ] Add optional URL to provider response/submit schema and `ProviderRecord`.
- [ ] Extend API fixtures and model tests with the supplied vCenter URL.

### Phase 2: Detail surfaces

- [ ] Show URL in `ProviderDetailPage`.
- [ ] Show URL in `ProvidersCatalogueTable` detail drawer.
- [ ] Add assertions for visible URL, link target, and absent URL fallback.

### Checkpoint: Verification

- [ ] Focused provider tests pass.
- [ ] Typecheck and lint pass.
- [ ] Production build passes.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Existing providers omit URL | Runtime schema failure | Keep field optional and use `-` fallback. |
| Backend returns malformed URL | Unsafe/broken link | Validate URL format before rendering. |
| Submit contract does not accept URL | Create/edit regression | Keep URL optional and absent from form submit data. |

## Open Questions

None required; the supplied payload defines the field and its intended display.
