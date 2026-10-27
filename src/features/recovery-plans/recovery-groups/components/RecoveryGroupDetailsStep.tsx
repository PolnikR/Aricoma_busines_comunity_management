import { Field, Input, Textarea } from '@/shared/components/form/FormControls'
import { useTranslation } from '@/hooks/useTranslation'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { isRecoveryGroupEmailValid } from '../model/recoveryGroupEmail'
import {
  isProgrammaticIdAvailable,
  toProgrammaticId,
} from '@/shared/utils/programmaticId'

interface RecoveryGroupDetailsStepProps {
  id: string
  name: string
  description: string
  notificationEmail?: string | null
  existingIds: string[]
  currentId?: string
  disableId?: boolean
  onChange: (values: { id?: string; name?: string; description?: string; notificationEmail?: string }) => void
}

export function RecoveryGroupDetailsStep({
  id,
  name,
  description,
  notificationEmail = '',
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
        <h2 className="text-base font-semibold text-text-primary">{t('pages.recoveryGroupBuilder.details.title')}</h2>
        <p className="mt-1 text-sm text-text-muted">{t('pages.recoveryGroupBuilder.details.description')}</p>
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
      <div className="block">
        <div className="mb-1.5 flex items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
          <label htmlFor="recovery-group-email" className="text-xs font-medium text-text-secondary">{t('recoveryGroups.notificationEmail')}</label>
          <KeyedHelpPopover helpKey="recoveryGroups.fieldHelp.email" sections={[]} />
        </div>
        <Input id="recovery-group-email" type="text" inputMode="email" autoComplete="email" value={notificationEmail ?? ''}
          placeholder={t('recoveryGroups.emailInherited')} invalid={!isRecoveryGroupEmailValid(notificationEmail)}
          aria-describedby={!isRecoveryGroupEmailValid(notificationEmail) ? 'recovery-group-email-error' : undefined}
          onChange={event => { onChange({ notificationEmail: event.target.value }) }} />
        {!isRecoveryGroupEmailValid(notificationEmail) ? <p id="recovery-group-email-error" role="alert" className="mt-1 text-xs text-red-600">{t('recoveryGroups.emailInvalid')}</p> : null}
      </div>
    </div>
  )
}
