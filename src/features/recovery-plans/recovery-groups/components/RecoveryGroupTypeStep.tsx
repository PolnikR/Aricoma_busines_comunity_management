import { SelectableCard } from '@/shared/components/selectable-card/SelectableCard'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { useTranslation } from '@/hooks/useTranslation'
import type {
  RecoveryGroupResourceType,
  RecoveryGroupSourceCategory,
  RecoveryGroupWorkloadType,
} from '../model/recoveryGroupTypes'

interface RecoveryGroupTypeStepProps {
  sourceCategory: RecoveryGroupSourceCategory | null
  selected: RecoveryGroupWorkloadType | null
  onCategoryChange: (sourceCategory: RecoveryGroupSourceCategory) => void
  onSelect: (
    sourceCategory: RecoveryGroupSourceCategory,
    workloadType: RecoveryGroupWorkloadType,
    resourceType: RecoveryGroupResourceType,
  ) => void
}

interface WorkloadCardDefinition {
  id: string
  titleKey: string
  descriptionKey: string
  metaKey: string
  workloadType?: RecoveryGroupWorkloadType
  resourceType?: RecoveryGroupResourceType
}

const BACKUP_WORKLOADS: WorkloadCardDefinition[] = [
  {
    id: 'vmware',
    titleKey: 'pages.recoveryGroupBuilder.type.workloads.vmware.title',
    descriptionKey: 'pages.recoveryGroupBuilder.type.workloads.vmware.description',
    metaKey: 'pages.recoveryGroupBuilder.type.resourceTypes.vm',
    workloadType: 'vmware_virtual_machines',
    resourceType: 'vm',
  },
  {
    id: 'oracle',
    titleKey: 'pages.recoveryGroupBuilder.type.workloads.oracle.title',
    descriptionKey: 'pages.recoveryGroupBuilder.type.comingSoon',
    metaKey: 'pages.recoveryGroupBuilder.type.resourceTypes.database',
  },
  {
    id: 'sap-hana',
    titleKey: 'pages.recoveryGroupBuilder.type.workloads.sapHana.title',
    descriptionKey: 'pages.recoveryGroupBuilder.type.comingSoon',
    metaKey: 'pages.recoveryGroupBuilder.type.resourceTypes.database',
  },
  {
    id: 'fusion',
    titleKey: 'pages.recoveryGroupBuilder.type.workloads.fusion.title',
    descriptionKey: 'pages.recoveryGroupBuilder.type.comingSoon',
    metaKey: 'pages.recoveryGroupBuilder.type.resourceTypes.application',
  },
  {
    id: 'active-directory',
    titleKey: 'pages.recoveryGroupBuilder.type.workloads.activeDirectory.title',
    descriptionKey: 'pages.recoveryGroupBuilder.type.comingSoon',
    metaKey: 'pages.recoveryGroupBuilder.type.resourceTypes.domainController',
  },
  {
    id: 'db2',
    titleKey: 'pages.recoveryGroupBuilder.type.workloads.db2.title',
    descriptionKey: 'pages.recoveryGroupBuilder.type.comingSoon',
    metaKey: 'pages.recoveryGroupBuilder.type.resourceTypes.database',
  },
]

const STORAGE_WORKLOADS: WorkloadCardDefinition[] = [
  {
    id: 'flashsystem',
    titleKey: 'pages.recoveryGroupBuilder.type.workloads.flashSystem.title',
    descriptionKey: 'pages.recoveryGroupBuilder.type.workloads.flashSystem.description',
    metaKey: 'pages.recoveryGroupBuilder.type.resourceTypes.volume',
    workloadType: 'ibm_flashsystem',
    resourceType: 'volume',
  },
]

export function RecoveryGroupTypeStep({
  sourceCategory,
  selected,
  onCategoryChange,
  onSelect,
}: RecoveryGroupTypeStepProps) {
  const { t } = useTranslation()
  const visibleCategory = sourceCategory ?? 'backup_system_workload'
  const workloads = visibleCategory === 'backup_system_workload'
    ? BACKUP_WORKLOADS
    : STORAGE_WORKLOADS
  const tabs = [
    {
      value: 'backup_system_workload' as const,
      label: t('pages.recoveryGroupBuilder.type.categories.backupWorkload'),
    },
    {
      value: 'storage_system' as const,
      label: t('pages.recoveryGroupBuilder.type.categories.storageSystem'),
    },
  ]

  return (
    <div>
      <h2 className="text-base font-semibold text-[#17233d]">
        {t('pages.recoveryGroupBuilder.type.title')}
      </h2>
      <p className="mt-1 text-sm text-[#71819a]">
        {t('pages.recoveryGroupBuilder.type.description')}
      </p>
      <p className="mt-3 text-sm text-[#52627b]">
        <span className="font-semibold">
          {t('pages.recoveryGroupBuilder.type.noteLabel')}
        </span>{' '}
        {t('pages.recoveryGroupBuilder.type.note')}
      </p>
      <Tabs
        items={tabs}
        value={visibleCategory}
        onChange={onCategoryChange}
        ariaLabel={t('pages.recoveryGroupBuilder.type.categories.ariaLabel')}
        className="mt-5 px-0"
      />
      <div
        role="tabpanel"
        className="mt-5 grid max-w-5xl gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {workloads.map(workload => {
          const isAvailable = Boolean(workload.workloadType && workload.resourceType)
          return (
            <SelectableCard
              key={workload.id}
              selected={workload.workloadType === selected}
              title={t(workload.titleKey)}
              description={t(workload.descriptionKey)}
              meta={t(workload.metaKey)}
              disabled={!isAvailable}
              onClick={() => {
                if (!workload.workloadType || !workload.resourceType) return
                onSelect(visibleCategory, workload.workloadType, workload.resourceType)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
