import { describe, expect, it } from 'vitest'
import { topologyNodeTypes } from './topologyNodeTypes'

describe('topologyNodeTypes', () => {
  it('registers every supported topology node kind', () => {
    expect(Object.keys(topologyNodeTypes).sort()).toEqual([
      'cluster', 'datastore', 'host', 'virtualMachine',
    ])
  })
})
