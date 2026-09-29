import { definePatch, loose, ref, schemaOf, str, withSchemas } from './definePatch.mjs'

const partition = {
  type: 'object',
  properties: {
    PartitionUUID: str(), PartitionName: str(), PartitionType: str(), PartitionState: str(), SystemName: str(),
  },
  // Orval only keeps extra keys for `additionalProperties: true`; the partition
  // records carry many vendor fields the mapper reads.
  additionalProperties: true,
}

export default definePatch({
  name: 'powerInventory',
  isObsolete: (spec) => {
    const lpar = schemaOf(spec, 'PowerVmRecord').properties.lpar
    return lpar.properties || lpar.$ref ? 'PowerVmRecord.lpar is typed' : null
  },
  apply: (spec) => {
    const record = schemaOf(spec, 'PowerVmRecord')
    const response = schemaOf(spec, 'PowerVmsResponse')
    return withSchemas(spec, {
      PowerPartition: partition,
      PowerVmRecord: { ...record, properties: { ...record.properties, lpar: ref('PowerPartition'), vios: ref('PowerPartition') } },
      PowerVmsResponse: {
        ...response,
        properties: {
          ...response.properties,
          provider_id: { type: 'string' },
          counts_by_type: loose(
            { LogicalPartition: { type: 'integer', minimum: 0 }, VirtualIOServer: { type: 'integer', minimum: 0 } },
            ['LogicalPartition', 'VirtualIOServer'],
          ),
        },
      },
    })
  },
})
