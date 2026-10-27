import type { ChangeEvent, KeyboardEvent } from 'react'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { Button } from '@/shared/components/button/Button'
import { Field, Input, RadioField, Textarea } from '@/shared/components/form/FormControls'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { useTranslation } from '@/hooks/useTranslation'
import type { PolicyCatalog, PolicySetResolution } from '@/features/recovery-plans/recovery-policies/catalog/model/policyCatalog'

export interface PolicySetFormData {
  id: string
  name: string
  description: string
  snapshot_policy_id: string
  recovery_app_policy_id: string
  clean_room_policy_id: string
}

interface PolicySetFormProps {
  data: PolicySetFormData
  errors: Partial<Record<keyof PolicySetFormData, string>>
  sources: PolicyCatalog['sources']
  references: PolicySetResolution
  onRetry: PolicyCatalog['retry']
  isSubmitting: boolean
  idDisabled?: boolean
  onChange: <K extends keyof PolicySetFormData>(field: K, value: PolicySetFormData[K]) => void
  onSubmit: () => void
}

export function PolicySetForm({
  data,
  errors,
  sources,
  references,
  onRetry,
  isSubmitting,
  idDisabled = false,
  onChange,
  onSubmit,
}: PolicySetFormProps) {
  const { t } = useTranslation()
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !isSubmitting) {
      event.preventDefault()
      onSubmit()
    }
  }
  const sections = [
    { kind: 'snapshot', field: 'snapshot_policy_id', label: 'policySets.form.snapshotPolicies', empty: 'policySets.form.noPolicies', prefix: 'policy-set-policy' },
    { kind: 'recoveryApp', field: 'recovery_app_policy_id', label: 'policySets.form.recoveryAppPolicy', empty: 'policySets.form.noRecoveryAppPolicies', prefix: 'policy-set-recovery-app-policy' },
    { kind: 'cleanRoom', field: 'clean_room_policy_id', label: 'policySets.form.cleanRoomPolicy', empty: 'policySets.form.noCleanRoomPolicies', prefix: 'policy-set-clean-room-policy' },
  ] as const

  return (
    <div className="custom-scrollbar max-h-[min(68vh,640px)] space-y-4 overflow-y-auto px-6 py-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('policySets.form.id')} htmlFor="policy-set-id">
          <Input id="policy-set-id" value={data.id} disabled={isSubmitting || idDisabled} invalid={Boolean(errors.id)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('id', event.target.value) }} />
          {errors.id ? <p className="mt-1 text-xs text-red-600">{errors.id}</p> : null}
        </Field>
        <Field label={t('policySets.form.name')} htmlFor="policy-set-name">
          <Input id="policy-set-name" value={data.name} disabled={isSubmitting} invalid={Boolean(errors.name)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('name', event.target.value) }} />
          {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
        </Field>
      </div>

      <Field label={t('policySets.form.description')} htmlFor="policy-set-description">
        <Textarea id="policy-set-description" value={data.description} disabled={isSubmitting} invalid={Boolean(errors.description)} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => { onChange('description', event.target.value) }} />
        {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : null}
      </Field>

      {sections.map(section => {
        const source = sources[section.kind]
        const reference = references[section.kind]
        const label = t(section.label)
        const errorDetail = extractBackendErrorDetail(source.error)
        return (
          <section key={section.kind} aria-label={label} className="space-y-2">
            <div className="flex items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
              <h3 className="text-xs font-medium text-text-secondary">{label}</h3>
              <KeyedHelpPopover helpKey={`policySets.fieldHelp.${section.field}`} sections={[]} />
            </div>
            {source.status === 'loading' || source.isPaused ? <p className="text-xs text-text-muted" role="status">{t(source.isPaused ? 'policyCatalog.paused' : 'policyCatalog.waiting')}</p> : null}
            {source.isRefreshing ? <p className="text-xs text-text-muted" role="status">{t('policyCatalog.refreshing')}</p> : null}
            {source.status === 'error' || source.status === 'cachedError' ? (
              <div className="space-y-2" role="alert">
                <p className="text-xs text-warning-700 dark:text-warning-400">{t(source.status === 'cachedError' ? 'policyCatalog.cachedError' : 'policyCatalog.error', { kind: label })}</p>
                {errorDetail ? <p className="text-xs text-text-muted">{errorDetail}</p> : null}
                <Button type="button" size="xs" variant="outline" onClick={() => { void onRetry(section.kind) }} disabled={isSubmitting || source.isFetching || source.isPaused}>
                  {t('policyCatalog.retry', { kind: label })}
                </Button>
              </div>
            ) : null}
            {source.status === 'empty' ? <p className="text-xs text-text-muted">{t(section.empty)}</p> : null}
            {source.items?.map(policy => (
              <RadioField
                key={policy.id}
                id={section.prefix + '-' + policy.id}
                name={section.prefix}
                label={policy.name + ' (' + policy.id + ')'}
                checked={data[section.field] === policy.id}
                disabled={isSubmitting}
                variant="bordered"
                onChange={() => { onChange(section.field, policy.id) }}
              />
            ))}
            {reference.status === 'missing' || reference.status === 'unknown' ? (
              <p className="text-xs text-warning-700 dark:text-warning-400" role="status">{t(reference.status === 'missing' ? 'policyCatalog.missing' : 'policyCatalog.unknown', { id: reference.id })}</p>
            ) : null}
            {errors[section.field] ? <p className="text-xs text-red-600">{errors[section.field]}</p> : null}
          </section>
        )
      })}
    </div>
  )
}
