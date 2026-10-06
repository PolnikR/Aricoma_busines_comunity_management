import { useTranslation } from '@/hooks/useTranslation'
import { useGetRecoveryGroupInventory } from '@/generated/query/recovery-groups/recovery-groups.gen'
import { selectRecoveryGroupInventory } from '../model/recoveryGroupTypes'
import { countLabel } from '../helpers/countLabel'

interface RecoveryGroupInventorySummaryProps {
  runId: string | null
  // Shown until the inventory has loaded, or when there is no run.
  fallback: string
}

// Quiet one-line summary for the Inventory section header: "4 volumes · 4 found ·
// 20 FlashCopy relations". Reads the same cached query as RecoveryGroupInventory.
export function RecoveryGroupInventorySummary({ runId, fallback }: RecoveryGroupInventorySummaryProps) {
  const { t, language } = useTranslation()
  const query = useGetRecoveryGroupInventory({ run_id: runId ?? '' }, { query: { select: selectRecoveryGroupInventory, enabled: Boolean(runId) } })
  if (!query.data) return fallback
  const volumes = Object.values(query.data.volumes)
  const found = volumes.filter(volume => volume.found).length
  const relations = volumes.reduce((total, volume) => total + volume.relations.length, 0)
  return [
    countLabel(t, language, 'recoveryInventory.summary.volumes', volumes.length),
    t('recoveryInventory.summary.found', { count: found }),
    countLabel(t, language, 'recoveryInventory.summary.relations', relations),
  ].join(' · ')
}
