export const EXTERNAL_SERVICES = {
  airflow: {
    defaultBaseUrl: 'http://10.99.99.55:8080',
    dagsPath: '/dags',
    dagsUrl: 'http://10.99.99.55:8080/dags',
  },
} as const

function resolveAirflowBaseUrl(providerUrl?: string | null): string {
  if (providerUrl == null || providerUrl.trim().length === 0) {
    return EXTERNAL_SERVICES.airflow.defaultBaseUrl
  }
  return providerUrl.trim()
}

export function buildAirflowDagUrl(
  runId: string,
  providerUrl?: string | null,
): string {
  const configuredUrl = resolveAirflowBaseUrl(providerUrl)
  const normalizedUrl = configuredUrl.replace(/\/+$/, '')
  const dagsUrl = normalizedUrl.endsWith(EXTERNAL_SERVICES.airflow.dagsPath)
    ? normalizedUrl
    : `${normalizedUrl}${EXTERNAL_SERVICES.airflow.dagsPath}`
  const dagId = runId.startsWith('dag_') ? runId : `dag_${runId}`

  return `${dagsUrl}/${encodeURIComponent(dagId)}`
}
