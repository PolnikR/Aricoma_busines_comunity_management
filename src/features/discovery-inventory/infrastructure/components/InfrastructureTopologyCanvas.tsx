import { useEffect, useMemo } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type OnNodeDrag,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { PositionedInfrastructureTopology } from '../layout/layoutInfrastructureTopology'
import {
  mapTopologyToFlowElements,
  type InfrastructureFlowNode,
} from './topologyFlowModel'
import { topologyNodeTypes } from './topologyNodeTypes'
import { useTheme } from '@/contexts/ThemeContext'
import { useTranslation } from '@/hooks/useTranslation'

interface InfrastructureTopologyCanvasProps {
  topology: PositionedInfrastructureTopology
  fitViewRequest?: number
  onNodePositionChange?: (nodeId: string, position: { x: number; y: number }) => void
}

function InfrastructureTopologyCanvasContent({
  topology,
  fitViewRequest = 0,
  onNodePositionChange,
}: InfrastructureTopologyCanvasProps) {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const flowElements = useMemo(() => mapTopologyToFlowElements(topology), [topology])
  const [nodes, setNodes, onNodesChange] = useNodesState<InfrastructureFlowNode>(
    flowElements.nodes,
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowElements.edges)
  const { fitView } = useReactFlow()

  useEffect(() => {
    setNodes(flowElements.nodes)
    setEdges(flowElements.edges)
  }, [flowElements, setEdges, setNodes])

  const handleNodeDragStop: OnNodeDrag<InfrastructureFlowNode> = (_event, node) => {
    onNodePositionChange?.(node.id, node.position)
  }

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      void fitView({ duration: 300, padding: 0.02, minZoom: 0.15, maxZoom: 1.6 })
    })

    return () => {
      window.cancelAnimationFrame(animationFrame)
    }
  }, [fitView, fitViewRequest, topology])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={topologyNodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={handleNodeDragStop}
      nodesConnectable={false}
      edgesReconnectable={false}
      panOnDrag
      selectionOnDrag={false}
      zoomOnPinch
      preventScrolling
      deleteKeyCode={null}
      minZoom={0.15}
      maxZoom={1.6}
      fitView
      fitViewOptions={{ padding: 0.02, minZoom: 0.15, maxZoom: 1.6 }}
      proOptions={{ hideAttribution: true }}
      colorMode={resolvedTheme}
      className="bg-surface-subtle"
      aria-label={t('topology.diagramLabel')}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={22}
        size={1}
        color="var(--color-border-strong)"
      />
      <Controls
        position="bottom-left"
        showInteractive={false}
        className="overflow-hidden! rounded-xl! border! border-border! bg-surface! shadow-sm!"
      />
      <MiniMap
        position="bottom-right"
        pannable
        zoomable
        nodeColor={(node) => {
          if (node.type === 'cluster') return '#465fff'
          if (node.type === 'host') return '#0ba5ec'
          if (node.type === 'datastore') return '#f79009'
          if (node.type === 'powerSystem') return '#465fff'
          if (node.type === 'powerPartition') {
            return node.data.partitionKind === 'VIOS' ? '#f79009' : '#0ba5ec'
          }
          return '#12b76a'
        }}
        maskColor="var(--app-topology-mask)"
        className="h-24! w-36! cursor-grab! rounded-xl! border! border-border! bg-surface! shadow-sm! active:cursor-grabbing!"
      />
    </ReactFlow>
  )
}

export function InfrastructureTopologyCanvas(props: InfrastructureTopologyCanvasProps) {
  const { t } = useTranslation()
  return (
    <div
      className="size-full min-h-0 min-w-0 max-w-full touch-none lg:touch-auto"
      aria-label={t('topology.canvasLabel')}
    >
      <ReactFlowProvider>
        <InfrastructureTopologyCanvasContent {...props} />
      </ReactFlowProvider>
    </div>
  )
}
