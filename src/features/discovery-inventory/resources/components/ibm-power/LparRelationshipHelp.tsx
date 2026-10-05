import { useMemo } from 'react'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { useTranslation } from '@/hooks/useTranslation'
import { buildLparRelationships } from '../../helpers/buildLparRelationships'
import type { PowerPartitionResource } from '../../model/discoveryTypes'
import type { StorageVolume } from '../../model/vmStorageVolumesTypes'
import { WorkloadRelationshipGraph } from '../WorkloadRelationshipGraph'

interface LparRelationshipHelpProps {
  partition: PowerPartitionResource
  // The panel's already loaded backing-storage lookup; the help never fetches.
  volumes: readonly StorageVolume[]
  isLoading: boolean
  isError: boolean
  providers: readonly ProviderRecord[]
}

// IBM Power volumes are identified by Volume ID and Volume UID; their lookup key is
// internal and never an NAA.
export function LparRelationshipHelp({ partition, volumes, isLoading, isError, providers }: LparRelationshipHelpProps) {
  const { t } = useTranslation()
  const relationships = useMemo(
    () => buildLparRelationships(partition, volumes, providers),
    [partition, volumes, providers],
  )

  return (
    <WorkloadRelationshipGraph
      relationships={relationships}
      workloadMeta={<>
        <span>{t('resources.relationships.lpar.entity')}</span>
        {relationships.workload.state ? <span>{relationships.workload.state}</span> : null}
      </>}
      backingLabel={t('resources.relationships.edge.backingNpiv')}
      volumeIdentity={volume => ({
        meta: <span>{t('resources.relationships.volumeId', { id: volume.volumeId })}</span>,
        monoId: volume.vdiskUid,
      })}
      isLoading={isLoading}
      isError={isError}
      emptyText={t('resources.power.detail.noBackingVolumes')}
      resolutionNote={t('resources.relationships.lpar.resolution')}
    />
  )
}
