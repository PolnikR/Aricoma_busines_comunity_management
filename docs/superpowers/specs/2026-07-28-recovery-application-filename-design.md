# Recovery Application Filename Design

## Status

Approved for implementation planning.

## Context

`application.name` is a display/domain value and is not a safe file identity.
For example, an application named `Test App` currently produces a filename
containing a space. Backend data also demonstrates that application name and
file identity are independent:

```text
application.name: SampleAppRecovery2
file: sample_application_recovery_groups.json
```

The backend appends `.json`; the frontend must submit a filename base without
the extension.

## Decision

Add a required `fileName` field to `RecoveryApplicationFormState`. It is form
metadata only and is not included in the recovery application JSON body.

The filename base must match:

```regex
^[A-Za-z][A-Za-z0-9_]*$
```

This allows letters, digits after the first character, and underscores. Spaces,
hyphens, dots, path separators, and a leading underscore or digit are rejected.
The frontend neither accepts nor appends `.json`.

## Create Behavior

The Create builder displays an enabled, required `File name` input separately
from `Application name`.

Examples:

```text
File name: sample_application_recovery_groups
Application name: SampleAppRecovery2
```

Save is blocked when the filename is empty or fails validation.

## Edit Behavior

The backend list item `file` remains mapped to
`RecoveryApplicationListItem.id`. When opening Edit, the form derives its
filename by removing exactly one case-insensitive terminal `.json` suffix:

```text
sample_application_recovery_groups.json
  -> sample_application_recovery_groups
```

The filename input is disabled in Edit. The user may edit application content
but cannot rename the backing file. Saving therefore updates the same backend
file.

## Submit Data Flow

The shared mutation accepts a submission object:

```ts
interface SubmitRecoveryApplicationInput {
  fileName: string
  data: RecoveryApplicationData
}
```

It calls:

```ts
submitRecoveryApplicationDag(fileName, data, false)
```

The request remains:

```text
POST /api/submit_recovery_dag
  ?filename=<validated filename base>
  &is_final=false
```

`application.name` remains inside the JSON request body and is never used as
the query filename.

## Component Changes

### `AppMetadataForm`

- displays the filename input;
- receives whether the filename is disabled;
- reports filename changes through the existing metadata callback;
- displays a validation error without silently rewriting the value.

### `RecoveryAppBuilder`

- owns `fileName` in form state;
- validates it before Save;
- accepts a `disableFileName` property for Edit mode.

### Create page

- starts with an empty filename;
- submits the entered filename separately from the JSON data.

### Edit page

- initializes filename from the selected backend `file`;
- passes `disableFileName` to the builder;
- submits the unchanged filename separately from the JSON data.

### Submit hook

- accepts `fileName` and `data`;
- no longer reads `data.application.name` as the filename;
- continues passing `isFinal=false`.

## Error Handling

Invalid filename input blocks submission and displays a field-level validation
message. Backend/network submission errors continue to preserve the current
form and display the existing submit error state.

## Testing

Tests will verify:

1. valid mixed-case, underscore, and digit filenames are accepted;
2. spaces, dots, hyphens, path separators, leading digits, and leading
   underscores are rejected;
3. Create renders an enabled filename input;
4. Edit strips one terminal `.json` and renders the filename input disabled;
5. application name and filename remain independent;
6. the submit hook uses `fileName`, not `application.name`;
7. Create and Edit submit `is_final=false`;
8. filename is not present in the JSON request body.

## Out of Scope

- automatic filename generation from application name;
- automatic replacement of invalid characters;
- renaming files during Edit;
- adding `.json` in the frontend;
- exposing an `is_final` UI control.
