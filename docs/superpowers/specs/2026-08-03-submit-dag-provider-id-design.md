# Submit DAG Provider ID Design

## Goal

Send the selected Airflow platform provider ID as the required `provider_id`
query parameter on every recovery-application DAG submission.

## Existing Behavior

The Platform Provider select already stores the selected provider ID in
`RecoveryApplicationFormState.platform`. The builder validates that this ID
belongs to an available platform provider with valid credentials. The submit
flow currently forwards only the filename and JSON body, so the request URL
omits the now-required `provider_id` parameter.

## Design

Keep the existing form and JSON contract unchanged. Treat `formState.platform`
as the authoritative provider selection and copy it into an explicit
`providerId` field on `SubmitRecoveryApplicationInput`.

Both create and edit pages pass `formState.platform` as `providerId`. The
mutation forwards it as a required argument to `submitRecoveryApplicationDag`.
The API client trims and validates it before issuing a request and serializes it
as `provider_id` alongside `filename` and `is_final`.

Example request:

```text
POST /api/submit_recovery_dag?filename=finance_recovery&provider_id=airflow-01&is_final=false
```

The request body remains the current `RecoveryApplicationData` JSON. Its
`application.platform` field also remains unchanged for backend compatibility.

## Error Handling

The TypeScript input makes `providerId` required. The API boundary additionally
rejects an empty or whitespace-only ID before calling `fetch`, protecting
direct callers and future integrations even if UI validation is bypassed.

Existing network, HTTP, and response-schema errors remain unchanged.

## Testing

- API tests assert encoded `provider_id` for normal and final submissions.
- API tests assert that an empty ID fails before any network request.
- Mutation-hook tests assert the complete request URL.
- Builder and editor page tests assert that `formState.platform` becomes the
  submit input's `providerId`.
- Focused tests run first, followed by lint, typecheck, the full test suite, and
  the production build.

## Success Criteria

- Every Submit DAG request includes a non-empty `provider_id`.
- Create and edit flows use the selected Platform Provider ID.
- No new UI field or payload-format change is introduced.
- Existing submission behavior and error reporting continue to pass tests.

