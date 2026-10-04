import { useMemo } from 'react'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { useTranslation } from '@/hooks/useTranslation'
import { buildVmRelationships } from '../../helpers/buildVmRelationships'
import type { StorageVolume } from '../../model/vmStorageVolumesTypes'
import type { VirtualMachine } from '../../types/virtualMachineTypes'
import { WorkloadRelationshipGraph } from '../WorkloadRelationshipGraph'

interface VmRelationshipHelpProps {
  virtualMachine: VirtualMachine
  // The panel's already loaded backing-storage lookup; the help never fetches.
  volumes: readonly StorageVolume[]
  isLoading: boolean
  isError: boolean
  providers: readonly ProviderRecord[]
}

export function VmRelationshipHelp({ virtualMachine, volumes, isLoading, isError, providers }: VmRelationshipHelpProps) {
  const { t } = useTranslation()
  const relationships = useMemo(
    () => buildVmRelationships(virtualMachine, volumes, providers),
    [virtualMachine, volumes, providers],
  )

  return (
    <WorkloadRelationshipGraph
      relationships={relationships}
      workloadMeta={<>
        <span>{t('resources.relationships.vm.entity')}</span>
        <span>{t('resources.relationships.vm.disks', { count: relationships.workload.diskCount })}</span>
        <span>{relationships.workload.powerState}</span>
      </>}
      backingLabel={t('resources.relationships.edge.backingNaa')}
      volumeIdentity={volume => ({ meta: null, monoId: volume.naa ?? '' })}
      isLoading={isLoading}
      isError={isError}
      emptyText={t('pages.virtualMachines.detail.noBackingVolumes')}
      resolutionNote={t('resources.relationships.vm.resolution')}
    />
  )
}
