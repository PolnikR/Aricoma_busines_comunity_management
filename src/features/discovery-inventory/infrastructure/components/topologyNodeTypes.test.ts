import { describe, expect, it } from 'vitest'
import { topologyNodeTypes } from './topologyNodeTypes'

describe('topologyNodeTypes', () => {
  it('registers every supported topology node kind', () => {
    expect(Object.keys(topologyNodeTypes).sort()).toEqual([
      'cluster', 'consistencyGroup', 'datastore', 'fcmap', 'host', 'pool',
      'powerPartition', 'powerSystem', 'virtualMachine', 'volume',
    ])
  })
})
