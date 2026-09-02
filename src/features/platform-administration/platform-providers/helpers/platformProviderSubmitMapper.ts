import type { PlatformProviderFormData } from '../model/platformProviderForm'
import type { PlatformProviderSubmitData } from '../model/platformProviderTypes'

function nullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed || null
}

function commonPayload(form: PlatformProviderFormData) {
  if (!form.type) throw new Error('Platform provider type is required')
  return {
    id: form.id.trim(),
    name: form.name.trim(),
    description: form.description.trim(),
    type: form.type,
    url: nullable(form.url),
  }
}

export function toPlatformProviderSubmitData(
  form: PlatformProviderFormData,
): PlatformProviderSubmitData {
  const common = commonPayload(form)

  switch (form.type) {
    case 'AIRFLOW':
      return {
        ...common,
        type: form.type,
        ipAddress: nullable(form.ipAddress),
        ...(form.port.trim() ? { port: Number(form.port) } : {}),
        dagDir: nullable(form.dagDir),
        credentialId: nullable(form.credentialId),
        notificationEmail: nullable(form.notificationEmail),
      }
    case 'SMTP':
      return {
        ...common,
        type: form.type,
        ipAddress: nullable(form.ipAddress),
        ...(form.port.trim() ? { port: Number(form.port) } : {}),
        fromEmail: nullable(form.fromEmail),
        disableSsl: form.disableSsl,
        disableTls: form.disableTls,
      }
    case 'BACKEND':
      return {
        ...common,
        type: form.type,
        notificationEmail: nullable(form.notificationEmail),
        loggingEnabled: form.loggingEnabled,
        jwtEnabled: form.jwtEnabled,
        swaggerEnabled: form.swaggerEnabled,
      }
    case 'KEYCLOAK':
      return {
        ...common,
        type: form.type,
        realm: nullable(form.realm),
        clientId: nullable(form.clientId),
        credentialId: nullable(form.credentialId),
      }
    default:
      throw new Error('Platform provider type is required')
  }
}
