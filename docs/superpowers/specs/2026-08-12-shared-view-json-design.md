# Shared View JSON Design

## Goal

Add a consistent `View` JSON action to the following catalogue tables:

- infrastructure Providers;
- Platform Providers;
- Snapshot Policies;
- Application Recovery Policies;
- Clean Room Policies;
- Policy Sets.

The modal must show the exact object accepted by the corresponding `submit_*` endpoint. Existing View JSON behavior in Recovery Applications and Recovery Groups must remain functionally unchanged and move to the same shared modal.

## User experience

Each table receives a final data column labelled `JSON`. Every row contains the existing small soft `View` button pattern. Activating the button opens a large modal containing formatted, read-only JSON.

The action stops row-click propagation, so it neither selects the row nor opens its detail drawer. The modal supports the standard close button, close icon, Escape behavior, internal vertical scrolling, and wrapped long values. All visible labels are localized. Copy and download actions are outside this change.

## Shared component

`src/shared/components/modal/JsonViewerModal.tsx` becomes the single JSON presentation component. Its public interface is:

- `open: boolean`;
- `title: string`;
- `data: unknown`;
- `closeLabel: string`;
- `onClose: () => void`.

It uses the existing shared `Modal` and `Button`, size `lg`, a constrained flex layout, and `JSON.stringify(data, null, 2)`. It owns presentation only and does not know about providers or policies.

The local JSON modal implementations in `RecoveryApplicationsTable` and `RecoveryGroupsTable` are removed and replaced with this shared component. Their current payload-building logic and visible behavior are preserved.

## Payload ownership

Every feature owns a pure mapper that converts its frontend record to the payload accepted by its submit endpoint. The submit API function and its table's JSON viewer both call the same mapper. This makes the displayed JSON and the submitted JSON one contract instead of two parallel implementations.

The mapper is placed beside the feature's API boundary and exported with a feature-specific name. It validates through the existing Zod submit schema before returning the payload where that validation already exists.

### Provider payloads

Infrastructure Providers display the current provider submit contract: `id`, `name`, `description`, `type`, `ipAddress`, `credentialId`, `role`, and applicable optional provider-link/orchestrator fields. Read-only response fields such as `credentialStatus` and `port` are excluded unless the submit contract later accepts them.

Platform Providers display `id`, `name`, `description`, `type`, `ipAddress`, `port`, `dagDir`, and `credentialId`. Response-only `credentialStatus` and `url` are excluded.

These two endpoints currently use camelCase request properties. The viewer follows the actual request contract rather than converting keys merely for visual consistency.

### Recovery Policy payloads

Snapshot Policies display the wire keys used by the backend, including `frequency_value`, `frequency_unit`, `retention_value`, `retention_unit`, and `max_snapshots`.

Application Recovery Policies display the mode-specific submit payload. Common fields use backend snake_case keys. Selection fields are included only when accepted for the active `snapshot_selection_mode`:

- `latest`: no time-range or target-time fields;
- `time_range`: `snapshot_max_age_value` and `snapshot_max_age_unit`;
- `exact_time`: `snapshot_target_time`.

Clean Room Policies display `id`, `name`, `description`, and `enabled` without transformation because that is already the submit contract.

### Policy Set payload

Policy Sets display `id`, `name`, `description`, `snapshot_policy_id`, `recovery_app_policy_id`, and `clean_room_policy_id`.

## Table integration

Each target table owns only the selected JSON row identifier or record. Its column definition adds the `View` action, and the modal receives the mapper output for the selected row. Closing the modal clears that state.

The JSON column is included in skeleton column counts and minimum table widths are adjusted only where necessary. Existing filters, pagination, drawers, edit/delete flows, and provider connection testing are unchanged.

## Error handling

Opening View JSON performs no network request. API loading and failure states therefore remain owned by the existing table queries.

Payload mappers consume records that have already passed response schema validation. A mapper validation failure is a programming/contract error, not a recoverable modal state. Tests must catch such drift before release; the viewer will not silently alter or omit an invalid required value.

## Accessibility and localization

- Every View action is a semantic button.
- Modal title and close label come from translations.
- The shared Modal retains focus trapping, Escape handling, and focus restoration.
- JSON remains selectable text in a `pre` element.
- English, Slovak, and Czech translations cover the shared column/action and feature-specific modal titles.

## Testing

Pure mapper/API tests verify exact payload equality for all six target record types, including excluded response-only fields and each Application Recovery Policy selection mode.

Table component tests verify that:

- View opens a dialog with the correct title and formatted API payload;
- View does not open or select the detail drawer;
- Close dismisses the dialog;
- existing table actions still work.

Shared modal tests verify rendering, formatting, accessible naming, and closing. Existing Recovery Application and Recovery Group tests remain passing after migration to the shared modal.

Final verification consists of affected Vitest suites, full lint, TypeScript typecheck, and a production Vite build.

## Out of scope

- backend endpoint changes;
- fetching a row again when opening the modal;
- editing JSON;
- copying, downloading, or syntax highlighting JSON;
- showing response wrapper objects such as `{ "providers": [...] }`;
- exposing credentials or secrets beyond non-secret credential identifiers already present in the submit contract.
