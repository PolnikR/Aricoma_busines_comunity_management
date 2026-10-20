import { definePatch, loose, ref, schemaOf, withSchemas } from './definePatch.mjs'

const list = { type: 'array', items: {} }

export default definePatch({
  name: 'rollbackReport',
  isObsolete: spec => (schemaOf(spec, 'RollbackReport').properties.airflow ? 'RollbackReport.airflow is typed' : null),
  apply: (spec) => {
    const report = schemaOf(spec, 'RollbackReport')
    const optional = name => ({ anyOf: [ref(name), { type: 'null' }] })
    return withSchemas(spec, {
      RollbackAirflowSection: loose({
        status: { type: 'string' }, dag_id: { type: 'string' }, paused: { type: 'string' },
        failed_runs: list, dag_file: { type: 'string' }, dag_record: { type: 'string' },
      }, ['status']),
      // Power rollback returns { hosts, errors } without status; group rollback may include status.
      // Inner records stay unknown: failed or partial cleanup need not include every field.
      RollbackIbmSection: loose({ status: { type: 'string' }, hosts: list, consistency_groups: list, fcmaps: list, volumes: list, errors: list }, []),
      // These fields are not present in BE OpenAPI today; preserve BE response
      // extensions through Orval regeneration without enforcing nested shapes.
      RollbackComputeSection: loose({ status: { type: 'string' }, errors: list }),
      RollbackVcenterSection: loose({ status: { type: 'string' }, errors: list }),
      RollbackReport: {
        ...report,
        additionalProperties: true,
        properties: {
          ...report.properties,
          airflow: optional('RollbackAirflowSection'),
          ibm: optional('RollbackIbmSection'),
          compute: optional('RollbackComputeSection'),
          vcenter: optional('RollbackVcenterSection'),
        },
      },
    })
  },
})
