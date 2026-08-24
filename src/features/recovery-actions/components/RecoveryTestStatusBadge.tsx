import { Badge } from '@/shared/components/badge/Badge'
import type { RecoveryTestStatus } from '../model/recoveryActionTypes'

interface RecoveryTestStatusBadgeProps {
  status: RecoveryTestStatus | 'warning'
  label: string
}

export function RecoveryTestStatusBadge({ status, label }: RecoveryTestStatusBadgeProps) {
  const color = status === 'passed' ? 'success' : status === 'failed' ? 'error' : status === 'warning' ? 'warning' : 'info'
  return <Badge size="sm" color={color}>{label}</Badge>
}
