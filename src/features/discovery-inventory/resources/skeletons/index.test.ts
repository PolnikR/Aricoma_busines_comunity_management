import { describe, expect, it } from 'vitest'
import {
  FilterPanelSkeleton,
  MetricsSkeleton,
  SkeletonBlock,
  VirtualMachinesSkeleton,
} from './index'

describe('virtual machine skeleton exports', () => {
  it('exports every public skeleton component', () => {
    expect(FilterPanelSkeleton).toBeTypeOf('function')
    expect(MetricsSkeleton).toBeTypeOf('function')
    expect(SkeletonBlock).toBeTypeOf('function')
    expect(VirtualMachinesSkeleton).toBeTypeOf('function')
  })
})
