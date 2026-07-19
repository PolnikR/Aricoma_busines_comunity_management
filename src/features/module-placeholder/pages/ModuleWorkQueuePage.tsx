import { Card, CardDescription, CardTitle } from '@/shared/components/card/Card'
import { PageHeader } from '@/shared/components/page/PageHeader'

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
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 border-b border-[#e6edf5] pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Prepared workspace</CardTitle>
              <CardDescription>
                The screen is routed and ready for a backend query hook. Data tables, actions, and validation states will be connected after the API contract is confirmed.
              </CardDescription>
            </div>
            <span className="inline-flex w-fit rounded-full border border-[#cfe4f4] bg-[#f5fbff] px-3 py-1 text-xs font-medium text-[#0d7fb8]">
              API ready
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {workflowItems.map((item) => (
              <div key={item} className="rounded-xl border border-[#e3ebf4] bg-[#fbfdff] p-4">
                <div className="mb-3 h-2 w-16 rounded-full bg-[#dce8f5]" />
                <h2 className="text-sm font-semibold text-[#17233d]">{item}</h2>
                <p className="mt-2 text-xs leading-5 text-[#71819a]">
                  Placeholder area for data, controls, loading state, empty state, and backend error handling.
                </p>
              </div>
            ))}
          </div>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardTitle>Traceability</CardTitle>
            <CardDescription>{excelSource}</CardDescription>
          </Card>

          <Card>
            <CardTitle>API boundary</CardTitle>
            <CardDescription>{apiBoundary}</CardDescription>
            <div className="mt-4 rounded-xl border border-dashed border-[#cfdceb] bg-[#f8fbfe] p-3 text-xs text-[#5f6f86]">
              Future hook: fetch data through the ABCO backend API only.
            </div>
          </Card>
        </aside>
      </div>
    </>
  )
}
