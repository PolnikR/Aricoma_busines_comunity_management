import { TopologyTooltip, TopologyTooltipField } from './TopologyTooltip'

interface HostNodeTooltipProps {
  data: {
    name: string
    clusters: string[]
    vmCount: number
  }
  nodeRef: React.RefObject<HTMLElement | null>
}

export function HostNodeTooltip({ data, nodeRef }: HostNodeTooltipProps) {
  return (
    <TopologyTooltip nodeRef={nodeRef} estimatedHeight={140}>
      <div className="space-y-2">
        <TopologyTooltipField label="Name" value={data.name} />
        <TopologyTooltipField label="Cluster" value={data.clusters.length > 0 ? data.clusters.join(', ') : 'No cluster'} />
        <TopologyTooltipField label="VMs" value={String(data.vmCount)} />
      </div>
    </TopologyTooltip>
  )
}

export type { HostNodeTooltipProps }
