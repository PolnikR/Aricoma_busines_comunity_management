export type RecoveryGroupsErrorCode =
  | 'invalid_storage'
  | 'invalid_draft'
  | 'duplicate_id'
  | 'not_found'
  | 'immutable_type'
  | 'missing_orchestration_provider'

export class RecoveryGroupsError extends Error {
  readonly code: RecoveryGroupsErrorCode

  constructor(
    code: RecoveryGroupsErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'RecoveryGroupsError'
    this.code = code
  }
}
