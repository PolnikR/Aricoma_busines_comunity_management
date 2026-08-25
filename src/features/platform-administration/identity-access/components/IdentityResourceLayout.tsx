import type { ReactNode } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/shared/components/button/Button'
import { Tabs, type TabItem } from '@/shared/components/tabs/Tabs'

interface IdentityContentPanelProps {
  children: ReactNode
}

export function IdentityContentPanel({ children }: IdentityContentPanelProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      {children}
    </div>
  )
}

interface IdentityResourceHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  backLabel?: string
  onBack?: () => void
}

export function IdentityResourceHeader({
  eyebrow,
  title,
  description,
  actions,
  backLabel,
  onBack,
}: IdentityResourceHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {backLabel && onBack ? (
          <Button size="sm" variant="outline" onClick={onBack}>{backLabel}</Button>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">{eyebrow}</p> : null}
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          {description ? <p className="mt-1 max-w-3xl text-xs text-text-muted">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

interface IdentityResourceDetailPageProps<T extends string> extends IdentityResourceHeaderProps {
  tabs: readonly TabItem<T>[]
  tabId: T
  onTabChange: (tabId: T) => void
  children: ReactNode
  tabAriaLabel: string
}

export function IdentityResourceDetailPage<T extends string>({
  tabs,
  tabId,
  onTabChange,
  children,
  tabAriaLabel,
  ...headerProps
}: IdentityResourceDetailPageProps<T>) {
  const { t } = useTranslation()
  return (
    <IdentityContentPanel>
      <IdentityResourceHeader {...headerProps} />
      <Tabs
        items={tabs}
        value={tabId}
        onChange={onTabChange}
        ariaLabel={tabAriaLabel}
        indicator="inset"
        scrollControls={{
          previousLabel: t('identity.common.scroll.previous', { label: tabAriaLabel }),
          nextLabel: t('identity.common.scroll.next', { label: tabAriaLabel }),
        }}
      />
      <div className="min-w-0">{children}</div>
    </IdentityContentPanel>
  )
}

interface IdentitySettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
}

export function IdentitySettingsSection({ title, description, children }: IdentitySettingsSectionProps) {
  return (
    <section className="border-b border-border px-4 py-5 last:border-b-0">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {description ? <p className="mt-1 text-xs text-text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}
