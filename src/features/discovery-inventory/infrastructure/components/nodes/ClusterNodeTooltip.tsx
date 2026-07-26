import { TopologyTooltip, TopologyTooltipField } from './TopologyTooltip'

interface ClusterNodeTooltipProps {
  data: {
    name: string
    description: string
    hostCount: number
  }
  nodeRef: React.RefObject<HTMLElement | null>
}

export function ClusterNodeTooltip({ data, nodeRef }: ClusterNodeTooltipProps) {
  const hostLabel = data.hostCount === 1 ? 'host' : 'hosts'

  return (
    <TopologyTooltip nodeRef={nodeRef} estimatedHeight={120}>
      <div className="space-y-2">
        <TopologyTooltipField label="Name" value={data.name} />
        <TopologyTooltipField label="Description" value={data.description} />
        <TopologyTooltipField label="Hosts" value={`${String(data.hostCount)} ${hostLabel}`} />
      </div>
    </TopologyTooltip>
  )
}

export type { ClusterNodeTooltipProps }
