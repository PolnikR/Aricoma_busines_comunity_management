interface VMNodeTooltipProps {
  data: {
    name: string
    status: string
    cpu?: number
    memory?: number
    disk?: number
    ipAddress?: string
    host?: string
    cluster?: string
    tags?: string[]
  }
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs">
      <span className="text-slate-400">{label}:</span>
      <span className="ml-2 truncate text-slate-100">{value}</span>
    </div>
  )
}

export function VMNodeTooltip({ data }: VMNodeTooltipProps) {
  return (
    <div className="absolute top-0 right-0 z-50 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs shadow-lg min-w-[260px]">
      <div className="space-y-2">
        <Field label="Name" value={data.name} />
        <Field label="Status" value={data.status} />
        {data.cpu !== undefined && <Field label="CPU" value={`${data.cpu} cores`} />}
        {data.cpu === undefined && <Field label="CPU" value="—" />}
        {data.memory !== undefined && <Field label="Memory" value={`${data.memory} GB`} />}
        {data.memory === undefined && <Field label="Memory" value="—" />}
        {data.disk !== undefined && <Field label="Disk" value={`${data.disk} GB`} />}
        {data.disk === undefined && <Field label="Disk" value="—" />}
        <Field label="IP" value={data.ipAddress || '—'} />
        <Field label="Host" value={data.host || '—'} />
        <Field label="Cluster" value={data.cluster || '—'} />

        {data.tags && data.tags.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-400">Tags</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-block rounded bg-slate-700 px-2 py-1 text-slate-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export type { VMNodeTooltipProps }
