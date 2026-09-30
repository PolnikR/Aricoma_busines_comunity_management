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
  const resourcesStepIndex = 5
  const relatedStorageStepIndex = 6
  const policySetStepIndex = hasRelatedStorageStep ? 7 : 6
  const orchestrationStepIndex = hasRelatedStorageStep ? 8 : 7
  const lastStep = orchestrationStepIndex

  return {
    resourcesStepIndex,
    relatedStorageStepIndex,
    policySetStepIndex,
    orchestrationStepIndex,
    lastStep,
  }
}
