import { definePatch, schemaOf, withSchemas } from './definePatch.mjs'

export default definePatch({
  name: 'recoveryVmMetadata',
  isObsolete: spec => (schemaOf(spec, 'RecoveryVM').properties.order ? 'RecoveryVM.order is typed' : null),
  apply: (spec) => {
    const vm = schemaOf(spec, 'RecoveryVM')
    return withSchemas(spec, {
      RecoveryVM: {
        ...vm,
        properties: {
          ...vm.properties,
          order: { type: 'integer' }, hostname: { type: 'string' }, ip_address: { type: 'string' }, os: { type: 'string' },
          cpu: { type: 'number' }, memory_gb: { type: 'number' }, storage_gb: { type: 'number' },
        },
      },
    })
  },
})
