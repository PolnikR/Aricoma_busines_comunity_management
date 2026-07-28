import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { WizardSteps } from '@/shared/components/wizard-steps/WizardSteps'
import { useTranslation } from '@/hooks/useTranslation'
import type { RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import { RecoveryGroupDetailsStep } from './RecoveryGroupDetailsStep'
import { RecoveryGroupResourcesStep } from './RecoveryGroupResourcesStep'
import { RecoveryGroupTypeStep } from './RecoveryGroupTypeStep'

interface RecoveryGroupBuilderProps {
  onCreate: (draft: RecoveryGroupDraft) => void
  onCancel: () => void
  onDirtyChange?: (isDirty: boolean) => void
}

const INITIAL_DRAFT: RecoveryGroupDraft = {
  name: '',
  description: '',
  workloadType: null,
  resourceType: null,
  resources: [],
}

export function RecoveryGroupBuilder({
  onCreate,
  onCancel,
  onDirtyChange,
}: RecoveryGroupBuilderProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<RecoveryGroupDraft>(INITIAL_DRAFT)
  const steps = [
    { id: 'details', label: t('pages.recoveryGroupBuilder.steps.details') },
    { id: 'type', label: t('pages.recoveryGroupBuilder.steps.type') },
    { id: 'resources', label: t('pages.recoveryGroupBuilder.steps.resources') },
  ]

  const updateDraft = (update: Partial<RecoveryGroupDraft>) => {
    setDraft(current => ({ ...current, ...update }))
    onDirtyChange?.(true)
  }

  const canContinue = step === 1
    ? Boolean(draft.name.trim() && draft.description.trim())
    : step === 2
      ? Boolean(draft.workloadType && draft.resourceType)
      : draft.resources.length > 0

  return (
    <div className="flex min-h-0 flex-1 p-4">
      <div className="grid min-h-0 flex-1 overflow-hidden rounded-lg border border-[#e3edf6] bg-white shadow-sm lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-[#e3edf6] bg-[#fbfdff] lg:border-b-0 lg:border-r">
          <WizardSteps
            items={steps}
            currentStep={step}
            ariaLabel={t('pages.recoveryGroupBuilder.steps.ariaLabel')}
          />
        </aside>
        <div className="flex min-h-0 flex-col">
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
            {step === 1 ? (
              <RecoveryGroupDetailsStep
                name={draft.name}
                description={draft.description}
                onChange={updateDraft}
              />
            ) : null}
            {step === 2 ? (
              <RecoveryGroupTypeStep
                selected={draft.workloadType}
                onSelect={(workloadType, resourceType) => {
                  updateDraft({
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
                <Button disabled={!canContinue} onClick={() => { onCreate(draft) }}>
                  {t('pages.recoveryGroupBuilder.createButton')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
