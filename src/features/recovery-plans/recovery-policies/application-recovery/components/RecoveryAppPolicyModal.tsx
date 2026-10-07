import { useEffect, useState } from 'react'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { Alert } from '@/shared/components/alert/Alert'
import { Button } from '@/shared/components/button/Button'
import { Spinner } from '@/shared/components/spinner/Spinner'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { Modal } from '@/shared/components/modal/Modal'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { useTranslation } from '@/hooks/useTranslation'
import { useSubmitRecoveryAppPolicy } from '@/generated/query/recovery-app-policies/recovery-app-policies.gen'
import {
  submitRecoveryAppPolicyBodyManualZoningDefault,
  submitRecoveryAppPolicyBodySourceShutdownTimeoutSecondsDefault,
  submitRecoveryAppPolicyBodyTargetLparPrefixDefault,
  submitRecoveryAppPolicyBodyTargetLparPrefixRegExp,
  submitRecoveryAppPolicyBodyZoningWaitMinutesDefault,
} from '@/generated/query/zod'
import type { RecoveryAppPolicyRecordOutput } from '@/generated/query/zod'
import { toRecoveryAppPolicySubmitPayload } from '../model/recoveryAppPolicySubmit'
import type { RecoveryAppPolicySelectionMode, RecoveryAppPolicyTimeUnit } from '../model/recoveryAppPolicyTypes'
import { RecoveryAppPolicyForm } from './RecoveryAppPolicyForm'
import type { RecoveryAppPolicyFormData } from './RecoveryAppPolicyForm'

interface RecoveryAppPolicyModalProps {
  open: boolean
  onClose: () => void
  existingPolicies: RecoveryAppPolicyRecordOutput[]
  policy?: RecoveryAppPolicyRecordOutput
}

const EMPTY_FORM: RecoveryAppPolicyFormData = {
  id: '', name: '', description: '', level: '', frequency_value: '1', frequency_unit: 'minutes',
  retention_value: '1', retention_unit: 'days', boot_verify: false, snapshot_selection_mode: 'latest',
  snapshot_max_age_value: '', snapshot_max_age_unit: '', snapshot_target_time: '', enabled: true,
  target_lpar_prefix: submitRecoveryAppPolicyBodyTargetLparPrefixDefault,
  manual_zoning: submitRecoveryAppPolicyBodyManualZoningDefault,
  source_shutdown_timeout_seconds: String(submitRecoveryAppPolicyBodySourceShutdownTimeoutSecondsDefault),
  zoning_wait_minutes: String(submitRecoveryAppPolicyBodyZoningWaitMinutesDefault),
}

function toFormData(policy: RecoveryAppPolicyRecordOutput): RecoveryAppPolicyFormData {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description ?? '',
    level: policy.level ?? '',
    frequency_value: String(policy.frequency_value),
    frequency_unit: policy.frequency_unit,
    retention_value: String(policy.retention_value),
    retention_unit: policy.retention_unit,
    boot_verify: policy.boot_verify,
    snapshot_selection_mode: policy.snapshot_selection_mode,
    snapshot_max_age_value: policy.snapshot_max_age_value == null ? '' : String(policy.snapshot_max_age_value),
    snapshot_max_age_unit: policy.snapshot_max_age_unit ?? '',
    snapshot_target_time: policy.snapshot_target_time ?? '',
    enabled: policy.enabled,
    target_lpar_prefix: policy.target_lpar_prefix,
    manual_zoning: policy.manual_zoning,
    source_shutdown_timeout_seconds: String(policy.source_shutdown_timeout_seconds),
    zoning_wait_minutes: String(policy.zoning_wait_minutes),
  }
}

function initialForm(policy?: RecoveryAppPolicyRecordOutput) {
  return policy ? toFormData(policy) : EMPTY_FORM
}

function isSelectionMode(value: string): value is RecoveryAppPolicySelectionMode {
  return value === 'latest' || value === 'time_range' || value === 'exact_time'
}

function isTimeUnit(value: string): value is RecoveryAppPolicyTimeUnit {
  return value === 'minutes' || value === 'hours' || value === 'days'
}

export function RecoveryAppPolicyModal({ open, onClose, existingPolicies, policy }: RecoveryAppPolicyModalProps) {
  const { t } = useTranslation()
  const submitPolicy = useSubmitRecoveryAppPolicy()
  const isEdit = Boolean(policy)
  const [formData, setFormData] = useState<RecoveryAppPolicyFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof RecoveryAppPolicyFormData, string>>>({})
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

  const handleChange = <K extends keyof RecoveryAppPolicyFormData>(field: K, value: RecoveryAppPolicyFormData[K]) => {
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
    const next: Partial<Record<keyof RecoveryAppPolicyFormData, string>> = {}
    const frequency = Number(formData.frequency_value)
    const retention = Number(formData.retention_value)
    const maxAge = formData.snapshot_max_age_value === '' ? null : Number(formData.snapshot_max_age_value)
    const shutdownTimeout = formData.source_shutdown_timeout_seconds === '' ? null : Number(formData.source_shutdown_timeout_seconds)
    const zoningWait = formData.zoning_wait_minutes === '' ? null : Number(formData.zoning_wait_minutes)
    const mode = formData.snapshot_selection_mode
    if (!formData.id.trim()) next.id = t('recoveryAppPolicies.validation.idRequired')
    else if (!isEdit && existingPolicies.some(entry => entry.id === formData.id.trim())) next.id = t('recoveryAppPolicies.validation.idExists')
    if (!formData.name.trim()) next.name = t('recoveryAppPolicies.validation.nameRequired')
    if (!formData.description.trim()) next.description = t('recoveryAppPolicies.validation.descriptionRequired')
    if (!formData.level.trim()) next.level = t('recoveryAppPolicies.validation.levelRequired')
    if (!Number.isInteger(frequency) || frequency < 1) next.frequency_value = t('recoveryAppPolicies.validation.positiveInteger')
    if (!Number.isInteger(retention) || retention < 1) next.retention_value = t('recoveryAppPolicies.validation.positiveInteger')
    if (!isSelectionMode(mode)) next.snapshot_selection_mode = t('recoveryAppPolicies.validation.selectionRequired')
    if (mode === 'time_range') {
      if (maxAge === null || !Number.isInteger(maxAge) || maxAge < 1) next.snapshot_max_age_value = t('recoveryAppPolicies.validation.positiveInteger')
      if (!isTimeUnit(formData.snapshot_max_age_unit)) next.snapshot_max_age_unit = t('recoveryAppPolicies.validation.unitRequired')
    }
    if (mode === 'exact_time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(formData.snapshot_target_time)) next.snapshot_target_time = t('recoveryAppPolicies.validation.targetTime')
    if (!submitRecoveryAppPolicyBodyTargetLparPrefixRegExp.test(formData.target_lpar_prefix.trim())) next.target_lpar_prefix = t('recoveryAppPolicies.validation.lparPrefix')
    if (shutdownTimeout === null || !Number.isInteger(shutdownTimeout) || shutdownTimeout < 1) next.source_shutdown_timeout_seconds = t('recoveryAppPolicies.validation.positiveInteger')
    if (zoningWait === null || !Number.isInteger(zoningWait) || zoningWait < 1) next.zoning_wait_minutes = t('recoveryAppPolicies.validation.positiveInteger')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    submitPolicy.mutate({ data: toRecoveryAppPolicySubmitPayload(formData) }, {
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
        title={t(isEdit ? 'recoveryAppPolicies.modal.editTitle' : 'recoveryAppPolicies.modal.createTitle')}
        footer={(
          <>
            <Button onClick={requestClose} disabled={submitPolicy.isPending} size="sm" variant="outline" className="flex-1">{t('buttons.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={submitPolicy.isPending} startIcon={submitPolicy.isPending ? <Spinner /> : undefined} size="sm" className="flex-1">
              {submitPolicy.isPending ? t('messages.saving') : t(isEdit ? 'recoveryAppPolicies.modal.editTitle' : 'recoveryAppPolicies.modal.createTitle')}
            </Button>
          </>
        )}
      >
        {submitError ? <Alert className="mx-6 mt-4" title={t('recoveryAppPolicies.submitFailed')} {...(submitErrorDetail ? { description: submitErrorDetail } : {})} variant="error" /> : null}
        <p className="mx-6 mt-4 text-sm text-text-muted">{t('recoveryAppPolicies.modal.description')}</p>
        <RecoveryAppPolicyForm data={formData} errors={errors} isSubmitting={submitPolicy.isPending} idDisabled={isEdit} onChange={handleChange} onSubmit={handleSubmit} />
      </Modal>
      <ConfirmDialog
        open={navigationGuard.isNavigationBlocked}
        title={t('recoveryAppPolicies.discard.title')}
        message={t('recoveryAppPolicies.discard.message')}
        cancelLabel={t('recoveryAppPolicies.discard.stay')}
        confirmLabel={t('recoveryAppPolicies.discard.confirm')}
        tone="danger"
        onCancel={navigationGuard.cancelNavigation}
        onConfirm={navigationGuard.confirmNavigation}
      />
    </>
  )
}
