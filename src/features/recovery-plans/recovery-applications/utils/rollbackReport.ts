import type { RollbackReport } from '../model/recoveryApplicationTypes'

export function isRollbackClean(report: RollbackReport): boolean {
  const sectionOk = (section: { status: string } | null | undefined) => !section || section.status === 'ok'
  return report.status === 'ok'
    && sectionOk(report.airflow)
    && sectionOk(report.ibm)
    && (report.ibm?.errors?.length ?? 0) === 0
}
