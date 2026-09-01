import { useEffect, useState } from 'react'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { Alert } from '@/shared/components/alert/Alert'
import { Button } from '@/shared/components/button/Button'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { Modal } from '@/shared/components/modal/Modal'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { useTranslation } from '@/hooks/useTranslation'
import { useCredentials } from '@/features/providers-connectors/credentials/hooks/useCredentials'
import { useUpsertPlatformProvider } from '../hooks/useUpsertPlatformProvider'
import { toPlatformProviderSubmitData } from '../helpers/platformProviderSubmitMapper'
import {
  changePlatformProviderFormType,
  createInitialPlatformProviderForm,
  EMPTY_PLATFORM_PROVIDER_FORM,
} from '../model/platformProviderForm'
import type { PlatformProviderFormData } from '../model/platformProviderForm'
import { PLATFORM_PROVIDER_TYPES } from '../model/platformProviderTypes'
import type { PlatformProviderRecord } from '../model/platformProviderTypes'
import { PlatformProviderForm } from './PlatformProviderForm'

interface PlatformProvidersModalProps {
  open: boolean
  onClose: () => void
  existingProviders: PlatformProviderRecord[]
  provider?: PlatformProviderRecord
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
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
  const [submitError, setSubmitError] = useState<unknown>(null)
  const submitErrorDescription = extractBackendErrorDetail(submitError)
  const initialForm = createInitialPlatformProviderForm(provider)
  const isDirty = open && JSON.stringify(formData) !== JSON.stringify(initialForm)
  const navigationGuard = useUnsavedChangesGuard(isDirty)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(createInitialPlatformProviderForm(provider))
    setErrors({})
    setSubmitError(null)
  }, [open, provider])

  const close = () => {
    setFormData(EMPTY_PLATFORM_PROVIDER_FORM)
    setErrors({})
    setSubmitError(null)
    onClose()
  }

  const requestClose = () => {
    if (!upsert.isPending) navigationGuard.requestNavigation(close)
  }

  const clearFieldError = (field: keyof PlatformProviderFormData) => {
    if (!(field in errors) || !errors[field]) return
    setErrors(prev => {
      const next = { ...prev }
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete next[field]
      return next
    })
  }

  const handleChange = (field: keyof PlatformProviderFormData, value: string | boolean) => {
    if (field === 'type' && typeof value === 'string') {
      const nextType = PLATFORM_PROVIDER_TYPES.find(type => type === value) ?? ''
      setFormData(prev => changePlatformProviderFormType(prev, nextType))
      setErrors({})
      setSubmitError(null)
      return
    }

    setFormData(prev => ({ ...prev, [field]: value }))
    clearFieldError(field)
    setSubmitError(null)
  }

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof PlatformProviderFormData, string>> = {}
    if (!formData.id.trim()) nextErrors.id = t('forms.idRequired')
    else if (!isEdit && existingProviders.some(entry => entry.id === formData.id.trim())) {
      nextErrors.id = t('platformProviders.validation.idExists')
    }
    if (!formData.name.trim()) nextErrors.name = t('forms.nameRequired')
    if (!formData.type) nextErrors.type = t('forms.typeRequired')

    if (formData.type === 'AIRFLOW' || formData.type === 'SMTP') {
      const port = Number(formData.port)
      if (formData.port.trim() && (!Number.isInteger(port) || port < 1 || port > 65535)) {
        nextErrors.port = t('forms.portRequired')
      }
    }

    if (formData.type === 'AIRFLOW') {
      if (!formData.dagDir.trim()) nextErrors.dagDir = t('forms.dagDirRequired')
      const notificationEmail = formData.notificationEmail.trim()
      if (notificationEmail && !isValidEmail(notificationEmail)) {
        nextErrors.notificationEmail = t('forms.notificationEmailInvalid')
      }
    }

    if (formData.type === 'SMTP') {
      const fromEmail = formData.fromEmail.trim()
      if (fromEmail && !isValidEmail(fromEmail)) {
        nextErrors.fromEmail = t('forms.notificationEmailInvalid')
      }
    }

    if (formData.type === 'BACKEND') {
      const notificationEmail = formData.notificationEmail.trim()
      if (notificationEmail && !isValidEmail(notificationEmail)) {
        nextErrors.notificationEmail = t('forms.notificationEmailInvalid')
      }
    }

    if (formData.type === 'KEYCLOAK') {
      if (!formData.realm.trim()) nextErrors.realm = t('forms.realmRequired')
      if (!formData.credentialId.trim()) nextErrors.credentialId = t('forms.credentialsRequired')
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return

    const record = toPlatformProviderSubmitData(formData)
    upsert.mutate(
      { provider: record },
      {
        onSuccess: () => { navigationGuard.runWithoutBlocking(close) },
        onError: (error: unknown) => {
          setSubmitError(error)
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
        size="lg"
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
        {submitError ? (
          <Alert
            className="mx-6 mt-4"
            title={t('platformProviders.submitFailed')}
            {...(submitErrorDescription ? { description: submitErrorDescription } : {})}
            variant="error"
          />
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
