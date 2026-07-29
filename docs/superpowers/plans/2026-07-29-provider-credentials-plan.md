# Provider Credentials Implementation Plan

## Phase 1 — Contract and security boundary

- Add credential metadata/form/payload models.
- Add PEM import and RSA-OAEP encryption helper without plaintext fallback.
- Add GET, submit, and delete API functions with Zod response validation.

## Phase 2 — Server state and UI

- Add React Query keys and query/mutation hooks.
- Add create form/modal and credentials table.
- Add a real Credentials page using existing shared table and modal components.

## Phase 3 — Integration and verification

- Route `/providers-connectors/credentials` to the new page.
- Add English, Slovak, and Czech translations.
- Add API, crypto, and UI tests.
- Run lint, typecheck, tests, and production build.
