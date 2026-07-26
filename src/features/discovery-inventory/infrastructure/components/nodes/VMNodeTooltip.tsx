import { TopologyTooltip, TopologyTooltipField } from './TopologyTooltip'

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
  nodeRef: React.RefObject<HTMLElement | null>
}

export function VMNodeTooltip({ data, nodeRef }: VMNodeTooltipProps) {
  return (
    <TopologyTooltip nodeRef={nodeRef} estimatedHeight={220}>
      <div className="space-y-2">
        <TopologyTooltipField label="Name" value={data.name} />
        <TopologyTooltipField label="Status" value={data.status} />
        <TopologyTooltipField label="CPU" value={data.cpu !== undefined ? `${String(data.cpu)} cores` : '—'} />
        <TopologyTooltipField label="Memory" value={data.memory !== undefined ? `${String(data.memory)} GB` : '—'} />
        <TopologyTooltipField label="Disk" value={data.disk !== undefined ? `${String(data.disk)} GB` : '—'} />
        <TopologyTooltipField label="IP" value={data.ipAddress ?? '—'} />
        <TopologyTooltipField label="Host" value={data.host ?? '—'} />
        <TopologyTooltipField label="Cluster" value={data.cluster ?? '—'} />

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
    </TopologyTooltip>
  )
}

export type { VMNodeTooltipProps }
