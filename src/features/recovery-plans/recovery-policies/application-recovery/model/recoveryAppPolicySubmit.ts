import type { RecoveryAppPolicy } from '@/generated/query/zod'
import type { RecoveryAppPolicyFormData } from '../components/RecoveryAppPolicyForm'
import type { RecoveryAppPolicySelectionMode, RecoveryAppPolicyTimeUnit } from './recoveryAppPolicyTypes'

// Sends only the fields that belong to the selected snapshot mode. Mode-specific
// required fields and the HH:MM target time are validated by the policy form.
// The IBM Power fields are always sent: they have backend defaults, so leaving
// them out of an edit would reset the stored values.
export function toRecoveryAppPolicySubmitPayload(form: RecoveryAppPolicyFormData): RecoveryAppPolicy {
  const common = {
    id: form.id.trim(),
    name: form.name.trim(),
    description: form.description.trim(),
    level: form.level.trim(),
    frequency_value: Number(form.frequency_value),
    frequency_unit: form.frequency_unit as RecoveryAppPolicyTimeUnit,
    retention_value: Number(form.retention_value),
    retention_unit: form.retention_unit as RecoveryAppPolicyTimeUnit,
    boot_verify: form.boot_verify,
    snapshot_selection_mode: form.snapshot_selection_mode as RecoveryAppPolicySelectionMode,
    enabled: form.enabled,
    target_lpar_prefix: form.target_lpar_prefix.trim(),
    manual_zoning: form.manual_zoning,
    source_shutdown_timeout_seconds: Number(form.source_shutdown_timeout_seconds),
    zoning_wait_minutes: Number(form.zoning_wait_minutes),
  }

  switch (form.snapshot_selection_mode as RecoveryAppPolicySelectionMode) {
    case 'time_range':
      return {
        ...common,
        snapshot_max_age_value: Number(form.snapshot_max_age_value),
        snapshot_max_age_unit: form.snapshot_max_age_unit as RecoveryAppPolicyTimeUnit,
      }
    case 'exact_time':
      return { ...common, snapshot_target_time: form.snapshot_target_time }
    default:
      return common
  }
}
