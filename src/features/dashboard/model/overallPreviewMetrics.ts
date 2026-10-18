export type StorageVendor = 'all' | 'ibm' | 'hitachi'

export interface OverallPreviewData {
  vendors: { id: Exclude<StorageVendor, 'all'>; name: string; protectedVolumes: number; unprotectedVolumes: number }[]
  providers: { id: string; name: string; kind: string; symbol: string; total: number; available: number }[]
  groups: { local: number; remote: number }
  applications: { vmware: number; power: number }
  deployment: Record<'vmware' | 'power' | 'production' | 'test', { pushed: number; total: number }>
}

export function selectOverallProtection(data: OverallPreviewData, vendor: StorageVendor) {
  const included = data.vendors.filter(item => vendor === 'all' || item.id === vendor)
  const withSnapshots = included.reduce((count, item) => count + item.protectedVolumes, 0)
  const withoutSnapshots = included.reduce((count, item) => count + item.unprotectedVolumes, 0)
  const total = withSnapshots + withoutSnapshots
  return { withSnapshots, withoutSnapshots, total, percent: total ? Math.round(withSnapshots * 100 / total) : 0 }
}

export const overallNumber = (value: number) => new Intl.NumberFormat('en-US').format(value)
