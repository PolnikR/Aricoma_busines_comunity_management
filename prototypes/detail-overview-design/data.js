// Mock datasets. Every template receives the same flat field list; no template knows the entity.
// Field model: label, value, secondary, emphasis, mono, href + external (link), link (in-app),
// copy (copy action), badge (status tone), wide (consumer hint: a node value needs a full row,
// as the real consumers mark URLs today), tags (value is a list of pills), group (block title
// for the grouped/flat comparison). `long` replaces values when "Long values" is on.

const DATASETS = {
  platform: {
    name: 'Platform provider · 4',
    entity: 'Platform provider',
    title: 'Airflow – Production',
    statuses: [['success', 'Active']],
    sections: ['Overview', 'Connection', 'Technical'],
    fields: [
      { label: 'Type', value: 'AIRFLOW', emphasis: true },
      { label: 'Description', value: 'Primary orchestration engine for recovery workflows.' },
      { label: 'URL', value: 'https://airflow.abco.aricoma.cz', href: 'https://airflow.abco.aricoma.cz', external: true, wide: true },
      { label: 'Notification email', value: 'ops-recovery@aricoma.com' },
    ],
    long: {
      Description: 'Primary orchestration engine for recovery workflows across both Prague data centres. Runs failover, failback and clean-room validation DAGs and reports run state back to ABCO every 30 seconds.',
      URL: 'https://airflow-prod-01.recovery.dc-prague-south.abco.aricoma.cz:8443/home?status=active&tags=recovery',
      'Notification email': 'abco-recovery-operations-escalation@aricoma-infrastructure-services.com',
    },
  },

  user: {
    name: 'User · 6',
    entity: 'User',
    title: 'Jana Kováčová',
    statuses: [['success', 'Enabled']],
    sections: ['Overview', 'Roles', 'Technical'],
    fields: [
      { label: 'User', value: 'Jana Kováčová', emphasis: true },
      { label: 'Username', value: 'jkovacova', mono: true, copy: true },
      { label: 'Email', value: 'jana.kovacova@aricoma.com' },
      { label: 'Email verified', value: 'Yes', badge: 'success' },
      { label: 'Created at', value: '14 Mar 2025, 09:12' },
      { label: 'Active session start', value: null },
    ],
    long: {
      User: 'Jana Alžbeta Kováčová-Hrubovská',
      Username: 'jana.alzbeta.kovacova-hrubovska.ext',
      Email: 'jana.alzbeta.kovacova-hrubovska@external.partner.aricoma.com',
    },
  },

  provider: {
    name: 'Infrastructure provider · 8',
    entity: 'Provider',
    title: 'FlashSystem 7300 – DC Prague',
    statuses: [['success', 'Connected']],
    sections: ['Overview', 'Connection', 'Relationships', 'Technical'],
    fields: [
      { label: 'Type', value: 'IBM Spectrum Virtualize', emphasis: true },
      { label: 'Notification email', value: 'storage-alerts@aricoma.com' },
      { label: 'Description', value: 'Primary site storage for tier-1 workloads.' },
      { label: 'URL', value: 'https://10.20.4.11:7443', href: 'https://10.20.4.11:7443', external: true, mono: true, wide: true },
      { label: 'IP address', value: '10.20.4.11', mono: true, copy: true },
      { label: 'Credential', value: 'svc-abco-storage', link: true, secondary: 'Username and password' },
      { label: 'Role', value: 'Primary', badge: 'info' },
      { label: 'Connection state', value: 'Connected', badge: 'success', secondary: 'Checked 2 min ago' },
    ],
    long: {
      Type: 'IBM Spectrum Virtualize (FlashSystem / SAN Volume Controller)',
      Description: 'FlashSystem 7300 in DC Prague South, primary site storage for tier-1 workloads. Metro Mirror partner of FS7300-PRG-NORTH; FlashCopy targets live in pool CR_POOL_02.',
      URL: 'https://fs7300-prg-south-mgmt.storage.dc-prague-south.abco.aricoma.cz:7443/gui#dashboard',
      Credential: 'svc-abco-storage-flashsystem-prg-south-readonly',
    },
  },

  // Mirrors VirtualMachineDetailPanel's Overview: Compute / Guest / Placement, same fields,
  // same order, the folder as plain text and the tags as a node marked wide.
  vm: {
    name: 'VM multi-group · 9',
    entity: 'Virtual machine',
    title: 'SAP-PRD-APP-01',
    statuses: [['success', 'Powered on']],
    sections: ['Overview', 'Disks', 'Network', 'Relationships', 'Technical'],
    fields: [
      { group: 'Compute', label: 'vCPU', value: '8', emphasis: true },
      { group: 'Compute', label: 'Memory', value: '32 GB', emphasis: true },
      { group: 'Guest', label: 'Operating system', value: 'Red Hat Enterprise Linux 9 (64-bit)' },
      { group: 'Guest', label: 'Hostname', value: 'sap-prd-app-01.abco.local' },
      { group: 'Guest', label: 'IP address', value: '10.20.31.14', mono: true },
      { group: 'Placement', label: 'Cluster', value: 'PRG-SOUTH-CL01', secondary: 'esx-prg-07.abco.local' },
      { group: 'Placement', label: 'Datastore', value: 'DS-SAP-PRD-01', secondary: '3 disks / 420 GB' },
      { group: 'Placement', label: 'Folder', value: '/Datacenters/PRG-South/vm/SAP/Production' },
      { group: 'Placement', label: 'Tags', value: ['sap', 'production', 'tier-1'], tags: true, wide: true },
    ],
    long: {
      'Operating system': 'Microsoft Windows Server 2022 Datacenter Edition (64-bit)',
      Hostname: 'sap-s4hana-prd-application-server-01.prg-south.abco.aricoma.local',
      Cluster: 'PRG-SOUTH-PRODUCTION-CLUSTER-01-VSAN-STRETCHED',
      Datastore: 'VSAN-PRG-SOUTH-PRODUCTION-SAP-TIER1-DATASTORE-01',
      Folder: '/Datacenters/PRG-South/vm/SAP/S4HANA/Production/Application-Servers/Tier-1/Primary-Site',
      Tags: ['sap', 's4hana', 'production', 'tier-1', 'metro-mirror', 'backup-gold', 'pci-scope', 'owner-sap-basis', 'prg-south'],
    },
  },

  stress: {
    name: 'Stress test · 18',
    entity: 'Recovery group',
    title: 'Tier-1 SAP production',
    statuses: [['warning', 'Degraded'], ['info', 'Orchestrated']],
    sections: ['Overview', 'Orchestration', 'Inventory', 'History', 'Technical'],
    fields: [
      { label: 'Name', value: 'Tier-1 SAP production', emphasis: true },
      { label: 'Status', value: 'Degraded', badge: 'warning', secondary: 'Since 06 Oct 2026, 07:41' },
      { label: 'Description', value: 'Application and database servers of the SAP S/4HANA production landscape. Recovered together in one consistency group; the database tier must be up before the application tier is powered on. Owned by the SAP Basis team, reviewed quarterly.' },
      { label: 'Provider', value: 'VMware vCenter – DC Prague', link: true, secondary: 'vcenter-prg-01' },
      { label: 'Policy set', value: 'Gold – 15 min RPO' },
      { label: 'Group ID', value: '5f1c2a8e-3b9d-4e7a-9c61-0d2f8a7b4e13', mono: true, copy: true },
      { label: 'Orchestrator run ID', value: 'manual__2026-10-06T07:41:12.884512+00:00', mono: true, copy: true },
      { label: 'Datastore path', value: '/vmfs/volumes/5f1c2a8e-3b9d4e7a/SAP-PRD-APP-01/SAP-PRD-APP-01.vmx', mono: true, copy: true },
      { label: 'Console', value: 'https://vcenter-prg-01.abco.aricoma.cz/ui', href: 'https://vcenter-prg-01.abco.aricoma.cz/ui', external: true, wide: true },
      { label: 'Owner', value: null },
      { label: 'Contact email', value: 'sap-basis@aricoma.com' },
      { label: 'Resources', value: '42' },
      { label: 'Last successful run', value: '05 Oct 2026, 23:10', secondary: 'Took 18 min' },
      { label: 'Last failure', value: 'Failed', badge: 'error', secondary: 'Snapshot quota exceeded on CR_POOL_02' },
      { label: 'Tags', value: '' },
      { label: 'RPO target', value: '15 min' },
      { label: 'Created by', value: 'system', mono: true },
      { label: 'Updated at', value: '06 Oct 2026, 08:02' },
    ],
    long: {
      Name: 'Tier-1 SAP S/4HANA production – application and database servers (DC Prague South)',
      Provider: 'VMware vCenter Server Appliance – DC Prague South – management cluster',
      'Policy set': 'Gold – 15 min RPO, 4 h RTO, immutable snapshots, clean-room validation',
      'Contact email': 'sap-basis-operations-escalation@aricoma-infrastructure-services.com',
    },
  },

  // Values just below, at and above both footprint thresholds (THRESHOLDS in templates.js,
  // ?nmax=&wmax=), across the value kinds Overviews show. Built at render time so the
  // boundaries follow the thresholds in the URL.
  probe: {
    name: 'Threshold probe · 18',
    entity: 'Footprint probe',
    title: 'Threshold probe',
    statuses: [['info', 'Prototype']],
    sections: ['Overview', 'Technical'],
    get fields() {
      const n = THRESHOLDS.normal
      const w = THRESHOLDS.wide
      const prose = 'Primary site storage for tier-1 workloads in DC Prague South '
      const path = '/vmfs/volumes/5f1c2a8e-3b9d4e7a/SAP-PRD-APP-01/disks/'
      const email = len => `${sized('sap-basis-operations-escalation-team', len - 12)}@aricoma.com`
      return [
        { label: `Description · ${n - 1}`, value: sized(prose, n - 1) },
        { label: `Description · ${n}`, value: sized(prose, n) },
        { label: `Description · ${n + 1}`, value: sized(prose, n + 1) },
        { label: `Email · ${n}`, value: email(n) },
        { label: `Email · ${n + 1}`, value: email(n + 1) },
        { label: 'Group ID · 36', value: '5f1c2a8e-3b9d-4e7a-9c61-0d2f8a7b4e13', mono: true, copy: true },
        { label: `Description · ${w - 1}`, value: sized(prose, w - 1) },
        { label: `Description · ${w}`, value: sized(prose, w) },
        { label: `Description · ${w + 1}`, value: sized(prose, w + 1) },
        { label: `Path · ${w - 1}`, value: sized(path, w - 1), mono: true, copy: true },
        { label: `Path · ${w + 1}`, value: sized(path, w + 1), mono: true, copy: true },
        { label: 'URL (link, no wide)', value: 'https://fs7300-prg-south-mgmt.storage.abco.aricoma.cz:7443/gui', href: '#', external: true },
        { label: 'URL (link, wide)', value: 'https://fs7300-prg-south-mgmt.storage.abco.aricoma.cz:7443/gui', href: '#', external: true, wide: true },
        { label: 'OS', value: sized('Microsoft Windows Server 2022 Datacenter Edition (64-bit) ', w - 1) },
        { label: 'Last successful replication consistency check', value: '15 min' },
        { label: 'Connection state', value: 'Connected', badge: 'success', secondary: 'Checked 2 min ago' },
        { label: 'Owner', value: null },
        { label: `Cluster · ${n + 1}`, value: sized('PRG-SOUTH-PRODUCTION-CLUSTER-01-', n + 1), secondary: 'esx-prg-07.abco.local' },
      ]
    },
    long: {},
  },
}

// Realistic text cut to exactly `length` characters, never ending in a space.
function sized(text, length) {
  const cut = text.repeat(Math.ceil(length / text.length) + 1).slice(0, length)
  return cut.endsWith(' ') ? `${cut.slice(0, -1)}.` : cut
}
