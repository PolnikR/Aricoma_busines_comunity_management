export interface RecoveryGroupStepIndices {
  resourcesStepIndex: number
  relatedStorageStepIndex: number
  policySetStepIndex: number
  orchestrationStepIndex: number
  lastStep: number
}

export function calculateRecoveryGroupStepIndices(
  hasRelatedStorageStep: boolean,
): RecoveryGroupStepIndices {
  const resourcesStepIndex = 4
  const relatedStorageStepIndex = 5
  const policySetStepIndex = hasRelatedStorageStep ? 6 : 5
  const orchestrationStepIndex = hasRelatedStorageStep ? 7 : 6
  const lastStep = orchestrationStepIndex

  return {
    resourcesStepIndex,
    relatedStorageStepIndex,
    policySetStepIndex,
    orchestrationStepIndex,
    lastStep,
  }
}
