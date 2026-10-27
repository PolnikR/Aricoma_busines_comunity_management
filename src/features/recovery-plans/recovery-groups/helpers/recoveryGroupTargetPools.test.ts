import { expect, it } from 'vitest'
import { missingAutomaticPools } from './recoveryGroupTargetPools'

it('checks the source pool of every selected volume, including pool ID lookup', () => {
  const source = { count: 3, volumes: [{ name: 'A', mdisk_grp_name: 'Pool1' }, { name: 'B', mdisk_grp_id: '2' }, { name: 'C' }], pools: { '2': { name: 'Pool2' } } }
  expect(missingAutomaticPools(source, ['A', 'B', 'C'], [{ name: 'Pool1' }])).toEqual(['Pool2'])
  expect(missingAutomaticPools(source, ['A', 'B'], [{ name: 'Pool1' }, { name: 'Pool2' }])).toEqual([])
  expect(missingAutomaticPools(source, ['C', 'unknown'], [])).toEqual([])
  expect(missingAutomaticPools(undefined, ['A'], [])).toEqual([])
})
