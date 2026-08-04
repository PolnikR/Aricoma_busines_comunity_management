export interface PolicySet {
  id: string
  name: string
  description: string
  policyIds: string[]
}

// Kept as a separate public contract even though the backend currently accepts
// every field returned by reads. This allows read and write shapes to evolve independently.
export type PolicySetSubmitData = PolicySet
