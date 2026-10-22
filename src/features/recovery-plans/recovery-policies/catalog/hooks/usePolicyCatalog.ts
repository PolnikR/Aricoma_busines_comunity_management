import { useGetPolicies } from '@/generated/query/snapshot-policies/snapshot-policies.gen'
import { useGetRecoveryAppPolicies } from '@/generated/query/recovery-app-policies/recovery-app-policies.gen'
import { useGetCleanRoomPolicies } from '@/generated/query/clean-room-policies/clean-room-policies.gen'
import { selectSnapshotPolicies } from '../../snapshot/model/selectSnapshotPolicies'
import { selectRecoveryAppPolicies } from '../../application-recovery/model/selectRecoveryAppPolicies'
import { selectCleanRoomPolicies } from '../../clean-room/model/selectCleanRoomPolicies'
import { createPolicyCatalog, normalizeSource } from '../model/policyCatalog'
import type { PolicyCatalog } from '../model/policyCatalog'

export function usePolicyCatalog(): PolicyCatalog {
  const snapshot = useGetPolicies({ query: { select: selectSnapshotPolicies } })
  const recoveryApp = useGetRecoveryAppPolicies({ query: { select: selectRecoveryAppPolicies } })
  const cleanRoom = useGetCleanRoomPolicies({ query: { select: selectCleanRoomPolicies } })
  return createPolicyCatalog({
    snapshot: normalizeSource(snapshot),
    recoveryApp: normalizeSource(recoveryApp),
    cleanRoom: normalizeSource(cleanRoom),
  }, async kind => {
    const queries = { snapshot, recoveryApp, cleanRoom }
    await queries[kind].refetch({ cancelRefetch: false })
  })
}
