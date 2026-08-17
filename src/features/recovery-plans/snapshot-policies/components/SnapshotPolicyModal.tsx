import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { Modal } from '@/shared/components/modal/Modal'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { useTranslation } from '@/hooks/useTranslation'
import { useSubmitSnapshotPolicy } from '../hooks/useSubmitSnapshotPolicy'
import type { SnapshotPolicy, SnapshotPolicySubmitData, SnapshotPolicyTimeUnit } from '../model/snapshotPolicyTypes'
import { SnapshotPolicyForm } from './SnapshotPolicyForm'
import type { SnapshotPolicyFormData } from './SnapshotPolicyForm'

interface SnapshotPolicyModalProps {
  open: boolean
  onClose: () => void
  existingPolicies: SnapshotPolicy[]
  policy?: SnapshotPolicy
}

const EMPTY_FORM: SnapshotPolicyFormData = {
  id: '', name: '', description: '', level: '', frequencyValue: '1', frequencyUnit: 'minutes',
  retentionValue: '1', retentionUnit: 'days', maxSnapshots: '', enabled: true,
}

function toFormData(policy: SnapshotPolicy): SnapshotPolicyFormData {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    level: policy.level,
    frequencyValue: String(policy.frequencyValue),
    frequencyUnit: policy.frequencyUnit,
    retentionValue: String(policy.retentionValue),
    retentionUnit: policy.retentionUnit,
    maxSnapshots: policy.maxSnapshots === null ? '' : String(policy.maxSnapshots),
    enabled: policy.enabled,
  }
}

function initialForm(policy?: SnapshotPolicy) {
  return policy ? toFormData(policy) : EMPTY_FORM
}

export function SnapshotPolicyModal({ open, onClose, existingPolicies, policy }: SnapshotPolicyModalProps) {
  const { t } = useTranslation()
  const submitPolicy = useSubmitSnapshotPolicy()
  const isEdit = Boolean(policy)
  const [formData, setFormData] = useState<SnapshotPolicyFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof SnapshotPolicyFormData, string>>>({})
  const [errorMessage, setErrorMessage] = useState('')
  const initial = initialForm(policy)
  const isDirty = open && JSON.stringify(formData) !== JSON.stringify(initial)
  const navigationGuard = useUnsavedChangesGuard(isDirty)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(initialForm(policy))
    setErrors({})
    setErrorMessage('')
  }, [open, policy])

  const close = () => {
    setFormData(EMPTY_FORM)
    setErrors({})
    setErrorMessage('')
    onClose()
  }

  const requestClose = () => {
    if (!submitPolicy.isPending) navigationGuard.requestNavigation(close)
  }

  const handleChange = <K extends keyof SnapshotPolicyFormData>(field: K, value: SnapshotPolicyFormData[K]) => {
    setFormData(previous => ({ ...previous, [field]: value }))
    if (errors[field]) {
      setErrors(previous => {
        const next = { ...previous }
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete next[field]
        return next
      })
    }
    setErrorMessage('')
  }

  const validate = () => {
    const next: Partial<Record<keyof SnapshotPolicyFormData, string>> = {}
    const frequency = Number(formData.frequencyValue)
    const retention = Number(formData.retentionValue)
    const maximum = formData.maxSnapshots === '' ? null : Number(formData.maxSnapshots)
    if (!formData.id.trim()) next.id = t('snapshotPolicies.validation.idRequired')
    else if (!isEdit && existingPolicies.some(entry => entry.id === formData.id.trim())) next.id = t('snapshotPolicies.validation.idExists')
    if (!formData.name.trim()) next.name = t('snapshotPolicies.validation.nameRequired')
    if (!formData.description.trim()) next.description = t('snapshotPolicies.validation.descriptionRequired')
    if (!formData.level.trim()) next.level = t('snapshotPolicies.validation.levelRequired')
    if (!Number.isInteger(frequency) || frequency < 1) next.frequencyValue = t('snapshotPolicies.validation.positiveInteger')
    if (!Number.isInteger(retention) || retention < 1) next.retentionValue = t('snapshotPolicies.validation.positiveInteger')
    if (maximum !== null && (!Number.isInteger(maximum) || maximum < 1)) next.maxSnapshots = t('snapshotPolicies.validation.positiveInteger')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const record: SnapshotPolicySubmitData = {
      id: formData.id.trim(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      level: formData.level.trim(),
      frequencyValue: Number(formData.frequencyValue),
      frequencyUnit: formData.frequencyUnit as SnapshotPolicyTimeUnit,
      retentionValue: Number(formData.retentionValue),
      retentionUnit: formData.retentionUnit as SnapshotPolicyTimeUnit,
      maxSnapshots: formData.maxSnapshots === '' ? null : Number(formData.maxSnapshots),
      enabled: formData.enabled,
    }
    submitPolicy.mutate(record, {
      onSuccess: () => { navigationGuard.runWithoutBlocking(close) },
      onError: (error: unknown) => {
        const detail = error instanceof Error ? error.message : ''
        setErrorMessage(detail ? `${t('snapshotPolicies.submitFailed')}: ${detail}` : t('snapshotPolicies.submitFailed'))
      },
    })
  }

  return (
    <>
      <Modal
        open={open}
        onClose={requestClose}
        closeOnBackdrop={false}
        size="lg"
        title={t(isEdit ? 'snapshotPolicies.modal.editTitle' : 'snapshotPolicies.modal.createTitle')}
        footer={(
          <>
            <Button onClick={requestClose} disabled={submitPolicy.isPending} size="sm" variant="outline" className="flex-1">{t('buttons.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={submitPolicy.isPending} size="sm" className="flex-1">
              {submitPolicy.isPending ? t('messages.saving') : t(isEdit ? 'snapshotPolicies.modal.editTitle' : 'snapshotPolicies.modal.createTitle')}
            </Button>
          </>
        )}
      >
        {errorMessage ? <div className="mx-6 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{errorMessage}</div> : null}
        <SnapshotPolicyForm data={formData} errors={errors} isSubmitting={submitPolicy.isPending} idDisabled={isEdit} onChange={handleChange} onSubmit={handleSubmit} />
      </Modal>
      <ConfirmDialog
        open={navigationGuard.isNavigationBlocked}
        title={t('snapshotPolicies.discard.title')}
        message={t('snapshotPolicies.discard.message')}
        cancelLabel={t('snapshotPolicies.discard.stay')}
        confirmLabel={t('snapshotPolicies.discard.confirm')}
        tone="danger"
        onCancel={navigationGuard.cancelNavigation}
        onConfirm={navigationGuard.confirmNavigation}
      />
    </>
  )
}
