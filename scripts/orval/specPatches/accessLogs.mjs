import { readFileSync } from 'node:fs'
import { definePatch } from './definePatch.mjs'

const data = JSON.parse(readFileSync(new URL('./data/accessLogs.json', import.meta.url), 'utf8'))

// The backend spec returns an untyped schema for /get_access_logs.
export default definePatch({
  name: 'accessLogs',
  isObsolete: spec => (spec.components?.schemas?.AccessLogsResponse ? 'backend publishes AccessLogsResponse' : null),
  apply: (spec) => {
    const path = spec.paths['/get_access_logs']
    const get = path.get
    return {
      ...spec,
      components: { ...spec.components, schemas: { ...spec.components.schemas, ...data.schemas } },
      paths: {
        ...spec.paths,
        '/get_access_logs': {
          ...path,
          get: {
            ...get,
            responses: {
              ...get.responses,
              200: {
                ...get.responses['200'],
                content: { 'application/json': { schema: { $ref: '#/components/schemas/AccessLogsResponse' } } },
              },
            },
          },
        },
      },
    }
  },
})
