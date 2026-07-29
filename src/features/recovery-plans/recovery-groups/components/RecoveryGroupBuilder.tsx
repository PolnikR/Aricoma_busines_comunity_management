import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { WizardSteps } from '@/shared/components/wizard-steps/WizardSteps'
import { isProgrammaticIdAvailable } from '@/shared/utils/programmaticId'
import { useTranslation } from '@/hooks/useTranslation'
import type { RecoveryGroup, RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import { RecoveryGroupDetailsStep } from './RecoveryGroupDetailsStep'
import { RecoveryGroupResourcesStep } from './RecoveryGroupResourcesStep'
import { RecoveryGroupTypeStep } from './RecoveryGroupTypeStep'

interface RecoveryGroupBuilderProps {
  onCreate: (draft: RecoveryGroupDraft) => void
  onCancel: () => void
  onDirtyChange?: (isDirty: boolean) => void
  initialData?: RecoveryGroup
  submitLabel?: string
  existingIds?: string[]
  isSaving?: boolean
}

const INITIAL_DRAFT: RecoveryGroupDraft = {
  id: '',
  name: '',
  description: '',
  sourceCategory: null,
  workloadType: null,
  resourceType: null,
  resources: [],
}

export function RecoveryGroupBuilder({
  onCreate,
  onCancel,
  onDirtyChange,
  initialData,
  submitLabel,
  existingIds = [],
  isSaving = false,
}: RecoveryGroupBuilderProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<RecoveryGroupDraft>(() => initialData
    ? {
        id: initialData.id,
        name: initialData.name,
        description: initialData.description,
        sourceCategory: initialData.sourceCategory,
        workloadType: initialData.workloadType,
        resourceType: initialData.resourceType,
        resources: [...initialData.resources],
      }
    : INITIAL_DRAFT)
  const idAvailable = isProgrammaticIdAvailable(
    draft.id,
    existingIds,
    initialData?.id,
  )
  const detailsValid = Boolean(
    draft.id
    && idAvailable
    && draft.name.trim()
    && draft.description.trim(),
  )
  const typeValid = Boolean(draft.sourceCategory && draft.workloadType && draft.resourceType)
  const steps = [
    { id: 'details', label: t('pages.recoveryGroupBuilder.steps.details') },
    { id: 'type', label: t('pages.recoveryGroupBuilder.steps.type'), disabled: !detailsValid },
    { id: 'resources', label: t('pages.recoveryGroupBuilder.steps.resources'), disabled: !detailsValid || !typeValid },
  ]

  const updateDraft = (update: Partial<RecoveryGroupDraft>) => {
    setDraft(current => ({ ...current, ...update }))
    onDirtyChange?.(true)
  }

  const canContinue = step === 1
    ? detailsValid
    : step === 2
      ? typeValid
      : draft.resources.length > 0
  const canCreate = Boolean(
    draft.name.trim()
    && draft.id
    && idAvailable
    && draft.description.trim()
    && draft.sourceCategory
    && draft.workloadType
    && draft.resourceType
    && draft.resources.length > 0,
  )

  return (
    <div className="flex min-h-0 flex-1 p-4">
      <div className="grid min-h-0 flex-1 overflow-hidden rounded-lg border border-[#e3edf6] bg-white shadow-sm lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-[#e3edf6] bg-[#fbfdff] lg:border-b-0 lg:border-r">
          <WizardSteps
            items={steps}
            currentStep={step}
            ariaLabel={t('pages.recoveryGroupBuilder.steps.ariaLabel')}
            onStepChange={setStep}
          />
        </aside>
        <div className="flex min-h-0 flex-col">
          <div className={`custom-scrollbar min-h-0 flex-1 p-5 sm:p-6 ${
            step === 3 ? 'overflow-hidden' : 'overflow-y-auto'
          }`}>
            {step === 1 ? (
              <RecoveryGroupDetailsStep
                id={draft.id}
                name={draft.name}
                description={draft.description}
                existingIds={existingIds}
                {...(initialData ? { currentId: initialData.id, disableId: true } : {})}
                onChange={updateDraft}
              />
            ) : null}
            {step === 2 ? (
              <RecoveryGroupTypeStep
                sourceCategory={draft.sourceCategory}
                selected={draft.workloadType}
                readOnly={Boolean(initialData)}
                onCategoryChange={(sourceCategory) => {
                  updateDraft({
                    sourceCategory,
                    workloadType: null,
                    resourceType: null,
                    resources: [],
                  })
                }}
                onSelect={(sourceCategory, workloadType, resourceType) => {
                  updateDraft({
                    sourceCategory,
                    workloadType,
                    resourceType,
                    resources: draft.workloadType === workloadType ? draft.resources : [],
                  })
                }}
              />
            ) : null}
            {step === 3 ? (
              <RecoveryGroupResourcesStep
                workloadType={draft.workloadType}
                resources={draft.resources}
                onAdd={resource => {
                  if (!draft.resources.includes(resource)) {
                    updateDraft({ resources: [...draft.resources, resource] })
                  }
                }}
                onRemove={resource => {
                  updateDraft({ resources: draft.resources.filter(item => item !== resource) })
                }}
              />
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-[#e3edf6] bg-[#fbfdff] p-4 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={onCancel}>{t('buttons.cancel')}</Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                disabled={step === 1}
                onClick={() => { setStep(current => Math.max(1, current - 1)) }}
              >
                {t('buttons.back')}
              </Button>
              {step < 3 ? (
                <Button
                  disabled={!canContinue}
                  onClick={() => { setStep(current => Math.min(3, current + 1)) }}
                >
                  {t('buttons.next')}
                </Button>
              ) : (
                <Button disabled={!canCreate || isSaving} onClick={() => { onCreate(draft) }}>
                  {isSaving ? t('messages.saving') : (submitLabel ?? t('pages.recoveryGroupBuilder.createButton'))}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
