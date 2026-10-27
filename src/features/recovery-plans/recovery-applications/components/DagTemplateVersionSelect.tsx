import type { DagTemplateVersion } from '@/generated/query/zod'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/shared/components/button/Button'
import { Field, Select } from '@/shared/components/form/FormControls'

interface DagTemplateVersionSelectProps {
  platform: string | undefined
  value: string | null
  templates: DagTemplateVersion[]
  isLoading: boolean
  error: unknown
  disabled: boolean
  onChange: (version: string | null) => void
  onRetry: () => void
}

export function DagTemplateVersionSelect({ platform, value, templates, isLoading, error, disabled, onChange, onRetry }: DagTemplateVersionSelectProps) {
  const { t } = useTranslation()
  const defaults = templates.filter(template => template.default)
  const available = Boolean(platform) && !isLoading && !error && defaults.length === 1
  const defaultVersion = defaults[0]
  const selected = value === null ? defaultVersion : templates.find(template => template.version === value)
  const unknown = value !== null && !templates.some(template => template.version === value)
  const problem = !platform ? 'templateSelectPlatform' : error ? 'templateUnavailable' : templates.length === 0 ? 'templateEmpty' : defaults.length !== 1 ? 'templateInvalidDefault' : null

  return (
    <div className="mt-5 max-w-4xl">
      <Field label={t('recovery.application.lifecycle.templateLabel')} htmlFor="recovery-application-template-version">
        <Select id="recovery-application-template-version" value={value ?? ''} disabled={disabled || !available}
          onChange={event => { if (!disabled && available) onChange(event.target.value || null) }}>
          <option value="">{available && defaultVersion
            ? t('recovery.application.lifecycle.templateDefault', { version: defaultVersion.version })
            : t('recovery.application.lifecycle.templateDefaultUnavailable')}</option>
          {unknown ? <option value={value}>{value}</option> : null}
          {templates.map(template => <option key={template.version} value={template.version}>{template.version}</option>)}
        </Select>
      </Field>
      {isLoading ? <p className="mt-2 text-sm text-text-muted" role="status">{t('recovery.application.lifecycle.templateLoading')}</p>
        : problem ? <div className="mt-2 text-sm text-warning-700 dark:text-warning-400" role="alert">
          <p>{t(`recovery.application.lifecycle.${problem}`)}</p>
          {platform ? <Button variant="outline" onClick={onRetry}>{t('buttons.retry')}</Button> : null}
        </div> : null}
      {!available && value === null ? <p className="mt-2 text-sm text-warning-700 dark:text-warning-400" role="alert">{t('recovery.application.lifecycle.templateUnverified')}</p> : null}
      {available && unknown ? <p className="mt-2 text-sm text-warning-700 dark:text-warning-400" role="alert">{t('recovery.application.lifecycle.templateUnknown', { version: value })}</p> : null}
      {available && selected ? <p className="mt-2 text-sm text-text-muted">{selected.description}</p> : null}
    </div>
  )
}
