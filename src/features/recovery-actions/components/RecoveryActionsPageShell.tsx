import { useNavigate } from 'react-router'
import type { ReactNode } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { Card } from '@/shared/components/card/Card'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { ExecutionIcon, GridIcon, MonitoringIcon, SettingsIcon } from '@/shared/icons/Icons'
import { WorkspaceTabs } from '@/shared/components/tabs/WorkspaceTabs'
import { getRecoveryActionPath, recoveryActionTabs } from '../model/recoveryActionNavigation'
import { buildRecoveryActionTabPresentation } from '../model/recoveryActionTabPresentation'
import type { RecoveryActionTab } from '../model/recoveryActionTypes'
import {
  initialRecoverySchedule,
  latestAutomatedRun,
  latestValidationChecks,
  recoveryApplicationGroups,
  recoveryHistory,
} from '../mocks/recoveryActionsMocks'

interface RecoveryActionsPageShellProps {
  activeTab: RecoveryActionTab
  children: ReactNode
}

const tabIcons: Record<RecoveryActionTab, ReactNode> = {
  validate: <GridIcon className="size-4" />,
  execute: <ExecutionIcon className="size-4" />,
  schedule: <SettingsIcon className="size-4" />,
  history: <MonitoringIcon className="size-4" />,
}

export function RecoveryActionsPageShell({ activeTab, children }: RecoveryActionsPageShellProps) {
  const { t, language } = useTranslation()
  const navigate = useNavigate()
  const presentation = buildRecoveryActionTabPresentation({
    latestAutomatedRun,
    latestValidationChecks,
    applicationGroupCount: recoveryApplicationGroups.length,
    schedule: initialRecoverySchedule,
    historyCount: recoveryHistory.length,
    evidenceWindowDays: 30,
  })
  const tabItems = recoveryActionTabs.map((tab) => ({
    value: tab.value,
    label: t(tab.labelKey),
    description: t(presentation[tab.value].detail.key, normalizeDetailParams(presentation[tab.value].detail.params, language)),
    icon: tabIcons[tab.value],
    meta: <Badge size="sm" color={getBadgeColor(presentation[tab.value].status.tone)}>{t(presentation[tab.value].status.labelKey, presentation[tab.value].status.params)}</Badge>,
  }))

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow={t('pages.recoveryActions.eyebrow')}
        title={t('pages.recoveryActions.title')}
        description={t('pages.recoveryActions.description')}
        actions={<Button size="sm" variant="outline" onClick={() => { window.location.reload() }}>{t('common.refresh')}</Button>}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <div className="flex shrink-0 flex-col gap-1 border-b border-border px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold text-text-primary">{t('pages.recoveryActions.workspace.title')}</h2>
            <p className="text-xs text-text-muted">{t('pages.recoveryActions.workspace.description')}</p>
          </div>
          <WorkspaceTabs
            items={tabItems}
            value={activeTab}
            onChange={(tab) => { void navigate(getRecoveryActionPath(tab)) }}
            ariaLabel={t('pages.recoveryActions.tabs.ariaLabel')}
          />
          <div id={`${activeTab}-panel`} role="tabpanel" aria-labelledby={`${activeTab}-tab`} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto border-t border-border bg-surface-subtle/30 p-4 sm:p-5">
            {children}
          </div>
        </Card>
      </div>
    </div>
  )
}

function getBadgeColor(tone: 'success' | 'warning' | 'info' | 'neutral'): 'success' | 'warning' | 'info' | 'light' {
  if (tone === 'neutral') return 'light'
  return tone
}

function normalizeDetailParams(params: Record<string, string | number>, language: string) {
  if (typeof params['date'] !== 'string') return params

  const locale = language === 'sk' ? 'sk-SK' : language === 'cs' ? 'cs-CZ' : 'en-GB'
  return {
    ...params,
    date: new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(params['date'])),
  }
}
