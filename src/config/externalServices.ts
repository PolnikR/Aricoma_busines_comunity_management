const AIRFLOW_BASE_URL = 'http://10.99.99.55:8080'
const AIRFLOW_DAGS_PATH = '/dags'

export const EXTERNAL_SERVICES = {
  openApi: {
    sourceUrl: 'http://10.99.99.54:8000/openapi.json',
  },
  airflow: {
    defaultBaseUrl: AIRFLOW_BASE_URL,
    dagsPath: AIRFLOW_DAGS_PATH,
    dagsUrl: `${AIRFLOW_BASE_URL}${AIRFLOW_DAGS_PATH}`,
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
