import { SelectableCard } from '@/shared/components/selectable-card/SelectableCard'
import { useTranslation } from '@/hooks/useTranslation'
import type {
  RecoveryGroupResourceType,
  RecoveryGroupWorkloadType,
} from '../model/recoveryGroupTypes'

interface RecoveryGroupTypeStepProps {
  selected: RecoveryGroupWorkloadType | null
  onSelect: (workloadType: RecoveryGroupWorkloadType, resourceType: RecoveryGroupResourceType) => void
}

export function RecoveryGroupTypeStep({ selected, onSelect }: RecoveryGroupTypeStepProps) {
  const { t } = useTranslation()

  return (
    <div>
      <h2 className="text-base font-semibold text-[#17233d]">{t('pages.recoveryGroupBuilder.type.title')}</h2>
      <p className="mt-1 text-sm text-[#71819a]">{t('pages.recoveryGroupBuilder.type.description')}</p>
      <div className="mt-5 grid max-w-4xl gap-4 md:grid-cols-2">
        <SelectableCard
          selected={selected === 'VMware'}
          title="VMware"
          description={t('pages.recoveryGroupBuilder.type.vmwareDescription')}
          meta={t('pages.recoveryGroupBuilder.type.vmResource')}
          onClick={() => { onSelect('VMware', 'VM') }}
        />
        <SelectableCard
          selected={selected === 'IBM FlashSystem'}
          title="IBM FlashSystem"
          description={t('pages.recoveryGroupBuilder.type.flashDescription')}
          meta={t('pages.recoveryGroupBuilder.type.volumeResource')}
          onClick={() => { onSelect('IBM FlashSystem', 'Volume') }}
        />
      </div>
    </div>
  )
}
