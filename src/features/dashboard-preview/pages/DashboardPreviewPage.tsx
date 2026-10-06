import { Navigate, useNavigate, useParams } from 'react-router'
import { routes } from '@/app/routes'
import { Badge } from '@/shared/components/badge/Badge'
import { FilterTabs } from '@/shared/components/filters/FilterTabs'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { mockDashboardData } from '../model/mockDashboardData'
import { ControlCenterVariant } from '../variants/ControlCenterVariant'
import { OperationsOverviewVariant } from '../variants/OperationsOverviewVariant'
import { RecoveryFirstVariant } from '../variants/RecoveryFirstVariant'
import { StatusBoardVariant } from '../variants/StatusBoardVariant'

const variants = {
  a: { label: 'A · Operations overview', Component: OperationsOverviewVariant },
  b: { label: 'B · Recovery first', Component: RecoveryFirstVariant },
  c: { label: 'C · Control center', Component: ControlCenterVariant },
  d: { label: 'D · Status board', Component: StatusBoardVariant },
} as const

type VariantKey = keyof typeof variants

function isVariantKey(value: string | undefined): value is VariantKey {
  return value !== undefined && value in variants
}

// Design exploration only: every variant renders the same mock dataset, no API calls.
export function DashboardPreviewPage() {
  const { variant } = useParams()
  const navigate = useNavigate()

  if (!isVariantKey(variant)) {
    return <Navigate to={`${routes.dashboardPreview}/a`} replace />
  }

  const { Component } = variants[variant]

  return (
    <div className="flex flex-col">
      <PageHeader
        title={(
          <span className="inline-flex items-center gap-2.5">
            Dashboard
            <Badge color="warning" size="sm">Preview · mock data</Badge>
          </span>
        )}
        description="Infrastructure, protection and recovery at a glance"
        actions={(
          <FilterTabs
            ariaLabel="Dashboard variant"
            value={variant}
            onChange={(next) => { void navigate(`${routes.dashboardPreview}/${next}`) }}
            tabs={Object.entries(variants).map(([key, { label }]) => ({ value: key, label }))}
          />
        )}
      />
      <Component data={mockDashboardData} />
    </div>
  )
}
