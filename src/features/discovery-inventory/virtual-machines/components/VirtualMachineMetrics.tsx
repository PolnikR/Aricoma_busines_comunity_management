import { Card } from '@/shared/components/card/Card'
import type { VirtualMachine } from '../types'

interface VirtualMachineMetricsProps {
  virtualMachines: VirtualMachine[]
}

export function VirtualMachineMetrics({ virtualMachines }: VirtualMachineMetricsProps) {
  const poweredOn = virtualMachines.filter((vm) => vm.powerState === 'poweredOn').length
  const clusters = new Set(virtualMachines.map((vm) => vm.cluster)).size
  const totalCpu = virtualMachines.reduce((sum, vm) => sum + vm.vcpu, 0)
  const totalMemory = virtualMachines.reduce((sum, vm) => sum + vm.memoryGb, 0)

  const metrics = [
    { label: 'Discovered VMs', value: virtualMachines.length.toString(), helper: 'Validated fixture records' },
    { label: 'Powered on', value: poweredOn.toString(), helper: 'Currently running' },
    { label: 'Clusters', value: clusters.toString(), helper: 'Derived from placement' },
    { label: 'Allocated compute', value: `${String(totalCpu)} vCPU`, helper: `${String(totalMemory)} GB memory` },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="p-4 sm:p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{metric.label}</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <strong className="text-2xl font-semibold text-gray-900 dark:text-white">{metric.value}</strong>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{metric.helper}</p>
        </Card>
      ))}
    </div>
  )
}