const DEFAULT_NODE_COLOR = '#12b76a'

export const topologyNodeColorMap: Record<string, string> = {
  cluster: '#465fff',
  host: '#0ba5ec',
  datastore: '#f79009',
  powerSystem: '#465fff',
  powerPartitionLPAR: '#0ba5ec',
  powerPartitionVIOS: '#f79009',
  pool: '#f79009',
  volume: '#0ba5ec',
  fcmap: '#465fff',
  consistencyGroup: '#6b7280',
}

export function getNodeColor(node: { type: string | undefined; data: Record<string, unknown> | undefined }): string {
  if (!node.type) return DEFAULT_NODE_COLOR
  if (node.type === 'powerPartition') {
    const partitionKind = node.data?.['partitionKind']
    return partitionKind === 'VIOS'
      ? topologyNodeColorMap['powerPartitionVIOS'] ?? DEFAULT_NODE_COLOR
      : topologyNodeColorMap['powerPartitionLPAR'] ?? DEFAULT_NODE_COLOR
  }
  return topologyNodeColorMap[node.type] ?? DEFAULT_NODE_COLOR
}
