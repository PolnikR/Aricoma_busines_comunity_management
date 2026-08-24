import { useEffect, useState } from 'react'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { Alert } from '@/shared/components/alert/Alert'
import { Button } from '@/shared/components/button/Button'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { Modal } from '@/shared/components/modal/Modal'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { useTranslation } from '@/hooks/useTranslation'
import { useCreateCredential } from '../hooks/useCreateCredential'
import { createEncryptedCredentialPayload } from '../api/credentialsApi'
import type { CredentialFormData, CredentialRecord } from '../model/credentialTypes'
import { CredentialCreateForm } from './CredentialCreateForm'
import type { CredentialCreateFormData } from './CredentialCreateForm'

interface CredentialCreateModalProps {
  open: boolean
  onClose: () => void
  existingCredentials: CredentialRecord[]
  credential?: CredentialRecord
}

const EMPTY_FORM: CredentialCreateFormData = {
  id: '',
  name: '',
  description: '',
  username: '',
  password: '',
  confirmPassword: '',
}

function createInitialForm(credential?: CredentialRecord): CredentialCreateFormData {
  return credential
    ? {
        id: credential.id,
        name: credential.name,
        description: credential.description,
        username: credential.username,
        password: '',
        confirmPassword: '',
      }
    : EMPTY_FORM
}

export function CredentialCreateModal({
  open,
  onClose,
  existingCredentials,
  credential,
}: CredentialCreateModalProps) {
  const { t } = useTranslation()
  const createCredential = useCreateCredential()
  const [form, setForm] = useState<CredentialCreateFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof CredentialCreateFormData, string>>>({})
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [isEncrypting, setIsEncrypting] = useState(false)
  const submitErrorDescription = extractBackendErrorDetail(submitError)
  const isSubmitting = createCredential.isPending || isEncrypting
  const isEdit = Boolean(credential)
  const initialForm = createInitialForm(credential)
  const isDirty = open && (
    form.id !== initialForm.id
    || form.name !== initialForm.name
    || form.description !== initialForm.description
    || form.username !== initialForm.username
    || form.password !== initialForm.password
    || form.confirmPassword !== initialForm.confirmPassword
  )
  const navigationGuard = useUnsavedChangesGuard(isDirty)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(createInitialForm(credential))
    setErrors({})
    setSubmitError(null)
  }, [credential, open])

  const close = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setSubmitError(null)
    onClose()
  }
  const requestClose = () => {
    if (!isSubmitting) navigationGuard.requestNavigation(close)
  }

  const change = (field: keyof CredentialCreateFormData, value: string) => {
    setForm(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined }))
    setSubmitError(null)
  }

  const validate = () => {
    const next: Partial<Record<keyof CredentialCreateFormData, string>> = {}
    if (!form.id.trim()) next.id = t('credentials.validation.idRequired')
    else if (!isEdit && existingCredentials.some(item => item.id === form.id.trim())) {
      next.id = t('credentials.validation.idExists')
    }
    if (!form.name.trim()) next.name = t('credentials.validation.nameRequired')
    if (!form.description.trim()) next.description = t('credentials.validation.descriptionRequired')
    if (!form.username.trim()) next.username = t('credentials.validation.usernameRequired')
    if (!form.password) next.password = t('credentials.validation.passwordRequired')
    if (!form.confirmPassword) {
      next.confirmPassword = t('credentials.validation.confirmPasswordRequired')
    } else if (form.password !== form.confirmPassword) {
      next.confirmPassword = t('credentials.validation.passwordMismatch')
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setIsEncrypting(true)
    setSubmitError(null)
    try {
      const credential: CredentialFormData = {
        id: form.id,
        name: form.name,
        description: form.description,
        username: form.username,
        password: form.password,
      }
      const payload = await createEncryptedCredentialPayload(credential)
      createCredential.mutate(payload, {
        onSuccess: () => { navigationGuard.runWithoutBlocking(close) },
        onError: (error: unknown) => {
          setSubmitError(error)
        },
      })
    } catch (error) {
      setSubmitError(error)
    } finally {
      setIsEncrypting(false)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={requestClose}
        closeOnBackdrop={false}
        title={t(isEdit ? 'credentials.modal.editTitle' : 'credentials.modal.title')}
        footer={(
          <>
            <Button variant="outline" size="sm" className="flex-1" disabled={isSubmitting} onClick={requestClose}>
              {t('buttons.cancel')}
            </Button>
            <Button size="sm" className="flex-1" disabled={isSubmitting} onClick={() => { void submit() }}>
              {isSubmitting
                ? t('messages.saving')
                : t(isEdit ? 'credentials.modal.save' : 'credentials.modal.submit')}
            </Button>
          </>
        )}
      >
        {submitError ? (
          <Alert
            className="mx-6 mt-4"
            title={t(isEdit ? 'credentials.errors.edit' : 'credentials.errors.create')}
            {...(submitErrorDescription ? { description: submitErrorDescription } : {})}
            variant="error"
          />
        ) : null}
        <CredentialCreateForm
          data={form}
          errors={errors}
          isSubmitting={isSubmitting}
          idDisabled={isEdit}
          onChange={change}
          onSubmit={() => { void submit() }}
        />
      </Modal>
      <ConfirmDialog
        open={navigationGuard.isNavigationBlocked}
        title={t('credentials.discard.title')}
        message={t('credentials.discard.message')}
        cancelLabel={t('credentials.discard.stay')}
        confirmLabel={t('credentials.discard.confirm')}
        tone="danger"
        onCancel={navigationGuard.cancelNavigation}
        onConfirm={navigationGuard.confirmNavigation}
      />
    </>
  )
}
