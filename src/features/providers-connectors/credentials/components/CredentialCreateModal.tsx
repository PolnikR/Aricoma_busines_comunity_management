import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Modal } from '@/shared/components/modal/Modal'
import { useTranslation } from '@/hooks/useTranslation'
import { useCreateCredential } from '../api/useCreateCredential'
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
  const [submitError, setSubmitError] = useState('')
  const [isEncrypting, setIsEncrypting] = useState(false)
  const isSubmitting = createCredential.isPending || isEncrypting
  const isEdit = Boolean(credential)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(credential
      ? {
          id: credential.id,
          name: credential.name,
          description: credential.description,
          username: credential.username,
          password: '',
          confirmPassword: '',
        }
      : EMPTY_FORM)
    setErrors({})
    setSubmitError('')
  }, [credential, open])

  const close = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setSubmitError('')
    onClose()
  }
  const requestClose = () => {
    if (!isSubmitting) close()
  }

  const change = (field: keyof CredentialCreateFormData, value: string) => {
    setForm(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined }))
    setSubmitError('')
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
    setSubmitError('')
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
        onSuccess: close,
        onError: (error: unknown) => {
          setSubmitError(error instanceof Error ? error.message : t('credentials.errors.create'))
        },
      })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('credentials.errors.create'))
    } finally {
      setIsEncrypting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={requestClose}
      title={t(isEdit ? 'credentials.modal.editTitle' : 'credentials.modal.title')}
      size="lg"
      footer={(
        <>
          <Button variant="outline" size="sm" className="flex-1" disabled={isSubmitting} onClick={close}>
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
        <div className="mx-6 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {submitError}
        </div>
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
  )
}
