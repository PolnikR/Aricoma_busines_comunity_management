import { Field, Input, Textarea } from '@/shared/components/form/FormControls'
import { useTranslation } from '@/hooks/useTranslation'

interface RecoveryGroupDetailsStepProps {
  name: string
  description: string
  onChange: (values: { name?: string; description?: string }) => void
}

export function RecoveryGroupDetailsStep({
  name,
  description,
  onChange,
}: RecoveryGroupDetailsStepProps) {
  const { t } = useTranslation()

  return (
    <div className="grid max-w-3xl gap-5">
      <div>
        <h2 className="text-base font-semibold text-[#17233d]">{t('pages.recoveryGroupBuilder.details.title')}</h2>
        <p className="mt-1 text-sm text-[#71819a]">{t('pages.recoveryGroupBuilder.details.description')}</p>
      </div>
      <Field label={t('pages.recoveryGroupBuilder.fields.name')} htmlFor="recovery-group-name">
        <Input
          id="recovery-group-name"
          value={name}
          onChange={event => { onChange({ name: event.target.value }) }}
          placeholder={t('pages.recoveryGroupBuilder.fields.namePlaceholder')}
          autoComplete="off"
          required
        />
      </Field>
      <Field label={t('pages.recoveryGroupBuilder.fields.description')} htmlFor="recovery-group-description">
        <Textarea
          id="recovery-group-description"
          value={description}
          onChange={event => { onChange({ description: event.target.value }) }}
          placeholder={t('pages.recoveryGroupBuilder.fields.descriptionPlaceholder')}
          rows={5}
          required
        />
      </Field>
    </div>
  )
}
