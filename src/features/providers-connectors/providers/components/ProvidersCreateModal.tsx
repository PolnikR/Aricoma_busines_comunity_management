import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { Modal } from '@/shared/components/modal/Modal'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { useTranslation } from '@/hooks/useTranslation'
import { isProgrammaticIdAvailable, toProgrammaticId } from '@/shared/utils/programmaticId'
import { useUpsertProvider } from '../hooks/useUpsertProvider'
import { useCredentials } from '../../credentials/hooks/useCredentials'
import { ProviderCreateForm } from './ProviderCreateForm'
import type { ProviderRecord, ProviderSubmitData, ProviderType } from '../model/providerTypes'
import type { ProviderCreateFormData } from './ProviderCreateForm'

interface ProvidersCreateModalProps {
  open: boolean
  onClose: () => void
  existingProviders: ProviderRecord[]
  // When supplied the modal is in edit mode: fields are prefilled and the ID
  // is locked (the submit endpoint upserts by id).
  provider?: ProviderRecord
}

const EMPTY_FORM: ProviderCreateFormData = {
  id: '',
  name: '',
  description: '',
  type: '',
  ipAddress: '',
  port: '22',
  credentialId: '',
}

function createInitialForm(provider?: ProviderRecord): ProviderCreateFormData {
  return provider
    ? {
        id: provider.id,
        name: provider.name,
        description: provider.description,
        type: provider.type,
        ipAddress: provider.ipAddress,
        port: String(provider.port ?? 22),
        credentialId: provider.credentialId ?? '',
      }
    : EMPTY_FORM
}

// Modal for creating or editing a provider.
export function ProvidersCreateModal({ open, onClose, existingProviders, provider }: ProvidersCreateModalProps) {
  const { t } = useTranslation()
  const upsert = useUpsertProvider()
  const credentialsQuery = useCredentials({ enabled: open })
  const isEdit = Boolean(provider)
  const [formData, setFormData] = useState<ProviderCreateFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof ProviderCreateFormData, string>>>({})
  const [errorMessage, setErrorMessage] = useState('')
  const initialForm = createInitialForm(provider)
  const isDirty = open && (
    formData.id !== initialForm.id
    || formData.name !== initialForm.name
    || formData.description !== initialForm.description
    || formData.type !== initialForm.type
    || formData.ipAddress !== initialForm.ipAddress
    || formData.port !== initialForm.port
    || formData.credentialId !== initialForm.credentialId
  )
  const navigationGuard = useUnsavedChangesGuard(isDirty)

  // Prefill (edit) or clear (create) the form each time the modal opens.
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(createInitialForm(provider))
    setErrors({})
    setErrorMessage('')
  }, [open, provider])

  const close = () => {
    setFormData(EMPTY_FORM)
    setErrors({})
    setErrorMessage('')
    onClose()
  }

  const requestClose = () => {
    if (!upsert.isPending) navigationGuard.requestNavigation(close)
  }

  const handleChange = (field: keyof ProviderCreateFormData, value: string) => {
    setFormData((prev) => {
      if (field === 'name' && !isEdit) {
        const previousDerivedId = toProgrammaticId(prev.name)
        if (!prev.id || prev.id === previousDerivedId) {
          return {
            ...prev,
            name: value,
            id: toProgrammaticId(value),
          }
        }
      }

      return { ...prev, [field]: value }
    })
    if (field in errors && errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete newErrors[field]
        return newErrors
      })
    }
    setErrorMessage('')
  }

  const handleIdBlur = () => {
    if (isEdit) return
    setFormData((prev) => ({ ...prev, id: toProgrammaticId(prev.id) }))
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProviderCreateFormData, string>> = {}
    const normalizedId = toProgrammaticId(formData.id)
    if (!normalizedId) newErrors.id = t('forms.idRequired')
    else if (!isProgrammaticIdAvailable(
      normalizedId,
      existingProviders.map(entry => toProgrammaticId(entry.id)),
      isEdit ? toProgrammaticId(provider?.id ?? '') : undefined,
    )) {
      newErrors.id = t('providers.validation.idExists')
    }
    if (!formData.name.trim()) newErrors.name = t('forms.nameRequired')
    if (!formData.description.trim()) newErrors.description = t('forms.descriptionRequired')
    if (!formData.type) newErrors.type = t('forms.typeRequired')
    if (!formData.ipAddress.trim()) newErrors.ipAddress = t('forms.ipRequired')
    const port = Number(formData.port)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      newErrors.port = t('forms.portRequired')
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return

    setErrorMessage('')

    const record: ProviderSubmitData = {
      id: isEdit ? formData.id.trim() : toProgrammaticId(formData.id),
      name: formData.name.trim(),
      description: formData.description.trim(),
      type: formData.type as ProviderType,
      ipAddress: formData.ipAddress.trim(),
      credentialId: formData.credentialId || null,
    }

    upsert.mutate(
      { provider: record },
      {
        onSuccess: () => { navigationGuard.runWithoutBlocking(close) },
        onError: (err: unknown) => {
          const detail = err instanceof Error ? err.message : ''
          setErrorMessage(detail ? `${t('providers.submitFailed')}: ${detail}` : t('providers.submitFailed'))
        },
      },
    )
  }

  return (
    <>
      <Modal
        open={open}
        onClose={requestClose}
        closeOnBackdrop={false}
        title={t(isEdit ? 'providers.modal.editTitle' : 'providers.modal.createTitle')}
        footer={(
          <>
          <Button
            onClick={requestClose}
            disabled={upsert.isPending}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            {t('buttons.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={upsert.isPending}
            size="sm"
            className="flex-1"
          >
            {upsert.isPending
              ? t(isEdit ? 'messages.saving' : 'messages.creating')
              : t(isEdit ? 'providers.modal.editTitle' : 'providers.modal.createTitle')}
          </Button>
          </>
        )}
      >
        {errorMessage ? (
          <div className="mx-6 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <ProviderCreateForm
          data={formData}
          errors={errors}
          isSubmitting={upsert.isPending}
          idDisabled={isEdit}
          credentials={credentialsQuery.data ?? []}
          credentialsLoading={credentialsQuery.isLoading}
          credentialsError={credentialsQuery.error !== null}
          onRetryCredentials={() => { void credentialsQuery.refetch() }}
          onChange={handleChange}
          onIdBlur={handleIdBlur}
          onSubmit={handleSubmit}
        />
      </Modal>
      <ConfirmDialog
        open={navigationGuard.isNavigationBlocked}
        title={t('providers.discard.title')}
        message={t('providers.discard.message')}
        cancelLabel={t('providers.discard.stay')}
        confirmLabel={t('providers.discard.confirm')}
        tone="danger"
        onCancel={navigationGuard.cancelNavigation}
        onConfirm={navigationGuard.confirmNavigation}
      />
    </>
  )
}
