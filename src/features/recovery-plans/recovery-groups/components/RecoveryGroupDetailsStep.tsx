import { Field, Input, Textarea } from '@/shared/components/form/FormControls'
import { useTranslation } from '@/hooks/useTranslation'
import {
  isProgrammaticIdAvailable,
  toProgrammaticId,
} from '@/shared/utils/programmaticId'

interface RecoveryGroupDetailsStepProps {
  id: string
  name: string
  description: string
  existingIds: string[]
  currentId?: string
  disableId?: boolean
  onChange: (values: { id?: string; name?: string; description?: string }) => void
}

export function RecoveryGroupDetailsStep({
  id,
  name,
  description,
  existingIds,
  currentId,
  disableId = false,
  onChange,
}: RecoveryGroupDetailsStepProps) {
  const { t } = useTranslation()
  const idAvailable = isProgrammaticIdAvailable(id, existingIds, currentId)

  const handleNameChange = (value: string) => {
    const update: { id?: string; name: string } = { name: value }
    if (!id || id === toProgrammaticId(name)) {
      update.id = toProgrammaticId(value)
    }
    onChange(update)
  }

  return (
    <div className="grid max-w-3xl gap-5">
      <div>
        <h2 className="text-base font-semibold text-[#17233d]">{t('pages.recoveryGroupBuilder.details.title')}</h2>
        <p className="mt-1 text-sm text-[#71819a]">{t('pages.recoveryGroupBuilder.details.description')}</p>
      </div>
      <Field label={t('pages.recoveryGroupBuilder.fields.id')} htmlFor="recovery-group-id">
        <Input
          id="recovery-group-id"
          value={id}
          disabled={disableId}
          onChange={event => { onChange({ id: event.target.value }) }}
          onBlur={() => { onChange({ id: toProgrammaticId(id) }) }}
          placeholder={t('pages.recoveryGroupBuilder.fields.idPlaceholder')}
          invalid={Boolean(id && !idAvailable)}
          autoComplete="off"
          required
        />
        {id && !idAvailable ? (
          <p className="mt-1 text-xs text-red-600">
            {t('pages.recoveryGroupBuilder.validation.idInUse')}
          </p>
        ) : null}
      </Field>
      <Field label={t('pages.recoveryGroupBuilder.fields.name')} htmlFor="recovery-group-name">
        <Input
          id="recovery-group-name"
          value={name}
          onChange={event => { handleNameChange(event.target.value) }}
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
