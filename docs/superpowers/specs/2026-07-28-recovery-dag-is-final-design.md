# Recovery DAG `is_final` Submit Design

## Status

Approved for implementation planning.

## Context

The recovery backend submit endpoint is now:

```text
POST /submit_recovery_dag
```

It accepts two query parameters:

- required `filename`;
- optional boolean `is_final`, defaulting to `false`.

When `is_final=true`, the backend also pushes the generated DAG to the Airflow
target. The frontend must currently submit `false`; enabling final Airflow
delivery is a later change.

## Decision

Change the frontend API function to:

```ts
submitRecoveryApplicationDag(
  name: string,
  data: RecoveryApplicationData,
  isFinal = false,
): Promise<SubmitDagResponse>
```

The proxied frontend URL is:

```text
/api/submit_recovery_dag?filename=<encoded-name>&is_final=false
```

Query parameters will be serialized with `URLSearchParams`. The application
JSON remains the request body and `apiFetch` continues adding the `X-User`
header.

## Data Flow

Both Create and Edit already use `useSubmitRecoveryApplication`. That hook will
explicitly call:

```ts
submitRecoveryApplicationDag(data.application.name, data, false)
```

No UI control for `is_final` is introduced. Changing the hook argument to
`true` later will enable final Airflow delivery for both flows.

## Error Handling

Existing network and non-success HTTP handling remains. Error messages and
comments will reference `submit_recovery_dag` instead of the removed
`submit_dag` endpoint.

## Testing

Tests will verify:

1. the endpoint is `/api/submit_recovery_dag`;
2. `filename` is URL encoded;
3. omitted `isFinal` serializes as `is_final=false`;
4. explicit `true` serializes as `is_final=true`;
5. the shared submit hook currently passes `false`;
6. the JSON body and `X-User` behavior remain unchanged.

## Out of Scope

- UI toggle for final submission;
- environment-based configuration;
- changing the request body;
- changing backend Airflow behavior.
