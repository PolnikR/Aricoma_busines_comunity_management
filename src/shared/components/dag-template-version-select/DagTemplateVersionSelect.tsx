import type { DagTemplateVersion } from '@/generated/query/zod'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/shared/components/button/Button'
import { Select } from '@/shared/components/form/FormControls'
import type { ReactNode } from 'react'

export interface DagTemplateVersionSelectProps {
  id: string
  translationPrefix: string
  help?: ReactNode
  platform: string | undefined
  value: string | null
  templates: DagTemplateVersion[]
  isLoading: boolean
  error: unknown
  disabled: boolean
  onChange: (version: string | null) => void
  onRetry: () => void
}

export function DagTemplateVersionSelect({ id, translationPrefix, help, platform, value, templates, isLoading, error, disabled, onChange, onRetry }: DagTemplateVersionSelectProps) {
  const { t } = useTranslation()
  const defaults = templates.filter(template => template.default)
  const available = Boolean(platform) && !isLoading && !error && defaults.length === 1
  const defaultVersion = defaults[0]
  const selected = value === null ? defaultVersion : templates.find(template => template.version === value)
  // Present the BE default once, while preserving null on the wire to follow BE defaults.
  const displayedValue = value === null && available ? defaultVersion?.version ?? '' : value ?? ''
  const unknown = value !== null && !templates.some(template => template.version === value)
  const problem = !platform ? 'templateSelectPlatform' : error ? 'templateUnavailable' : templates.length === 0 ? 'templateEmpty' : defaults.length !== 1 ? 'templateInvalidDefault' : null

  return (
    <div className="mt-5 max-w-4xl">
      <div>
        <div className="mb-1.5 flex min-w-0 items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
          <label htmlFor={id} className="text-xs font-medium text-text-secondary">{t(`${translationPrefix}.templateLabel`)}</label>
          {help}
        </div>
        <Select id={id} value={displayedValue} disabled={disabled || !available}
          onChange={event => { if (!disabled && available) onChange(event.target.value === defaultVersion?.version ? null : event.target.value || null) }}>
          {available && defaultVersion
            ? <option value={defaultVersion.version}>{t(`${translationPrefix}.templateDefault`, { version: defaultVersion.version })}</option>
            : <option value="">{t(`${translationPrefix}.templateDefaultUnavailable`)}</option>}
          {unknown || (!available && value !== null && selected?.default === true) ? <option value={value}>{value}</option> : null}
          {templates.filter(template => !template.default).map(template => <option key={template.version} value={template.version}>{template.version}</option>)}
        </Select>
      </div>
      {isLoading ? <p className="mt-2 text-sm text-text-muted" role="status">{t(`${translationPrefix}.templateLoading`)}</p>
        : problem ? <div className="mt-2 text-sm text-warning-700 dark:text-warning-400" role="alert">
          <p>{t(`${translationPrefix}.${problem}`)}</p>
          {platform ? <Button variant="outline" onClick={onRetry}>{t('buttons.retry')}</Button> : null}
        </div> : null}
      {!available && value === null ? <p className="mt-2 text-sm text-warning-700 dark:text-warning-400" role="alert">{t(`${translationPrefix}.templateUnverified`)}</p> : null}
      {available && unknown ? <p className="mt-2 text-sm text-warning-700 dark:text-warning-400" role="alert">{t(`${translationPrefix}.templateUnknown`, { version: value })}</p> : null}
      {available && selected ? <p className="mt-2 text-sm text-text-muted">{selected.description}</p> : null}
    </div>
  )
}
