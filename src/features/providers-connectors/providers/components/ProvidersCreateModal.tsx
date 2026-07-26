import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Modal } from '@/shared/components/modal/Modal'
import { useTranslation } from '@/hooks/useTranslation'
import { useUpsertProvider } from '../api/useUpsertProvider'
import { ProviderCreateForm } from './ProviderCreateForm'
import type { ProviderRecord } from '@/features/api/providersApi'
import type { ProviderCreateFormData } from './ProviderCreateForm'

interface ProvidersCreateModalProps {
  open: boolean
  onClose: () => void
  existingProviders: ProviderRecord[]
  // When supplied the modal is in edit mode: fields are prefilled and the ID
  // is locked (the submit endpoint upserts by id).
  provider?: ProviderRecord
}

const EMPTY_FORM: ProviderCreateFormData = { id: '', name: '', description: '', type: '', ipAddress: '' }

// Modal for creating or editing a provider.
export function ProvidersCreateModal({ open, onClose, existingProviders, provider }: ProvidersCreateModalProps) {
  const { t } = useTranslation()
  const upsert = useUpsertProvider()
  const isEdit = Boolean(provider)
  const [formData, setFormData] = useState<ProviderCreateFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof ProviderCreateFormData, string>>>({})
  const [errorMessage, setErrorMessage] = useState('')

  // Prefill (edit) or clear (create) the form each time the modal opens.
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(provider ? { ...provider } : EMPTY_FORM)
    setErrors({})
    setErrorMessage('')
  }, [open, provider])

  const handleChange = (field: keyof ProviderCreateFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProviderCreateFormData, string>> = {}
    if (!formData.id.trim()) newErrors.id = 'ID is required'
    if (!formData.name.trim()) newErrors.name = 'Provider name is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.type) newErrors.type = 'Type is required'
    if (!formData.ipAddress.trim()) newErrors.ipAddress = 'IP address is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return

    setErrorMessage('')

    const record: ProviderRecord = {
      id: formData.id.trim(),
      name: formData.name,
      description: formData.description,
      type: formData.type,
      ipAddress: formData.ipAddress,
    }

    upsert.mutate(
      { provider: record, existingProviders },
      {
        onSuccess: () => { onClose() },
        onError: (err: unknown) => {
          const detail = err instanceof Error ? err.message : ''
          setErrorMessage(detail ? `Failed to create provider: ${detail}` : 'Failed to create provider')
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit provider' : 'Create provider'}
      footer={
        <>
          <Button
            onClick={onClose}
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
              ? (isEdit ? 'Saving…' : 'Creating…')
              : (isEdit ? 'Edit provider' : 'Create provider')}
          </Button>
        </>
      }
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
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    </Modal>
  )
}
