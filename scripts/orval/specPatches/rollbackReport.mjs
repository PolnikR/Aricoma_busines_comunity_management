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
      RollbackIbmSection: loose({ status: { type: 'string' }, consistency_groups: list, fcmaps: list, volumes: list, errors: list }, ['status']),
      RollbackReport: {
        ...report,
        additionalProperties: true,
        properties: { ...report.properties, airflow: optional('RollbackAirflowSection'), ibm: optional('RollbackIbmSection') },
      },
    })
  },
})
