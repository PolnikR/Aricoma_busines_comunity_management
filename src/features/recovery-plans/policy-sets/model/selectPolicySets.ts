import type { PolicySetRecordOutput, PolicySetsResponse, PolicySetsResponseOutput } from '@/generated/query/zod'

// validatingMutator parses the response through the zod schema before handing it to
// react-query, so the value select actually receives has every default applied (the
// Output shape) even though the generated hook's declared type is the pre-default
// Input shape. Casting through the accurate Output type here keeps every consumer of
// this select free of `?? <default>` fallbacks for fields the backend always fills in.
export const selectPolicySets = ((response: PolicySetsResponseOutput): PolicySetRecordOutput[] =>
  response.policy_sets) as (response: PolicySetsResponse) => PolicySetRecordOutput[]
