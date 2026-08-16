import type { ReactNode } from 'react'
import type { ProviderRecord, ProviderRole } from '@/features/providers-connectors/providers/model/providerTypes'
import type { useTranslation } from '@/hooks/useTranslation'

export interface SourceResourcesPageProps {
  providers: ProviderRecord[]
  providersPending: boolean
  providersSuccess: boolean
  providersFetching: boolean
  providersError: Error | null
  onRefetchProviders: () => void
  providerId: string | null
  tabs: ReactNode
  t: ReturnType<typeof useTranslation>['t']
  role: ProviderRole
}
