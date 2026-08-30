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
  url: '',
  port: '22',
  dagDir: '',
  credentialId: '',
  vmPrefix: '',
  vmTags: [],
  notificationEmail: '',
  fromEmail: '',
  disableSsl: null,
  disableTls: null,
  loggingEnabled: null,
  jwtEnabled: null,
}

function toPlatformProviderFormData(provider: PlatformProviderRecord): PlatformProviderFormData {
  return {
    id: provider.id,
    name: provider.name,
    description: provider.description,
    type: provider.type,
    ipAddress: provider.ipAddress,
    url: provider.url ?? '',
    port: String(provider.port),
    dagDir: provider.dagDir,
    credentialId: provider.credentialId,
    vmPrefix: provider.vmPrefix ?? '',
    vmTags: provider.vmTags?.[0] ? [provider.vmTags[0]] : [],
    notificationEmail: provider.notificationEmail ?? '',
    fromEmail: provider.fromEmail ?? '',
    disableSsl: provider.disableSsl ?? null,
    disableTls: provider.disableTls ?? null,
    loggingEnabled: provider.loggingEnabled ?? null,
    jwtEnabled: provider.jwtEnabled ?? null,
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
  const [submitError, setSubmitError] = useState<unknown>(null)
  const submitErrorDescription = extractBackendErrorDetail(submitError)
  const initialForm = createInitialForm(provider)
  const isDirty = open && (
    formData.id !== initialForm.id
    || formData.name !== initialForm.name
    || formData.description !== initialForm.description
    || formData.type !== initialForm.type
    || formData.ipAddress !== initialForm.ipAddress
    || formData.url !== initialForm.url
    || formData.port !== initialForm.port
    || formData.dagDir !== initialForm.dagDir
    || formData.credentialId !== initialForm.credentialId
    || formData.notificationEmail !== initialForm.notificationEmail
    || formData.fromEmail !== initialForm.fromEmail
    || formData.disableSsl !== initialForm.disableSsl
    || formData.disableTls !== initialForm.disableTls
    || formData.loggingEnabled !== initialForm.loggingEnabled
    || formData.jwtEnabled !== initialForm.jwtEnabled
    || formData.vmPrefix !== initialForm.vmPrefix
    || formData.vmTags.length !== initialForm.vmTags.length
    || formData.vmTags.some((tag, index) => tag !== initialForm.vmTags[index])
  )
  const navigationGuard = useUnsavedChangesGuard(isDirty)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(createInitialForm(provider))
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

  const handleChange = (field: keyof PlatformProviderFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field in errors && errors[field]) {
      setErrors(prev => {
        const next = { ...prev }
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete next[field]
        return next
      })
    }
    setSubmitError(null)
  }

  const handleTagsChange = (vmTags: string[]) => {
    setFormData(prev => ({ ...prev, vmTags }))
    setSubmitError(null)
  }

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof PlatformProviderFormData, string>> = {}
    const port = Number(formData.port)
    if (!formData.id.trim()) nextErrors.id = t('forms.idRequired')
    else if (!isEdit && existingProviders.some(entry => entry.id === formData.id.trim())) {
      nextErrors.id = t('platformProviders.validation.idExists')
    }
    if (!formData.name.trim()) nextErrors.name = t('forms.nameRequired')
    if (!formData.type) nextErrors.type = t('forms.typeRequired')
    if (formData.port.trim() && (
      !Number.isInteger(port)
      || port < 1
      || port > 65535
    )) {
      nextErrors.port = t('forms.portRequired')
    }
    const notificationEmail = formData.notificationEmail.trim()
    if (notificationEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)) {
      nextErrors.notificationEmail = t('forms.notificationEmailInvalid')
    }
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
      ipAddress: formData.ipAddress.trim() || null,
      ...(formData.port.trim() ? { port: Number(formData.port) } : {}),
      dagDir: formData.dagDir.trim() || null,
      credentialId: formData.credentialId.trim() || null,
      url: formData.url.trim() || null,
      vmPrefix: formData.vmPrefix.trim() || null,
      vmTags: [...formData.vmTags],
      notificationEmail: formData.notificationEmail.trim() || null,
      fromEmail: formData.fromEmail.trim() || null,
      disableSsl: formData.disableSsl,
      disableTls: formData.disableTls,
      loggingEnabled: formData.loggingEnabled,
      jwtEnabled: formData.jwtEnabled,
    }

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
          tags={[]}
          tagsDisabled={!isEdit}
          onChange={handleChange}
          onTagsChange={handleTagsChange}
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
