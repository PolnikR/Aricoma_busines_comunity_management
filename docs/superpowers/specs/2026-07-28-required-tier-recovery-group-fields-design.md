# Required Tier and Recovery Group Fields Design

## Status

Approved for implementation planning.

## Context

The tier form currently uses one description value for both
`tier.description` and `tier.recovery_group.description`. These are independent
backend fields and must be edited separately.

## Decision

The tier Create and Edit forms require four independent values:

```text
ID
Tier description
Recovery group name
Recovery group description
```

All four fields are required. No field is labelled or treated as optional.

## Backend Mapping

```json
{
  "tiers": {
    "db_cluster": {
      "order": 2,
      "description": "<Tier description>",
      "recovery_group": {
        "name": "<Recovery group name>",
        "description": "<Recovery group description>",
        "vms": []
      }
    }
  }
}
```

The tier map key comes from `ID`. Tier description and recovery-group
description are never copied into one another.

## Validation

Create and Edit confirmation are blocked when any field is empty after
trimming. Each empty field receives its own field-level error.

ID continues to enforce uniqueness and its existing programmer identifier
normalization. Recovery group name is stored as entered after trimming.

## Compatibility

The GET API schema continues accepting an absent `recovery_group` so existing
backend records do not break the recovery list. When editing such a record, the
recovery-group fields start empty and must be completed before saving.

New and edited tiers always submit a complete `recovery_group`.

## Component Changes

### `AddTierCard`

- replaces the generic Name/Description labels;
- adds separate tier and group descriptions;
- requires all four fields;
- creates a complete backend-shaped tier.

### `TierCard`

- Edit state tracks ID, tier description, group name, and group description;
- confirms only when all fields are valid;
- updates each backend field independently.

### `TierCanvas` and `RecoveryAppBuilder`

- edit callback carries both descriptions;
- preserves existing recovery-group VM assignments;
- never substitutes tier description for group description.

## Testing

Tests verify:

1. Create is disabled until all four fields are present;
2. each required field blocks confirmation when empty;
3. tier description maps only to `tier.description`;
4. group description maps only to `recovery_group.description`;
5. editing preserves existing VM assignments;
6. an existing tier without a recovery group must receive all group fields
   before it can be saved.

## Out of Scope

- changing tier order behavior;
- changing VM drag-and-drop behavior;
- making `recovery_group` required in the GET response schema;
- changing recovery application filename behavior.
