import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Spinner } from '@/shared/components/spinner/Spinner'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { Modal } from '@/shared/components/modal/Modal'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { useTranslation } from '@/hooks/useTranslation'
import { useSubmitCleanRoomPolicy } from '../hooks/useSubmitCleanRoomPolicy'
import type { CleanRoomPolicy, CleanRoomPolicySubmitData } from '../model/cleanRoomPolicyTypes'
import { CleanRoomPolicyForm } from './CleanRoomPolicyForm'
import type { CleanRoomPolicyFormData } from './CleanRoomPolicyForm'

interface CleanRoomPolicyModalProps {
  open: boolean
  onClose: () => void
  existingPolicies: CleanRoomPolicy[]
  policy?: CleanRoomPolicy
}

const EMPTY_FORM: CleanRoomPolicyFormData = { id: '', name: '', description: '', enabled: true }

function initialForm(policy?: CleanRoomPolicy): CleanRoomPolicyFormData {
  return policy ? { ...policy } : EMPTY_FORM
}

export function CleanRoomPolicyModal({ open, onClose, existingPolicies, policy }: CleanRoomPolicyModalProps) {
  const { t } = useTranslation()
  const submitPolicy = useSubmitCleanRoomPolicy()
  const isEdit = Boolean(policy)
  const [formData, setFormData] = useState<CleanRoomPolicyFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof CleanRoomPolicyFormData, string>>>({})
  const [errorMessage, setErrorMessage] = useState('')
  const isDirty = open && JSON.stringify(formData) !== JSON.stringify(initialForm(policy))
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

  const handleChange = <K extends keyof CleanRoomPolicyFormData>(field: K, value: CleanRoomPolicyFormData[K]) => {
    setFormData(previous => ({ ...previous, [field]: value }))
    if (errors[field]) setErrors(previous => ({ ...previous, [field]: undefined }))
    setErrorMessage('')
  }

  const validate = () => {
    const next: Partial<Record<keyof CleanRoomPolicyFormData, string>> = {}
    if (!formData.id.trim()) next.id = t('cleanRoomPolicies.validation.idRequired')
    else if (!isEdit && existingPolicies.some(entry => entry.id === formData.id.trim())) next.id = t('cleanRoomPolicies.validation.idExists')
    if (!formData.name.trim()) next.name = t('cleanRoomPolicies.validation.nameRequired')
    if (!formData.description.trim()) next.description = t('cleanRoomPolicies.validation.descriptionRequired')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const record: CleanRoomPolicySubmitData = {
      id: formData.id.trim(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      enabled: formData.enabled,
    }
    submitPolicy.mutate(record, {
      onSuccess: () => { navigationGuard.runWithoutBlocking(close) },
      onError: (error: unknown) => {
        const detail = error instanceof Error ? error.message : ''
        setErrorMessage(detail ? `${t('cleanRoomPolicies.submitFailed')}: ${detail}` : t('cleanRoomPolicies.submitFailed'))
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
        title={t(isEdit ? 'cleanRoomPolicies.modal.editTitle' : 'cleanRoomPolicies.modal.createTitle')}
        footer={(
          <>
            <Button onClick={requestClose} disabled={submitPolicy.isPending} size="sm" variant="outline" className="flex-1">{t('buttons.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={submitPolicy.isPending} startIcon={submitPolicy.isPending ? <Spinner /> : undefined} size="sm" className="flex-1">
              {submitPolicy.isPending ? t('messages.saving') : t(isEdit ? 'cleanRoomPolicies.modal.editTitle' : 'cleanRoomPolicies.modal.createTitle')}
            </Button>
          </>
        )}
      >
        {errorMessage ? <div className="mx-6 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{errorMessage}</div> : null}
        <p className="mx-6 mt-4 text-sm text-text-muted">{t('cleanRoomPolicies.modal.description')}</p>
        <CleanRoomPolicyForm data={formData} errors={errors} isSubmitting={submitPolicy.isPending} idDisabled={isEdit} onChange={handleChange} onSubmit={handleSubmit} />
      </Modal>
      <ConfirmDialog
        open={navigationGuard.isNavigationBlocked}
        title={t('cleanRoomPolicies.discard.title')}
        message={t('cleanRoomPolicies.discard.message')}
        cancelLabel={t('cleanRoomPolicies.discard.stay')}
        confirmLabel={t('cleanRoomPolicies.discard.confirm')}
        tone="danger"
        onCancel={navigationGuard.cancelNavigation}
        onConfirm={navigationGuard.confirmNavigation}
      />
    </>
  )
}
