import accessLogs from './accessLogs.mjs'
import flashSystemVolumes from './flashSystemVolumes.mjs'
import omitPubkey from './omitPubkey.mjs'
import powerInventory from './powerInventory.mjs'
import recoveryVmMetadata from './recoveryVmMetadata.mjs'
import rollbackReport from './rollbackReport.mjs'
import vdisksByVm from './vdisksByVm.mjs'

export const PATCHES = [omitPubkey, accessLogs, powerInventory, flashSystemVolumes, vdisksByVm, rollbackReport, recoveryVmMetadata]

export default function applySpecPatches(spec) {
  const copy = structuredClone(spec)
  return PATCHES.reduce((current, patch) => patch.run(current), copy)
}
