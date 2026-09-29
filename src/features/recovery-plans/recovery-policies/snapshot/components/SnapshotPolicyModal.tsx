import { useEffect, useState } from 'react'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { Alert } from '@/shared/components/alert/Alert'
import { Button } from '@/shared/components/button/Button'
import { Spinner } from '@/shared/components/spinner/Spinner'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { Modal } from '@/shared/components/modal/Modal'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { useTranslation } from '@/hooks/useTranslation'
import { useSubmitPolicy } from '@/generated/query/snapshot-policies/snapshot-policies.gen'
import type { SnapshotPolicyRecordOutput } from '@/generated/query/zod'
import type { SnapshotPolicyTimeUnit } from '../model/snapshotPolicyTypes'
import { SnapshotPolicyForm } from './SnapshotPolicyForm'
import type { SnapshotPolicyFormData } from './SnapshotPolicyForm'

interface SnapshotPolicyModalProps {
  open: boolean
  onClose: () => void
  existingPolicies: SnapshotPolicyRecordOutput[]
  policy?: SnapshotPolicyRecordOutput
}

const EMPTY_FORM: SnapshotPolicyFormData = {
  id: '', name: '', description: '', level: '', frequency_value: '1', frequency_unit: 'minutes',
  retention_value: '1', retention_unit: 'days', max_snapshots: '', enabled: true,
}

function toFormData(policy: SnapshotPolicyRecordOutput): SnapshotPolicyFormData {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description ?? '',
    level: policy.level ?? '',
    frequency_value: String(policy.frequency_value),
    frequency_unit: policy.frequency_unit,
    retention_value: String(policy.retention_value),
    retention_unit: policy.retention_unit,
    max_snapshots: policy.max_snapshots == null ? '' : String(policy.max_snapshots),
    enabled: policy.enabled,
  }
}

function initialForm(policy?: SnapshotPolicyRecordOutput) {
  return policy ? toFormData(policy) : EMPTY_FORM
}

export function SnapshotPolicyModal({ open, onClose, existingPolicies, policy }: SnapshotPolicyModalProps) {
  const { t } = useTranslation()
  const submitPolicy = useSubmitPolicy()
  const isEdit = Boolean(policy)
  const [formData, setFormData] = useState<SnapshotPolicyFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof SnapshotPolicyFormData, string>>>({})
  const [submitError, setSubmitError] = useState<unknown>(null)
  const submitErrorDetail = extractBackendErrorDetail(submitError)
  const initial = initialForm(policy)
  const isDirty = open && JSON.stringify(formData) !== JSON.stringify(initial)
  const navigationGuard = useUnsavedChangesGuard(isDirty)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(initialForm(policy))
    setErrors({})
    setSubmitError(null)
  }, [open, policy])

  const close = () => {
    setFormData(EMPTY_FORM)
    setErrors({})
    setSubmitError(null)
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
    setSubmitError(null)
  }

  const validate = () => {
    const next: Partial<Record<keyof SnapshotPolicyFormData, string>> = {}
    const frequency = Number(formData.frequency_value)
    const retention = Number(formData.retention_value)
    const maximum = formData.max_snapshots === '' ? null : Number(formData.max_snapshots)
    if (!formData.id.trim()) next.id = t('snapshotPolicies.validation.idRequired')
    else if (!isEdit && existingPolicies.some(entry => entry.id === formData.id.trim())) next.id = t('snapshotPolicies.validation.idExists')
    if (!formData.name.trim()) next.name = t('snapshotPolicies.validation.nameRequired')
    if (!formData.description.trim()) next.description = t('snapshotPolicies.validation.descriptionRequired')
    if (!formData.level.trim()) next.level = t('snapshotPolicies.validation.levelRequired')
    if (!Number.isInteger(frequency) || frequency < 1) next.frequency_value = t('snapshotPolicies.validation.positiveInteger')
    if (!Number.isInteger(retention) || retention < 1) next.retention_value = t('snapshotPolicies.validation.positiveInteger')
    if (maximum !== null && (!Number.isInteger(maximum) || maximum < 1)) next.max_snapshots = t('snapshotPolicies.validation.positiveInteger')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    submitPolicy.mutate({
      data: {
        id: formData.id.trim(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        level: formData.level.trim(),
        frequency_value: Number(formData.frequency_value),
        frequency_unit: formData.frequency_unit as SnapshotPolicyTimeUnit,
        retention_value: Number(formData.retention_value),
        retention_unit: formData.retention_unit as SnapshotPolicyTimeUnit,
        max_snapshots: formData.max_snapshots === '' ? null : Number(formData.max_snapshots),
        enabled: formData.enabled,
      },
    }, {
      onSuccess: () => { navigationGuard.runWithoutBlocking(close) },
      onError: (error: unknown) => { setSubmitError(error) },
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
            <Button onClick={handleSubmit} disabled={submitPolicy.isPending} startIcon={submitPolicy.isPending ? <Spinner /> : undefined} size="sm" className="flex-1">
              {submitPolicy.isPending ? t('messages.saving') : t(isEdit ? 'snapshotPolicies.modal.editTitle' : 'snapshotPolicies.modal.createTitle')}
            </Button>
          </>
        )}
      >
        {submitError ? <Alert className="mx-6 mt-4" title={t('snapshotPolicies.submitFailed')} {...(submitErrorDetail ? { description: submitErrorDetail } : {})} variant="error" /> : null}
        <p className="mx-6 mt-4 text-sm text-text-muted">{t('snapshotPolicies.modal.description')}</p>
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
