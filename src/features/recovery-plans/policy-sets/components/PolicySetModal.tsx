import { useEffect, useState } from 'react'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { Alert } from '@/shared/components/alert/Alert'
import { Button } from '@/shared/components/button/Button'
import { Spinner } from '@/shared/components/spinner/Spinner'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { Modal } from '@/shared/components/modal/Modal'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { useTranslation } from '@/hooks/useTranslation'
import { useSnapshotPolicies } from '@/features/recovery-plans/recovery-policies/snapshot/hooks/useSnapshotPolicies'
import { useRecoveryAppPolicies } from '@/features/recovery-plans/recovery-policies/application-recovery/hooks/useRecoveryAppPolicies'
import { useCleanRoomPolicies } from '@/features/recovery-plans/recovery-policies/clean-room/hooks/useCleanRoomPolicies'
import { useSubmitPolicySet } from '../hooks/useSubmitPolicySet'
import type { PolicySet, PolicySetSubmitData } from '../model/policySetTypes'
import { PolicySetForm } from './PolicySetForm'
import type { PolicySetFormData } from './PolicySetForm'

interface PolicySetModalProps {
  open: boolean
  onClose: () => void
  existingPolicySets: PolicySet[]
  policySet?: PolicySet
}

const EMPTY_FORM: PolicySetFormData = {
  id: '',
  name: '',
  description: '',
  snapshotPolicyId: '',
  recoveryAppPolicyId: '',
  cleanRoomPolicyId: '',
}

function toFormData(policySet: PolicySet): PolicySetFormData {
  return {
    id: policySet.id,
    name: policySet.name,
    description: policySet.description,
    snapshotPolicyId: policySet.snapshotPolicyId,
    recoveryAppPolicyId: policySet.recoveryAppPolicyId,
    cleanRoomPolicyId: policySet.cleanRoomPolicyId,
  }
}

function initialForm(policySet?: PolicySet) {
  return policySet ? toFormData(policySet) : EMPTY_FORM
}

export function PolicySetModal({ open, onClose, existingPolicySets, policySet }: PolicySetModalProps) {
  const { t } = useTranslation()
  const submitPolicySet = useSubmitPolicySet()
  const snapshotPoliciesQuery = useSnapshotPolicies()
  const recoveryAppPoliciesQuery = useRecoveryAppPolicies()
  const cleanRoomPoliciesQuery = useCleanRoomPolicies()
  const isEdit = Boolean(policySet)
  const [formData, setFormData] = useState<PolicySetFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof PolicySetFormData, string>>>({})
  const [submitError, setSubmitError] = useState<unknown>(null)
  const submitErrorDetail = extractBackendErrorDetail(submitError)
  const initial = initialForm(policySet)
  const isDirty = open && JSON.stringify(formData) !== JSON.stringify(initial)
  const navigationGuard = useUnsavedChangesGuard(isDirty)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(initialForm(policySet))
    setErrors({})
    setSubmitError(null)
  }, [open, policySet])

  const close = () => {
    setFormData(EMPTY_FORM)
    setErrors({})
    setSubmitError(null)
    onClose()
  }

  const requestClose = () => {
    if (!submitPolicySet.isPending) navigationGuard.requestNavigation(close)
  }

  const handleChange = <K extends keyof PolicySetFormData>(field: K, value: PolicySetFormData[K]) => {
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
    const next: Partial<Record<keyof PolicySetFormData, string>> = {}
    if (!formData.id.trim()) next.id = t('policySets.validation.idRequired')
    else if (!isEdit && existingPolicySets.some(entry => entry.id === formData.id.trim())) next.id = t('policySets.validation.idExists')
    if (!formData.name.trim()) next.name = t('policySets.validation.nameRequired')
    if (!formData.description.trim()) next.description = t('policySets.validation.descriptionRequired')
    if (!formData.snapshotPolicyId.trim()) next.snapshotPolicyId = t('policySets.validation.policiesRequired')
    if (!formData.recoveryAppPolicyId.trim()) next.recoveryAppPolicyId = t('policySets.validation.recoveryAppPolicyRequired')
    if (!formData.cleanRoomPolicyId.trim()) next.cleanRoomPolicyId = t('policySets.validation.cleanRoomPolicyRequired')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const record: PolicySetSubmitData = {
      id: formData.id.trim(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      snapshotPolicyId: formData.snapshotPolicyId,
      recoveryAppPolicyId: formData.recoveryAppPolicyId.trim(),
      cleanRoomPolicyId: formData.cleanRoomPolicyId.trim(),
    }
    submitPolicySet.mutate(record, {
      onSuccess: () => { navigationGuard.runWithoutBlocking(close) },
      onError: (error: unknown) => {
        setSubmitError(error)
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
        title={t(isEdit ? 'policySets.modal.editTitle' : 'policySets.modal.createTitle')}
        footer={(
          <>
            <Button onClick={requestClose} disabled={submitPolicySet.isPending} size="sm" variant="outline" className="flex-1">{t('buttons.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={submitPolicySet.isPending} startIcon={submitPolicySet.isPending ? <Spinner /> : undefined} size="sm" className="flex-1">
              {submitPolicySet.isPending ? t('messages.saving') : t(isEdit ? 'policySets.modal.editTitle' : 'policySets.modal.createTitle')}
            </Button>
          </>
        )}
      >
        {submitError ? (
          <Alert
            className="mx-6 mt-4"
            title={t('policySets.submitFailed')}
            {...(submitErrorDetail ? { description: submitErrorDetail } : {})}
            variant="error"
          />
        ) : null}
        <PolicySetForm
          data={formData}
          errors={errors}
          availableSnapshotPolicies={snapshotPoliciesQuery.data ?? []}
          availableRecoveryAppPolicies={recoveryAppPoliciesQuery.data ?? []}
          availableCleanRoomPolicies={cleanRoomPoliciesQuery.data ?? []}
          isRecoveryAppPoliciesLoading={recoveryAppPoliciesQuery.isLoading}
          recoveryAppPoliciesError={recoveryAppPoliciesQuery.error}
          onRetryRecoveryAppPolicies={() => { void recoveryAppPoliciesQuery.refetch() }}
          isCleanRoomPoliciesLoading={cleanRoomPoliciesQuery.isLoading}
          cleanRoomPoliciesError={cleanRoomPoliciesQuery.error}
          onRetryCleanRoomPolicies={() => { void cleanRoomPoliciesQuery.refetch() }}
          isSubmitting={submitPolicySet.isPending}
          idDisabled={isEdit}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      </Modal>
      <ConfirmDialog
        open={navigationGuard.isNavigationBlocked}
        title={t('policySets.discard.title')}
        message={t('policySets.discard.message')}
        cancelLabel={t('policySets.discard.stay')}
        confirmLabel={t('policySets.discard.confirm')}
        tone="danger"
        onCancel={navigationGuard.cancelNavigation}
        onConfirm={navigationGuard.confirmNavigation}
      />
    </>
  )
}
