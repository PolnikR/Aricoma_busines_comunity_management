import { useEffect, useRef, useState, memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { LayersIcon } from '@/shared/icons/Icons'
import type { ClusterTopologyNode } from '../../model/topologyTypes'
import { TopologyNodeShell } from './TopologyNodeShell'
import { ClusterNodeTooltip } from './ClusterNodeTooltip'

type ClusterFlowNode = Node<
  ClusterTopologyNode & Record<string, unknown>,
  'cluster'
>

export const ClusterNode = memo(function ClusterNode({
  data,
  selected,
}: NodeProps<ClusterFlowNode>) {
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
        kindLabel="Cluster"
        title={data.label}
        subtitle="Compute cluster"
        icon={<LayersIcon className="size-5" />}
        iconClassName="bg-brand-50 text-brand-600"
        selected={selected}
        showSourceHandle
      >
        <span className="text-[11px] font-medium text-[#4f6079]">
          {data.hostCount} {data.hostCount === 1 ? 'host' : 'hosts'}
        </span>
      </TopologyNodeShell>

      {showTooltip ? (
        <ClusterNodeTooltip
          nodeRef={nodeRef}
          data={{
            name: data.label,
            description: 'Compute cluster',
            hostCount: data.hostCount,
          }}
        />
      ) : null}
    </div>
  )
})
