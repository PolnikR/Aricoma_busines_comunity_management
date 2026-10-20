import type { RollbackReport } from '../model/recoveryApplicationTypes'

export function isRollbackClean(report: RollbackReport): boolean {
  const sectionOk = (section: { status?: string; errors?: unknown[] } | null | undefined) =>
    !section || (section.status === undefined || section.status === 'ok') && (section.errors?.length ?? 0) === 0
  return report.status === 'ok'
    && sectionOk(report.airflow)
    && sectionOk(report.ibm)
    && sectionOk(report.compute)
    && sectionOk(report.vcenter)
}
