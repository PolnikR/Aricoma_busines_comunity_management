import { Button } from '@/shared/components/button/Button'
import { Field, Input } from '@/shared/components/form/FormControls'
import type { RuntimeConfiguration } from '../mocks/platformProviderConfigMocks'

interface RuntimeConfigurationPanelProps {
  configuration: RuntimeConfiguration
  isDirty: boolean
  onWorkDirectoryChange: (value: string) => void
  onTempDirectoryChange: (value: string) => void
  onLogDirectoryChange: (value: string) => void
  onSessionTimeoutChange: (value: number) => void
  onResetField: (field: 'workDirectory' | 'tempDirectory' | 'logDirectory' | 'sessionTimeoutMinutes') => void
  onSave: () => void
  onCancel: () => void
}

export function RuntimeConfigurationPanel({
  configuration,
  isDirty,
  onWorkDirectoryChange,
  onTempDirectoryChange,
  onLogDirectoryChange,
  onSessionTimeoutChange,
  onResetField,
  onSave,
  onCancel,
}: RuntimeConfigurationPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-border bg-surface shadow-[0_14px_35px_-28px_rgba(37,72,112,0.45)] lg:h-full">
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        <section className="border-b border-border px-5 py-3.5 sm:px-6">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold text-text-primary">Runtime directories</h3>
            <p className="truncate text-xs text-text-muted">Paths must exist and be writable by the service account.</p>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Work directory" htmlFor="work-directory">
                <div className="flex gap-2">
                  <Input
                    id="work-directory"
                    size="sm"
                    spellCheck={false}
                    value={configuration.workDirectory}
                    onChange={event => { onWorkDirectoryChange(event.target.value) }}
                  />
                  <Button size="sm" variant="outline" onClick={() => { onResetField('workDirectory') }}>
                    Reset
                  </Button>
                </div>
              </Field>
              <p className="mt-1 flex items-center justify-between gap-3 text-xs text-text-subtle">
                <span>Staging area for in-flight recovery jobs and job manifests.</span>
                <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-text-secondary">{configuration.workDirectoryDefault}</span>
              </p>
            </div>

            <div>
              <Field label="Temp directory" htmlFor="temp-directory">
                <div className="flex gap-2">
                  <Input
                    id="temp-directory"
                    size="sm"
                    spellCheck={false}
                    value={configuration.tempDirectory}
                    onChange={event => { onTempDirectoryChange(event.target.value) }}
                  />
                  <Button size="sm" variant="outline" onClick={() => { onResetField('tempDirectory') }}>
                    Reset
                  </Button>
                </div>
              </Field>
              <p className="mt-1 flex items-center justify-between gap-3 text-xs text-text-subtle">
                <span>Cleared automatically after each job.</span>
                <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-text-secondary">{configuration.tempDirectoryDefault}</span>
              </p>
            </div>

            <div>
              <Field label="Log directory" htmlFor="log-directory">
                <div className="flex gap-2">
                  <Input
                    id="log-directory"
                    size="sm"
                    spellCheck={false}
                    value={configuration.logDirectory}
                    onChange={event => { onLogDirectoryChange(event.target.value) }}
                  />
                  <Button size="sm" variant="outline" onClick={() => { onResetField('logDirectory') }}>
                    Reset
                  </Button>
                </div>
              </Field>
              <p className="mt-1 flex items-center justify-between gap-3 text-xs text-text-subtle">
                <span>Rotated daily, retained per the platform log policy.</span>
                <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-text-secondary">{configuration.logDirectoryDefault}</span>
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-3.5 sm:px-6">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold text-text-primary">Session</h3>
            <p className="truncate text-xs text-text-muted">Time before the platform must re-authenticate.</p>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Field label="Session timeout (minutes)" htmlFor="session-timeout">
                <div className="flex gap-2">
                  <Input
                    id="session-timeout"
                    type="number"
                    size="sm"
                    min={configuration.sessionTimeoutMinDefault}
                    max={configuration.sessionTimeoutMaxDefault}
                    value={configuration.sessionTimeoutMinutes}
                    onChange={event => { onSessionTimeoutChange(Number(event.target.value)) }}
                    className="text-right tabular-nums"
                  />
                  <Button size="sm" variant="outline" onClick={() => { onResetField('sessionTimeoutMinutes') }}>
                    Reset
                  </Button>
                </div>
              </Field>
              <input
                type="range"
                aria-hidden="true"
                tabIndex={-1}
                min={configuration.sessionTimeoutMinDefault}
                max={configuration.sessionTimeoutMaxDefault}
                value={configuration.sessionTimeoutMinutes}
                onChange={event => { onSessionTimeoutChange(Number(event.target.value)) }}
                className="mt-1.5 w-full accent-accent"
              />
              <p className="mt-1 flex items-center justify-between gap-3 text-xs text-text-subtle">
                <span>Allowed range: {configuration.sessionTimeoutMinDefault}–{configuration.sessionTimeoutMaxDefault} minutes.</span>
                <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-text-secondary">{configuration.sessionTimeoutDefault} min</span>
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-border bg-surface-subtle px-5 py-3 sm:px-6">
        <p className="text-xs text-text-muted">
          {isDirty ? 'Changes apply the next time the agent reconnects.' : 'No unsaved changes.'}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={!isDirty}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={onSave} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  )
}
