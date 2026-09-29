// A spec patch fixes one gap in the backend OpenAPI document. isObsolete returns a
// reason once the backend covers the gap itself; the patch then fails so it gets
// deleted instead of silently overriding the backend.
export function definePatch({ name, isObsolete, apply }) {
  return {
    name,
    run(spec) {
      const reason = isObsolete(spec)
      if (reason) throw new Error(`Spec patch ${name} is obsolete: ${reason}`)
      return apply(spec)
    },
  }
}

export function schemaOf(spec, name) {
  const schema = spec.components?.schemas?.[name]
  if (!schema) throw new Error(`Spec patch target missing: components.schemas.${name}`)
  return schema
}

export const str = fallback => (fallback === undefined ? { type: 'string' } : { type: 'string', default: fallback })
export const int = fallback => ({ type: 'integer', default: fallback })
export const bool = fallback => ({ type: 'boolean', default: fallback })
export const ref = name => ({ $ref: `#/components/schemas/${name}` })
export const loose = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: true })

export function withSchemas(spec, update) {
  return { ...spec, components: { ...spec.components, schemas: { ...spec.components.schemas, ...update } } }
}
