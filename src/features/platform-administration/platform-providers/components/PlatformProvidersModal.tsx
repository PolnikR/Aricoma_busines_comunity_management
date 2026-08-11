import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { Modal } from '@/shared/components/modal/Modal'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { useTranslation } from '@/hooks/useTranslation'
import { useCredentials } from '@/features/providers-connectors/credentials/hooks/useCredentials'
import { useUpsertPlatformProvider } from '../hooks/useUpsertPlatformProvider'
import type {
  PlatformProviderRecord,
  PlatformProviderSubmitData,
  PlatformProviderType,
} from '../model/platformProviderTypes'
import {
  PlatformProviderForm,
} from './PlatformProviderForm'
import type { PlatformProviderFormData } from './PlatformProviderForm'

interface PlatformProvidersModalProps {
  open: boolean
  onClose: () => void
  existingProviders: PlatformProviderRecord[]
  provider?: PlatformProviderRecord
}

const EMPTY_PLATFORM_PROVIDER_FORM: PlatformProviderFormData = {
  id: '',
  name: '',
  description: '',
  type: '',
  ipAddress: '',
  port: '22',
  dagDir: '',
  credentialId: '',
}

function toPlatformProviderFormData(provider: PlatformProviderRecord): PlatformProviderFormData {
  return {
    id: provider.id,
    name: provider.name,
    description: provider.description,
    type: provider.type,
    ipAddress: provider.ipAddress,
    port: String(provider.port),
    dagDir: provider.dagDir,
    credentialId: provider.credentialId,
  }
}

function createInitialForm(provider?: PlatformProviderRecord): PlatformProviderFormData {
  return provider ? toPlatformProviderFormData(provider) : EMPTY_PLATFORM_PROVIDER_FORM
}

export function PlatformProvidersModal({
  open,
  onClose,
  existingProviders,
  provider,
}: PlatformProvidersModalProps) {
  const { t } = useTranslation()
  const upsert = useUpsertPlatformProvider()
  const credentialsQuery = useCredentials({ enabled: open })
  const isEdit = Boolean(provider)
  const [formData, setFormData] = useState<PlatformProviderFormData>(EMPTY_PLATFORM_PROVIDER_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof PlatformProviderFormData, string>>>({})
  const [errorMessage, setErrorMessage] = useState('')
  const initialForm = createInitialForm(provider)
  const isDirty = open && (
    formData.id !== initialForm.id
    || formData.name !== initialForm.name
    || formData.description !== initialForm.description
    || formData.type !== initialForm.type
    || formData.ipAddress !== initialForm.ipAddress
    || formData.port !== initialForm.port
    || formData.dagDir !== initialForm.dagDir
    || formData.credentialId !== initialForm.credentialId
  )
  const navigationGuard = useUnsavedChangesGuard(isDirty)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(createInitialForm(provider))
    setErrors({})
    setErrorMessage('')
  }, [open, provider])

  const close = () => {
    setFormData(EMPTY_PLATFORM_PROVIDER_FORM)
    setErrors({})
    setErrorMessage('')
    onClose()
  }

  const requestClose = () => {
    if (!upsert.isPending) navigationGuard.requestNavigation(close)
  }

  const handleChange = (field: keyof PlatformProviderFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field in errors && errors[field]) {
      setErrors(prev => {
        const next = { ...prev }
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete next[field]
        return next
      })
    }
    setErrorMessage('')
  }

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof PlatformProviderFormData, string>> = {}
    const port = Number(formData.port)
    if (!formData.id.trim()) nextErrors.id = t('forms.idRequired')
    else if (!isEdit && existingProviders.some(entry => entry.id === formData.id.trim())) {
      nextErrors.id = t('platformProviders.validation.idExists')
    }
    if (!formData.name.trim()) nextErrors.name = t('forms.nameRequired')
    if (!formData.description.trim()) nextErrors.description = t('forms.descriptionRequired')
    if (!formData.type) nextErrors.type = t('forms.typeRequired')
    if (!formData.ipAddress.trim()) nextErrors.ipAddress = t('forms.ipRequired')
    if (
      !Number.isInteger(port)
      || port < 1
      || port > 65535
    ) {
      nextErrors.port = t('forms.portRequired')
    }
    if (!formData.dagDir.trim()) nextErrors.dagDir = t('forms.dagDirRequired')
    if (!formData.credentialId.trim()) nextErrors.credentialId = t('forms.credentialsRequired')
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return

    const record: PlatformProviderSubmitData = {
      id: formData.id.trim(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      type: formData.type as PlatformProviderType,
      ipAddress: formData.ipAddress.trim(),
      port: Number(formData.port),
      dagDir: formData.dagDir.trim(),
      credentialId: formData.credentialId.trim(),
    }

    upsert.mutate(
      { provider: record },
      {
        onSuccess: () => { navigationGuard.runWithoutBlocking(close) },
        onError: (error: unknown) => {
          const detail = error instanceof Error ? error.message : ''
          setErrorMessage(detail ? `${t('platformProviders.submitFailed')}: ${detail}` : t('platformProviders.submitFailed'))
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
        title={t(isEdit ? 'platformProviders.modal.editTitle' : 'platformProviders.modal.createTitle')}
        footer={(
          <>
            <Button onClick={requestClose} disabled={upsert.isPending} size="sm" variant="outline" className="flex-1">
              {t('buttons.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={upsert.isPending} size="sm" className="flex-1">
              {upsert.isPending
                ? t(isEdit ? 'messages.saving' : 'messages.creating')
                : t(isEdit ? 'platformProviders.modal.editTitle' : 'platformProviders.modal.createTitle')}
            </Button>
          </>
        )}
      >
        {errorMessage ? (
          <div className="mx-6 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <PlatformProviderForm
          data={formData}
          errors={errors}
          isSubmitting={upsert.isPending}
          idDisabled={isEdit}
          credentials={credentialsQuery.data ?? []}
          credentialsLoading={credentialsQuery.isLoading}
          credentialsError={credentialsQuery.error !== null}
          onRetryCredentials={() => { void credentialsQuery.refetch() }}
          onChange={handleChange}
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
