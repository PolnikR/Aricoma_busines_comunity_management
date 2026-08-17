import { Badge } from '@/shared/components/badge/Badge'

type StateKind = 'power' | 'connection' | 'tools'

interface VirtualMachineStatusBadgeProps {
  value: string
  kind: StateKind
}

function resolveColor(value: string, kind: StateKind) {
  if (kind === 'power') {
    return value === 'poweredOn' ? 'success' : 'light'
  }

  if (kind === 'connection') {
    return value === 'connected' ? 'success' : 'warning'
  }

  return value === 'toolsOk' ? 'success' : 'warning'
}

export function VirtualMachineStatusBadge({ value, kind }: VirtualMachineStatusBadgeProps) {
  return (
    <Badge color={resolveColor(value, kind)} size="sm">
      {value}
    </Badge>
  )
}