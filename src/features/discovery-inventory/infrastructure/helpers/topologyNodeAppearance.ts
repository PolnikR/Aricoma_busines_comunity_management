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

export function getNodeColor(node: { type: string; data?: Record<string, unknown> }): string {
  if (node.type === 'powerPartition') {
    const partitionKind = node.data?.['partitionKind']
    return partitionKind === 'VIOS' ? topologyNodeColorMap.powerPartitionVIOS : topologyNodeColorMap.powerPartitionLPAR
  }
  return topologyNodeColorMap[node.type] ?? '#12b76a'
}
