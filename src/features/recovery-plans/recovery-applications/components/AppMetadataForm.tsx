import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Field, Input, Select } from '@/shared/components/form/FormControls'
import { isValidRecoveryApplicationFileName } from '../utils/recoveryApplicationFileName'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

interface AppMetadataFormProps {
  onMetadataChange?: (metadata: Partial<RecoveryApplicationFormState>) => void
  initialValues?: {
    fileName: string
    name: string
    description: string
    environment: 'dev' | 'staging' | 'prod'
  }
  disableFileName?: boolean
}

export function AppMetadataForm({
  onMetadataChange,
  initialValues,
  disableFileName = false,
}: AppMetadataFormProps) {
  const { t } = useTranslation()
  const [fileName, setFileName] = useState(initialValues?.fileName ?? '')
  const [name, setName] = useState(initialValues?.name ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [environment, setEnvironment] = useState<'dev' | 'staging' | 'prod'>(
    initialValues?.environment ?? 'dev'
  )

  const handleChange = (field: string, value: string) => {
    switch (field) {
      case 'fileName':
        setFileName(value)
        onMetadataChange?.({ fileName: value })
        break
      case 'name':
        setName(value)
        onMetadataChange?.({ name: value })
        break
      case 'description':
        setDescription(value)
        onMetadataChange?.({ description: value })
        break
      case 'environment':
        setEnvironment(value as 'dev' | 'staging' | 'prod')
        onMetadataChange?.({ environment: value as 'dev' | 'staging' | 'prod' })
        break
    }
  }

  return (
    <form className="grid grid-cols-1 gap-4 items-end sm:grid-cols-2 xl:grid-cols-4">
      <Field label={t('recovery.application.form.fileName')} htmlFor="application-file-name">
        <Input
          id="application-file-name"
          type="text"
          value={fileName}
          onChange={e => { handleChange('fileName', e.target.value); }}
          placeholder={t('recovery.application.form.fileNamePlaceholder')}
          invalid={Boolean(fileName) && !isValidRecoveryApplicationFileName(fileName)}
          disabled={disableFileName}
          required
        />
        {fileName && !isValidRecoveryApplicationFileName(fileName) ? (
          <p className="mt-1 text-xs text-red-600">
            {t('recovery.application.validation.fileNameInvalid')}
          </p>
        ) : null}
      </Field>

      <Field label={t('forms.applicationName')} htmlFor="application-name">
        <Input
          id="application-name"
          type="text"
          value={name}
          onChange={e => { handleChange('name', e.target.value); }}
          placeholder={t('forms.applicationNameExample')}
          required
        />
      </Field>

      <Field label={t('forms.applicationDescription')} htmlFor="application-description">
        <Input
          id="application-description"
          type="text"
          value={description}
          onChange={e => { handleChange('description', e.target.value); }}
          placeholder={t('forms.applicationDescriptionExample')}
          required
        />
      </Field>

      <Field label={t('forms.environment')} htmlFor="application-environment">
        <Select
          id="application-environment"
          value={environment}
          onChange={e => { handleChange('environment', e.target.value); }}
          required
        >
          <option value="dev">{t('forms.environmentDev')}</option>
          <option value="staging">{t('forms.environmentStaging')}</option>
          <option value="prod">{t('forms.environmentProd')}</option>
        </Select>
      </Field>
    </form>
  )
}
