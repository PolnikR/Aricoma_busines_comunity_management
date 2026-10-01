// Routes already named after an action keep that action; other routes get the
// HTTP verb as prefix so GET and PUT on the same route stay distinct.
const ACTION_PREFIXES = ['get_', 'submit_', 'delete_', 'test_', 'rollback_']

const camelCase = value => value.replace(/[/_]+([a-z0-9])/g, (_, char) => char.toUpperCase())

export default function operationName(_operation, route, verb) {
  // Path params arrive as `{client_uuid}` (spec) or `${clientUuid}` (Orval-templated);
  // dropping the delimiters turns them into plain segments.
  const raw = route.replace(/[${}]/g, '').replace(/^\/+/, '')
  const name = camelCase(raw)
  if (ACTION_PREFIXES.some(prefix => raw.startsWith(prefix))) return name
  return verb + name.charAt(0).toUpperCase() + name.slice(1)
}
