import { Card, CardDescription, CardTitle } from '@/shared/components/card/Card'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'

interface ModuleWorkQueuePageProps {
  eyebrow: string
  title: string
  description: string
  excelSource: string
  apiBoundary: string
  workflowItems: string[]
}

export function ModuleWorkQueuePage({
  eyebrow,
  title,
  description,
  excelSource,
  apiBoundary,
  workflowItems,
}: ModuleWorkQueuePageProps) {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{t('placeholder.preparedWorkspace')}</CardTitle>
              <CardDescription>
                {t('placeholder.preparedDescription')}
              </CardDescription>
            </div>
            <span className="inline-flex w-fit rounded-full border border-border-strong bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
              {t('placeholder.apiReady')}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {workflowItems.map((item) => (
              <div key={item} className="rounded-xl border border-border bg-surface-subtle p-4">
                <div className="mb-3 h-2 w-16 rounded-full bg-surface-muted" />
                <h2 className="text-sm font-semibold text-text-primary">{item}</h2>
                <p className="mt-2 text-xs leading-5 text-text-muted">
                  {t('placeholder.areaDescription')}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardTitle>{t('placeholder.traceability')}</CardTitle>
            <CardDescription>{excelSource}</CardDescription>
          </Card>

          <Card>
            <CardTitle>{t('placeholder.apiBoundary')}</CardTitle>
            <CardDescription>{apiBoundary}</CardDescription>
            <div className="mt-4 rounded-xl border border-dashed border-border bg-surface-subtle p-3 text-xs text-text-muted">
              {t('placeholder.futureHook')}
            </div>
          </Card>
        </aside>
      </div>
    </>
  )
}
