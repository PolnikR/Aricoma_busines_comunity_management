# Backend Error Message Display

## Problem Statement

The frontend currently receives useful backend error bodies but often replaces them with generic or synthetic messages before they reach the user. The shared Orval mutator preserves the response body in `OrvalApiError.body`, and most feature API wrappers preserve the original `OrvalApiError` in `Error.cause`, but UI components generally read only the wrapper's `error.message` or a translated fallback.

The visible result is that a real backend problem such as `Credential is still referenced by a provider`, `Recovery group is deployed and rollback failed`, or another backend `detail` can be replaced by messages such as `Recovery group operation failed.` or `Delete recovery group request failed with status 500`.

The required behavior is to show the actual backend-provided problem wherever the application already presents a backend request or mutation error, using the existing shared error UI. The Recovery Groups list banner is the reference behavior: the same red shared `Alert` location and localized action context remain, while the backend problem is added as the alert description when one is available.

This rollout is global across backend-backed frontend areas except the `Discovery & Inventory > Resources` and `Resources ISE` flows, which must remain unchanged for now.

## Solution

Introduce a shared frontend error boundary with two explicit operations:

```ts
extractBackendErrorDetail(error: unknown): string | undefined
resolveUserFacingErrorMessage(error: unknown, fallback: string): string
```

`extractBackendErrorDetail` is used by fetch/list/detail states that keep a localized contextual title and need an optional backend description. `resolveUserFacingErrorMessage` is used by mutation and client/domain seams that require a non-empty final message. Both operations inspect an `OrvalApiError` directly or through a bounded, cycle-safe `Error.cause` chain.

Backend detail extraction understands only structured response shapes supported by current OpenAPI or observed backend behavior:

1. A JSON object with a non-empty `detail: string`.
2. A FastAPI/OpenAPI validation body where `detail` is an array and each item contains a `msg` string. Multiple messages are joined in response order with `; `.

The current OpenAPI schema contracts `detail[]` for validation responses; `detail: string` is retained as an observed backend business-error format and protected by integration fixtures. Plain-text response bodies are not user-visible in this rollout because `OrvalApiError` does not preserve response content type and therefore cannot distinguish a business message from proxy HTML, a stack trace, or another unsafe technical body.

The resolver will not stringify arbitrary backend JSON objects or expose plain-text response bodies. If a cause chain contains an API error but no supported backend detail, `resolveUserFacingErrorMessage` returns the supplied localized fallback rather than an outer synthetic `request failed with status N` wrapper. If the chain contains no API error, a non-empty ordinary `Error.message` may be used for an intentional client/domain error; otherwise the fallback is returned.

Cause traversal must use identity-based cycle detection and a maximum depth of 10. `OrvalApiError` detection and supported body extraction take precedence over ordinary outer wrapper messages. Empty and whitespace-only strings are ignored; returned detail values are trimmed. `detail[]` preserves backend response order and ignores entries without a non-empty `msg`.

Existing UI layout and error-component ownership remain intact:

- Action/mutation failures use the existing shared `Alert` with `variant="error"`. The existing localized action/context remains the alert title and resolved backend detail is rendered as `description`. Without backend detail, the existing title remains and no synthetic technical description is added.
- Fetch/list/detail failures that already support Retry keep their existing `FetchErrorAlert` / `DataTableRequestState` contextual title. The resolved backend problem is shown as the description. If no useful backend problem exists, the current contextual error state remains without an invented technical description.
- Existing frontend field validation remains unchanged.
- Existing feature domain adapters take precedence over the generic ordinary-error path. For example, `RecoveryGroupsError` continues through `getRecoveryGroupsErrorKey()` so its localized message is not replaced by the class's hardcoded `Error.message`.

No generated API, OpenAPI schema, backend endpoint, HTTP status behavior, or transport protocol is changed by this work.

## User Stories

1. As a Recovery Groups user, I want a failed recovery group operation to show the backend's real problem in the existing red banner, so that I know what actually failed.
2. As a Recovery Groups user, I want a backend delete or rollback failure to remain visible after the confirmation dialog closes, so that the failure is not silently lost.
3. As a Recovery Groups user, I want list-loading failures to retain the existing retry UI while also showing the backend reason when one exists, so that I have both context and a useful diagnosis.
4. As a Recovery Group builder or editor user, I want submit failures to show the backend reason instead of a status-only wrapper, so that I can correct the actual issue.
5. As a Providers user, I want provider create/edit failures to show the backend reason in a shared error alert, so that I do not have to infer the problem from an HTTP status.
6. As a Providers user, I want provider delete failures to be surfaced in the table context instead of disappearing after the confirmation action, so that destructive actions fail visibly.
7. As a Providers user, I want provider list/detail load errors to retain their contextual title and display the backend reason as detail, so that the failure remains understandable and actionable.
8. As a Providers user, I want provider connection-test request failures to show the backend problem in the existing connection-test dialog, so that connectivity failures are diagnosable.
9. As a Credentials user, I want credential create/edit/delete failures to show the backend reason through the shared error UI, so that dependency or validation failures are explicit.
10. As a Credentials user, I want standard FastAPI 422 validation messages to be readable even when `detail` is an array rather than a string, so that validation errors do not fall back to a generic status message.
11. As a Platform Providers user, I want list, save, and delete failures to display backend-provided detail consistently with Providers & Connectors.
12. As a Recovery Applications user, I want list, submit, edit, and delete failures to show the backend reason while preserving the current table/banner/dialog structure.
13. As a Recovery Applications user, I want supporting lookup failures in the builder to retain their existing retry UI and show backend detail when available.
14. As a Policy Sets user, I want list, save, and delete failures to show the backend reason instead of generic save/load messages alone.
15. As a Snapshot Policies user, I want list, save, and delete failures to expose the backend reason through the same shared error patterns.
16. As a Recovery App Policies user, I want list, save, and delete failures to expose the backend reason through the same shared error patterns.
17. As a Clean Room Policies user, I want list, save, and delete failures to expose the backend reason through the same shared error patterns.
18. As a Recovery Runs user, I want a failed orchestrator-runs request to keep the existing retry state and show the backend reason when available.
19. As an Infrastructure Topology user, I want backend provider/topology load failures to show the real backend reason while preserving the existing full-page retry state.
20. As a frontend maintainer, I want backend error-body parsing centralized in one shared utility, so that features do not each implement their own `detail` parsing.
21. As a frontend maintainer, I want existing `OrvalApiError` cause chains preserved and traversed safely, so that diagnostics remain available without rewriting every API wrapper or risking cause cycles.
22. As a frontend maintainer, I want arbitrary backend objects excluded from user-visible rendering, so that internal JSON is not dumped into the interface accidentally.
23. As a frontend maintainer, I want API errors without a usable backend message to fall back to current localized text, so that the UI never becomes blank or shows an unhelpful synthetic status wrapper.
24. As a frontend maintainer, I want ordinary client/domain errors to keep their meaningful `Error.message`, so that frontend validation and domain safeguards are not regressed.
25. As a product owner, I want the `Resources` and `Resources ISE` flows left unchanged in this rollout, so that their separate inventory/error design can be handled later.
26. As a product owner, I want mock-only Identity & Access and Recovery Actions UI left unchanged, because there is currently no real backend error flow to standardize there.

## Implementation Decisions

- A new shared error-message resolver will live in the shared API/error boundary rather than in any individual feature.
- The resolver will inspect the supplied error and its `cause` chain for `OrvalApiError` instances; feature API wrappers do not need to be rewritten solely to expose backend bodies.
- Supported backend message extraction is intentionally narrow: `detail: string` and `detail[]` validation items with `msg` strings. Plain-text bodies are explicitly rejected in this rollout.
- For `detail[]`, trimmed non-empty `msg` values are joined with `; ` in backend response order. Field-path rewriting, localization of backend messages, and arbitrary JSON formatting are not part of this work.
- Cause traversal uses a visited-object set and a maximum depth of 10. A nested API error suppresses synthetic outer wrapper messages when no supported backend detail exists.
- `extractBackendErrorDetail` returns only supported backend detail or `undefined`. `resolveUserFacingErrorMessage` returns backend detail, or an ordinary non-API error message, or the supplied fallback in that order.
- Existing `Error.cause` chains remain intact for diagnostics and tests.
- Mutation/action errors use shared `Alert variant="error"`. Existing raw red submit-error blocks in backend-backed provider/credential/policy modals are replaced with shared `Alert` while keeping their current location in the modal.
- Mutation alerts retain a localized contextual title and display supported backend detail as `description`. This applies to the Recovery Groups banner shown in the reference screenshot.
- List/detail fetch errors keep the existing feature-specific localized title and Retry action. The resolved backend message is passed as `description` when available.
- Table components that currently own delete mutations but expose no mutation failure state will render a shared `Alert` above the table controls when the mutation fails. The confirmation dialog is still closed/handled according to the feature's current behavior; only failure visibility is added.
- Provider connection-test request errors use the resolved backend message in the existing connection-test result UI while preserving backend check rows for successful HTTP responses whose `ok` value is false.
- Recovery Applications retain generated-response contract diagnostics for frontend response-shape failures; those are ordinary client errors and remain visible through the same resolver fallback behavior.
- Credentials may keep their existing credentials-specific API error adapter; the shared resolver must still recover a nested original `OrvalApiError`, including FastAPI `detail[]`. The credential public-key request is a separate native `fetch` seam and must be migrated to a body-preserving error adapter or explicitly use the localized fallback; a status-only message is not acceptable.
- `Discovery & Inventory > Resources` and `Resources ISE` components, hooks, and resource API adapters are explicitly excluded from modification in this rollout.
- Infrastructure Topology is in scope because it is a separate route from Resources/Resources ISE.
- Identity & Access and Recovery Actions remain untouched while they are mock/static flows.
- No OpenAPI or generated-client changes are required.

## Testing Decisions

- Tests assert user-visible behavior, not implementation details such as how many times the resolver traverses `cause`.
- The primary foundation seam is a unit test for the shared resolver. It covers direct and nested `OrvalApiError`, `detail: string`, FastAPI `detail[]`, rejected plain text/HTML/arbitrary objects, ordinary `Error`, API-wrapper fallback, cycle detection, maximum depth, and localized fallback behavior.
- The primary feature integration seam is `RecoveryGroupsListPage`: a mutation backed by an `OrvalApiError` detail must retain the localized operation-failed title and render the exact backend problem as the existing shared `Alert` description.
- Existing component tests are extended at the highest available seam for each feature rather than adding API-wrapper tests everywhere.
- Table tests verify that fetch failures keep their contextual title and include resolved backend detail as the description when available.
- Mutation-owning table tests verify that delete failures become visible through shared `Alert` and successful delete flows remain unchanged.
- Modal tests verify that submit errors use shared `Alert` and display backend detail while frontend validation behavior is unchanged.
- Provider connection-test tests distinguish transport/request failure from a successful backend response containing failed checks.
- Existing tests that intentionally assert backend details are hidden must be updated because the product requirement has changed; they should instead assert that supported backend detail is visible and unsupported/internal objects are not dumped.
- Recovery Groups tests must prove `RecoveryGroupsError` still uses its localized code mapping while API errors use backend detail.
- Credential tests must cover the native public-key request failure seam so it cannot regress to a status-only visible message.
- Focused test files are preferred per feature slice, followed by focused ESLint, `tsc -b`, and `git diff --check` at checkpoints. A full `npm run build` is reserved for the final cross-feature checkpoint because this rollout is cross-cutting.

## Out of Scope

- Any change to `Discovery & Inventory > Resources`.
- Any change to `Discovery & Inventory > Resources ISE`.
- Resource inventory API adapters used exclusively by those two routes.
- VM snapshot/resource error work already handled separately in the Resources flow.
- Identity & Access mock-table redesign or mock error behavior.
- Recovery Actions mock/history error behavior.
- Backend or OpenAPI changes to add new HTTP response schemas/status codes.
- Translating backend-provided error messages into SK/CS/EN.
- Rewriting backend messages for tone, grammar, or business terminology.
- Displaying full arbitrary JSON response bodies, stack traces, exception names, request URLs, or response headers to users.
- Displaying arbitrary plain-text API bodies until the transport preserves a trustworthy response media type and a dedicated user-safe backend contract exists.
- Global toast infrastructure or a new application-wide notification system.
- Changing retry policy, request timing, mutation semantics, routing, or confirmation-dialog behavior except where needed to keep an error visible after a failed action.

## Further Notes

The Orval transport preserves the structured information required for most of this feature. `orvalMutator` parses JSON/text error bodies and stores them in `OrvalApiError.body`; many feature wrappers then create a higher-level `Error` with the original API error in `cause`. The design uses this preserved cause chain instead of rewriting those adapters. Native `fetch` seams such as the credential public-key request are audited separately because they do not currently preserve a structured body or cause.

The visible rule is simple: show the backend's actual problem when the backend supplied one; otherwise show a meaningful existing frontend fallback. The UI component and location should remain the feature's existing shared error pattern.
