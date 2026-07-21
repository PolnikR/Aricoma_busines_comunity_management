import { useEffect, useRef, useState, memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { ServerIcon } from '@/shared/icons/Icons'
import type { HostTopologyNode } from '../../model/topologyTypes'
import { TopologyNodeShell } from './TopologyNodeShell'
import { HostNodeTooltip } from './HostNodeTooltip'

type HostFlowNode = Node<
  HostTopologyNode & Record<string, unknown>,
  'host'
>

export const HostNode = memo(function HostNode({
  data,
  selected,
}: NodeProps<HostFlowNode>) {
  const clusterLabel = data.clusterNames.length > 0
    ? data.clusterNames.join(', ')
    : 'No cluster'

  const [showTooltip, setShowTooltip] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nodeRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true)
    }, 500)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setShowTooltip(false)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={nodeRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      <TopologyNodeShell
        kindLabel="Host"
        title={data.label}
        subtitle={clusterLabel}
        icon={<ServerIcon className="size-5" />}
        iconClassName="bg-blue-light-50 text-blue-light-700"
        selected={selected}
        showTargetHandle
        showSourceHandle
      >
        <span className="text-[11px] font-medium text-[#4f6079]">
          {data.virtualMachineCount} virtual machines
        </span>
      </TopologyNodeShell>

      {showTooltip ? (
        <HostNodeTooltip
          nodeRef={nodeRef}
          data={{
            name: data.label,
            clusters: data.clusterNames,
            vmCount: data.virtualMachineCount,
          }}
        />
      ) : null}
    </div>
  )
})
