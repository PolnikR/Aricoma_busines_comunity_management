import type { useTranslation } from '@/hooks/useTranslation'
import type { VirtualMachine } from '../types/virtualMachineTypes'
import type { ResourceDetailField } from './resourceDetailFields'

type Translate = ReturnType<typeof useTranslation>['t']

export function createVmwareDetailFields(t: Translate): ResourceDetailField<VirtualMachine>[] {
  return [
    {
      id: 'os',
      label: t('details.os'),
      value: (vm) => vm.guestOs,
    },
    {
      id: 'cluster',
      label: t('details.cluster'),
      value: (vm) => vm.cluster,
      secondary: (vm) => vm.host,
    },
    {
      id: 'datastore',
      label: t('details.datastore'),
      value: (vm) => vm.datastore,
      secondary: (vm) => (
        `${String(vm.vdisks.length)} ${t('details.disks')} / ${String(Math.round(vm.vdisks.reduce((sum, disk) => sum + disk.capacityGb, 0)))} GB`
      ),
    },
    {
      id: 'folder',
      label: t('details.folder'),
      value: (vm) => vm.folder,
    },
    {
      id: 'vmPath',
      label: t('details.vmPath'),
      value: (vm) => vm.vmPath,
    },
  ]
}
