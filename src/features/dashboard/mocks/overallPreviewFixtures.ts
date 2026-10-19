import type { OverallPreviewData } from '../model/overallPreviewMetrics'

// Design-only inventory, matching prototypes/dashboard-modern/overview-agreed.html.
// Do not interpret fixture availability or orchestration flags as verified backend health.
export const overallPreviewFixture: OverallPreviewData = {
  vendors: [
    { id: 'ibm', name: 'IBM FlashSystem', protectedVolumes: 820, unprotectedVolumes: 40 },
    { id: 'hitachi', name: 'Hitachi VSP', protectedVolumes: 460, unprotectedVolumes: 40 },
  ],
  providers: [
    { id: 'vmware', name: 'VMware', kind: 'COMPUTE PLATFORM', symbol: 'VM', total: 6, available: 6 },
    { id: 'power', name: 'IBM Power', kind: 'COMPUTE PLATFORM', symbol: 'P', total: 3, available: 2 },
    { id: 'flash', name: 'IBM FlashSystem', kind: 'STORAGE SYSTEM', symbol: 'FS', total: 2, available: 2 },
    { id: 'hitachi', name: 'Hitachi VSP', kind: 'STORAGE SYSTEM', symbol: 'HV', total: 2, available: 1 },
  ],
  groups: { local: 16, remote: 8 },
  applications: { vmware: 23, power: 11 },
  deployment: {
    vmware: { pushed: 18, total: 23 },
    power: { pushed: 8, total: 11 },
    production: { pushed: 20, total: 25 },
    test: { pushed: 6, total: 9 },
  },
}
