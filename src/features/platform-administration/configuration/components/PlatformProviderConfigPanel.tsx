import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { Field, Input } from '@/shared/components/form/FormControls'
import { Toggle } from '@/shared/components/toggle/Toggle'
import type { PlatformProviderConfig } from '../mocks/platformProviderConfigMocks'

interface PlatformProviderConfigPanelProps {
  provider: PlatformProviderConfig
  isDirty: boolean
  onWorkDirectoryChange: (value: string) => void
  onTempDirectoryChange: (value: string) => void
  onLogDirectoryChange: (value: string) => void
  onSessionTimeoutChange: (value: number) => void
  onAutoRenewChange: (value: boolean) => void
  onResetField: (field: 'workDirectory' | 'tempDirectory' | 'logDirectory' | 'sessionTimeoutMinutes') => void
  onSave: () => void
  onCancel: () => void
}

export function PlatformProviderConfigPanel({
  provider,
  isDirty,
  onWorkDirectoryChange,
  onTempDirectoryChange,
  onLogDirectoryChange,
  onSessionTimeoutChange,
  onAutoRenewChange,
  onResetField,
  onSave,
  onCancel,
}: PlatformProviderConfigPanelProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-[20px] border border-border bg-surface shadow-[0_14px_35px_-28px_rgba(37,72,112,0.45)]">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-text-primary">{provider.name}</h2>
          <p className="mt-1 text-sm text-text-muted">Agent runtime paths and session behaviour for this integration</p>
        </div>
        <Badge variant="light" size="sm" color={provider.connectionStatus === 'connected' ? 'success' : 'light'}>
          {provider.connectionStatus === 'connected' ? 'Connected' : 'Not configured'}
        </Badge>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto">
        <section className="border-b border-border px-5 py-5 sm:px-6">
          <h3 className="text-sm font-semibold text-text-primary">Runtime directories</h3>
          <p className="mt-1 max-w-prose text-sm text-text-muted">
            Where the agent reads and writes on the host it runs on. Paths must already exist and be writable by the service account.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Work directory" htmlFor="work-directory">
                <div className="flex gap-2">
                  <Input
                    id="work-directory"
                    size="sm"
                    spellCheck={false}
                    value={provider.workDirectory}
                    onChange={event => { onWorkDirectoryChange(event.target.value) }}
                  />
                  <Button size="sm" variant="outline" onClick={() => { onResetField('workDirectory') }}>
                    Reset
                  </Button>
                </div>
              </Field>
              <p className="mt-1.5 flex items-center justify-between gap-3 text-xs text-text-subtle">
                <span>Staging area for in-flight recovery jobs and job manifests.</span>
                <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-text-secondary">{provider.workDirectoryDefault}</span>
              </p>
            </div>

            <div>
              <Field label="Temp directory" htmlFor="temp-directory">
                <div className="flex gap-2">
                  <Input
                    id="temp-directory"
                    size="sm"
                    spellCheck={false}
                    value={provider.tempDirectory}
                    onChange={event => { onTempDirectoryChange(event.target.value) }}
                  />
                  <Button size="sm" variant="outline" onClick={() => { onResetField('tempDirectory') }}>
                    Reset
                  </Button>
                </div>
              </Field>
              <p className="mt-1.5 flex items-center justify-between gap-3 text-xs text-text-subtle">
                <span>Cleared automatically after each job.</span>
                <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-text-secondary">{provider.tempDirectoryDefault}</span>
              </p>
            </div>

            <div>
              <Field label="Log directory" htmlFor="log-directory">
                <div className="flex gap-2">
                  <Input
                    id="log-directory"
                    size="sm"
                    spellCheck={false}
                    value={provider.logDirectory}
                    onChange={event => { onLogDirectoryChange(event.target.value) }}
                  />
                  <Button size="sm" variant="outline" onClick={() => { onResetField('logDirectory') }}>
                    Reset
                  </Button>
                </div>
              </Field>
              <p className="mt-1.5 flex items-center justify-between gap-3 text-xs text-text-subtle">
                <span>Rotated daily, retained per the platform log policy.</span>
                <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-text-secondary">{provider.logDirectoryDefault}</span>
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-5 sm:px-6">
          <h3 className="text-sm font-semibold text-text-primary">Session</h3>
          <p className="mt-1 max-w-prose text-sm text-text-muted">
            How long an authenticated session stays valid before the platform must re-authenticate.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Field label="Session timeout (minutes)" htmlFor="session-timeout">
                <div className="flex gap-2">
                  <Input
                    id="session-timeout"
                    type="number"
                    size="sm"
                    min={provider.sessionTimeoutMinDefault}
                    max={provider.sessionTimeoutMaxDefault}
                    value={provider.sessionTimeoutMinutes}
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
                min={provider.sessionTimeoutMinDefault}
                max={provider.sessionTimeoutMaxDefault}
                value={provider.sessionTimeoutMinutes}
                onChange={event => { onSessionTimeoutChange(Number(event.target.value)) }}
                className="mt-2 w-full accent-accent"
              />
              <p className="mt-1.5 flex items-center justify-between gap-3 text-xs text-text-subtle">
                <span>Allowed range: {provider.sessionTimeoutMinDefault}–{provider.sessionTimeoutMaxDefault} minutes.</span>
                <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-text-secondary">{provider.sessionTimeoutDefault} min</span>
              </p>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface-subtle px-4 py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">Auto-renew on activity</p>
                <p className="mt-1 text-xs text-text-muted">
                  Extend the session automatically while jobs are actively running, instead of expiring mid-recovery.
                </p>
              </div>
              <Toggle
                checked={provider.autoRenewOnActivity}
                onChange={onAutoRenewChange}
                label="Auto-renew on activity"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border bg-surface-subtle px-5 py-4 sm:px-6">
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
