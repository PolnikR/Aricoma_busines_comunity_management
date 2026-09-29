import accessLogs from './accessLogs.mjs'
import omitPubkey from './omitPubkey.mjs'

export const PATCHES = [omitPubkey, accessLogs]

export default function applySpecPatches(spec) {
  const copy = structuredClone(spec)
  return PATCHES.reduce((current, patch) => patch.run(current), copy)
}
