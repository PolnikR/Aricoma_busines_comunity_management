import { ConnectionTestResultDialog } from '@/shared/components/modal/ConnectionTestResultDialog'
import { providerTypeLabel } from '../helpers/providerTypeLabel'
import type { ProviderRole } from '../model/providerTypes'
import type { ProviderTestResponseOutput } from '@/generated/query/zod'

interface ProviderConnectionTestDialogProps {
  open: boolean
  providerName: string
  providerId: string
  providerRole?: ProviderRole
  isPending: boolean
  result: ProviderTestResponseOutput | null
  error: Error | null
  onClose: () => void
  onRetry: () => void
}

export function ProviderConnectionTestDialog({
  providerRole = 'source',
  ...props
}: ProviderConnectionTestDialogProps) {
  return <ConnectionTestResultDialog {...props} providerRole={providerRole} providerTypeLabel={providerTypeLabel} />
}
