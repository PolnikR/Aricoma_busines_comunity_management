# 0001. Orval-generated code is the single source of the API contract

## Status

Accepted, 2026-09-29.

## Context

The backend contract lives in `openapi/abco-api.json` and Orval generates a typed
client (`src/generated/api/client.gen.ts`) and zod schemas
(`src/generated/api/zod.gen.ts`) from it. Features also kept hand-written zod schemas
and model interfaces that re-declared the same fields. Every backend change therefore
had to be found and fixed twice, and the duplicated copies drifted from the spec.

## Decision

1. **Wire validation uses generated schemas.** API modules parse responses with the
   generated `*Response` schema through `parseGeneratedResponse`, and submit payloads
   with the generated `*Body` schema. Features do not declare `z.object` shapes that
   repeat the contract.
2. **UI model types derive from generated types.** Use
   `Omit<GeneratedOutput, K> & { overrides }`, where the overrides are only narrowed
   enums, non-null defaults and UI-only fields. Submit types are the generated input
   types directly.
3. **Form rules stay in forms.** "Required", "valid email" or "positive integer"
   live in the form's validation, or in `Generated.extend({...})` when a form uses a
   schema.
4. **Spec gaps are explicit.** When the spec types a field only as
   `record<string, unknown>` or `unknown`, the feature keeps a narrow local schema
   that extends the generated one for that field only, marked with a
   `// SPEC GAP:` comment. The gap is reported to backend so it can be fixed in the
   spec.
5. **Regeneration is its own commit.** Pull the spec, regenerate, commit only
   `openapi/` and `src/generated/api`, then fix what the typecheck reports.

Reference implementation: providers, commit `56625bf`.

## Consequences

- A backend change means regenerate and typecheck; errors point exactly at the code
  that uses the changed field.
- Response validation follows the spec. Stricter checks that existed only in
  hand-written schemas are either moved to forms or dropped on purpose.
- Spec gaps remain a manual area until backend types them.
- An ESLint rule enforces rules 1 and 2 for `src/features/**/api/schemas` and
  `src/features/**/model`.
