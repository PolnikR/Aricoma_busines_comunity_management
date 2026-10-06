// Representative detail objects taken from the current drawer consumers (values seen in the
// running app and in the feature test fixtures). Every concept renders the same domain-neutral
// model, so the comparison is about presentation only.
//
// Model:
//   entity, icon, title, techId, statuses[{label,tone}], meta[string]
//   facts[{label,value,hint}]                       -> primary facts
//   sections[{id,title,accent,icon,summary,open,count,
//             groups[{title,technical,rows[]}]       -> property rows
//             op{...}                              -> operational block
//             table{columns[],rows[]}               -> table-like content
//             code}]                                -> raw payload
//   groups[]                                        -> drawer without sections
//   actions{start[],end[]}
// Row: {label, value, long, mono, copy, secondary, badge(tone), link, external, tags[], wide}
// `inFacts` rows are already shown in the primary facts strip; the redesign concepts skip them,
// the Current reference still lists them like today.
// `long` is the stress-test variant used by the "Long values" toggle.

window.DETAIL_OBJECTS = {
  recoveryGroup: {
    menu: 'Recovery groups',
    entity: 'Recovery group',
    icon: 'layers',
    title: 'db_and_app',
    longTitle: 'db_and_app_production_tier2_critical_brno_primary_datacenter_group',
    techId: 'db_and_app',
    longTechId: 'rg_db_and_app_production_tier2_critical_brno_primary_datacenter_7f3a9c2e41d0',
    statuses: [
      { label: 'Active', tone: 'success' },
      { label: 'Last run: success', tone: 'success' },
    ],
    meta: ['Orchestrated by Primary Airflow'],
    facts: [
      { label: 'Policy set', value: 'test_1_hour_ps', hint: 'Snapshot every 1 h' },
      { label: 'Workload', value: 'VMware VMs', hint: 'Compute workloads' },
      { label: 'Resources', value: '4', hint: 'virtual machines' },
      { label: 'Last run', value: '10 s', hint: 'success · 6 Oct, 09:30' },
    ],
    sections: [
      {
        id: 'overview', title: 'Overview', accent: 'overview', icon: 'grid', summary: 'VMware virtual machines', open: true,
        groups: [
          {
            rows: [
              { label: 'Description', value: 'db_and_app', long: 'Primary database and application tier for the Brno production cluster, including the reporting replicas that must always recover together with the main database.', wide: true },
              { inFacts: true, label: 'Policy set', value: 'test_1_hour_ps', link: true },
              { label: 'Source category', value: 'Compute workloads' },
              { inFacts: true, label: 'Workload type', value: 'VMware virtual machines' },
              { label: 'Resource type', value: 'VM' },
              { inFacts: true, label: 'Resources', value: '4 VMs' },
            ],
          },
          {
            title: 'Technical', technical: true,
            rows: [
              { label: 'Group ID', value: 'db_and_app', long: 'rg_db_and_app_production_tier2_critical_brno_primary_datacenter_7f3a9c2e41d0', mono: true, copy: true },
              { label: 'Provider ID', value: 'vmware-vcenter-03', mono: true, copy: true, secondary: 'vCenter Brno 03' },
              { label: 'Volume provider', value: 'ibm-flashsystem-01', mono: true, copy: true },
            ],
          },
        ],
      },
      {
        id: 'orchestration', title: 'Orchestration', accent: 'configuration', icon: 'play', summary: 'Primary Airflow',
        op: {
          label: 'Latest run', status: 'success', tone: 'success',
          when: '6 Oct 2026, 09:30', duration: '10 s', provider: 'Primary Airflow',
          runId: 'dag_261005153937_b099da7e', longRunId: 'dag_261005153937_b099da7e_db_and_app_production_tier2_critical_brno',
          action: 'View recovery runs',
        },
      },
      {
        id: 'inventory', title: 'Inventory', accent: 'infrastructure', icon: 'server', summary: 'VMs: 4', count: 4,
        table: {
          columns: [
            { key: 'vm', label: 'VM' },
            { key: 'volume', label: 'Volume' },
            { key: 'uid', label: 'Volume UID', mono: true, wideOnly: true },
            { key: 'state', label: 'State', badge: true },
          ],
          rows: [
            { vm: 'TEST-WEB01', volume: 'V5000_VOLUME01', uid: '600507681081026A1800000000000A1B', state: ['Found', 'success'] },
            { vm: 'TEST-WEB02', volume: 'V5000_VOLUME02', uid: '600507681081026A1800000000000A1C', state: ['Found', 'success'] },
            { vm: 'DB-01', volume: 'V5000_DB_DATA01', uid: '600507681081026A1800000000000B07', state: ['Found', 'success'] },
            { vm: 'DB-02-REPORTING-REPLICA-BRNO', volume: 'V5000_DB_LOG01', uid: '600507681081026A1800000000000B08', state: ['Missing', 'warning'] },
          ],
        },
      },
    ],
    actions: { start: [{ label: 'Delete', variant: 'danger' }], end: [{ label: 'Edit', variant: 'primary' }] },
    siblings: ['web_tier_group', 'flash_volumes_brno', 'power_lpar_group'],
  },

  vmwareVm: {
    menu: 'Virtual machines',
    entity: 'Virtual machine',
    icon: 'server',
    title: 'TEST-WEB01',
    longTitle: 'TEST-WEB01-PRODUCTION-FRONTEND-BRNO-DATACENTER-CLUSTER-A',
    techId: 'vm-1043',
    longTechId: '502c1f3a-8b7e-4c6d-9a51-2f0e7d3c9b14',
    statuses: [
      { label: 'Powered on', tone: 'success' },
      { label: 'Connected', tone: 'success' },
      { label: 'Tools not running', tone: 'warning' },
    ],
    meta: ['VMWARE-vmware-vcenter-01'],
    facts: [
      { label: 'vCPU', value: '2' },
      { label: 'Memory', value: '4 GB' },
      { label: 'Disks', value: '1', hint: '150 GB' },
      { label: 'Guest OS', value: 'Windows 2022', hint: 'Server, 64-bit' },
    ],
    sections: [
      {
        id: 'overview', title: 'Overview', accent: 'overview', icon: 'grid', open: true,
        groups: [
          {
            rows: [
              { label: 'Tags', tags: ['WEB', 'ABC Orchestrator'], wide: true },
              { inFacts: true, label: 'Operating system', value: 'Microsoft Windows Server 2022 (64-bit)' },
              { label: 'Cluster', value: 'ACMTHCICLUSTER', secondary: 'acmthciesx03.dcmartin.local' },
              { label: 'Datastore', value: 'V5000_VOLUME01', secondary: '1 disk / 150 GB' },
              { label: 'Folder', value: 'Datacenters/vm/Cievo/ABC Projekt/_TEST masiny', long: 'Datacenters/vm/Cievo/ABC Projekt/_TEST masiny/Frontend/Production/Brno/Cluster-A/Very/Deep/Folder/Structure', wide: true },
            ],
          },
          {
            title: 'Technical', technical: true,
            rows: [
              { label: 'VM path', value: '[V5000_VOLUME01] TEST-WEB01/TEST-WEB01.vmx', mono: true, copy: true },
              { label: 'MoRef', value: 'vm-1043', mono: true, copy: true },
              { label: 'Instance UUID', value: '502c1f3a-8b7e-4c6d-9a51-2f0e7d3c9b14', mono: true, copy: true },
              { label: 'Hostname / IP', value: '—' },
            ],
          },
        ],
      },
      {
        id: 'disks', title: 'Disks', accent: 'storage', icon: 'disk', summary: 'Disks: 1', count: 1,
        table: {
          columns: [
            { key: 'name', label: 'Disk' },
            { key: 'size', label: 'Size', align: 'right' },
            { key: 'datastore', label: 'Datastore', wideOnly: true },
            { key: 'naa', label: 'NAA', mono: true },
          ],
          rows: [
            { name: 'Hard disk 1', size: '150 GB', datastore: 'V5000_VOLUME01', naa: 'naa.6005076810810261f800000000000a1b' },
          ],
        },
      },
      {
        id: 'backing', title: 'Backing storage', accent: 'storage', icon: 'layers', summary: 'V5000_VOLUME01',
        groups: [
          {
            title: 'V5000_VOLUME01',
            rows: [
              { label: 'Provider', value: 'IBM FlashSystem 5000', secondary: 'ibm-flashsystem-01' },
              { label: 'Pool', value: 'Pool0' },
              { label: 'Capacity', value: '150 GB', secondary: '42 % used' },
              { label: 'Replication', value: 'Metro Mirror', badge: 'info' },
            ],
          },
          {
            title: 'Technical', technical: true,
            rows: [
              { label: 'Volume ID', value: '27', mono: true },
              { label: 'vdisk UID', value: '600507681081026A1800000000000A1B', mono: true, copy: true },
            ],
          },
        ],
      },
    ],
    siblings: ['TEST-WEB02', 'DB-01', 'DB-02'],
  },

  ibmPower: {
    menu: 'IBM Power partitions',
    entity: 'Partition',
    icon: 'cpu',
    title: 'aix2source',
    longTitle: 'aix2source-production-erp-database-partition-brno',
    techId: '774DD94-645F-458F-B271-1E64307800EC',
    longTechId: '774DD94-645F-458F-B271-1E64307800EC-IIC-Server-8286-42A-SN21486AV',
    statuses: [
      { label: 'Running', tone: 'success' },
      { label: 'LPAR', tone: 'light' },
    ],
    meta: ['IIC-Server-8286-42A-SN21486AV'],
    facts: [
      { label: 'Processors', value: '4', hint: 'shared · uncapped' },
      { label: 'Memory', value: '4 GB', hint: '4096 / 4096 MB' },
      { label: 'OS', value: 'AIX 7.3', hint: '7300-03-02-2546' },
      { label: 'Uptime', value: '21 d 23 h' },
    ],
    sections: [
      {
        id: 'summary', title: 'Summary', accent: 'overview', icon: 'grid', open: true,
        groups: [
          {
            rows: [
              { inFacts: true, label: 'Operating system', value: 'AIX 7.3 7300-03-02-2546' },
              { label: 'Managed system', value: 'IIC-Server-8286-42A-SN21486AV' },
              { label: 'Last activated profile', value: 'default_profile' },
              { label: 'Bootable', value: 'Yes' },
              { inFacts: true, label: 'Uptime', value: '1 898 064 s', secondary: '21 d 23 h' },
            ],
          },
          {
            title: 'Technical', technical: true,
            rows: [
              { label: 'Partition ID', value: '4', mono: true },
              { label: 'Partition UUID', value: '774DD94-645F-458F-B271-1E64307800EC', mono: true, copy: true },
              { label: 'Logical serial number', value: '21486AV4', mono: true, copy: true },
            ],
          },
        ],
      },
      {
        id: 'processor', title: 'Processor and memory', accent: 'infrastructure', icon: 'cpu', summary: '4 CPU · 4 GB', open: true,
        groups: [{
          rows: [
            { label: 'Processors (current / desired)', value: '4 / 4' },
            { label: 'Processor mode', value: 'Shared · uncapped' },
            { label: 'Memory (current / desired)', value: '4096 / 4096 MB' },
            { label: 'Memory limits (min – max)', value: '1024 – 4096 MB' },
          ],
        }],
      },
      {
        id: 'network', title: 'Network and monitoring', accent: 'infrastructure', icon: 'network', summary: 'RMC active',
        groups: [{
          rows: [
            { label: 'Monitoring', value: 'Active', badge: 'success' },
            { label: 'RMC IP address', value: '10.99.98.101', mono: true, copy: true },
          ],
        }],
      },
      {
        id: 'storage', title: 'Storage', accent: 'storage', icon: 'disk', summary: 'Volumes: 3', count: 3,
        table: {
          columns: [
            { key: 'volume', label: 'Volume' },
            { key: 'size', label: 'Size', align: 'right' },
            { key: 'vios', label: 'VIOS', wideOnly: true },
            { key: 'wwpn', label: 'WWPN', mono: true },
          ],
          rows: [
            { volume: 'hdisk0', size: '100 GB', vios: 'vios1', wwpn: 'c05076082d1a0012' },
            { volume: 'hdisk1', size: '250 GB', vios: 'vios1', wwpn: 'c05076082d1a0014' },
            { volume: 'hdisk2-erp-archive-volume', size: '1.5 TB', vios: 'vios2', wwpn: 'c05076082d1a0016' },
          ],
        },
      },
      {
        id: 'io', title: 'I/O and virtualization', accent: 'infrastructure', icon: 'server', summary: '16 slots',
        groups: [{
          rows: [
            { label: 'Maximum virtual I/O slots', value: '16' },
            { label: 'Physical I/O', value: 'No' },
          ],
        }],
      },
    ],
    siblings: ['AIX1_source', 'vios1', 'vios2'],
  },

  accessLog: {
    menu: 'Access logs',
    entity: 'Access log',
    icon: 'code',
    title: 'GET /get_volumes',
    longTitle: 'GET /recovery-plans/recovery-groups/db_and_app_production_tier2_critical_brno/inventory/volumes',
    techId: '05.10.2026 14:46:08 · test',
    longTechId: '05.10.2026 14:46:08.482 · test · req-7f3a9c2e-41d0-4b8e-9a51-2f0e7d3c9b14',
    statuses: [{ label: '502 Bad Gateway', tone: 'error' }],
    meta: ['3284.8 ms'],
    facts: [
      { label: 'Status', value: '502', hint: 'Bad Gateway' },
      { label: 'Duration', value: '3.28 s', hint: '3284.8 ms' },
      { label: 'User', value: 'test' },
      { label: 'Method', value: 'GET' },
    ],
    sections: [
      {
        id: 'request', title: 'Request', accent: 'overview', icon: 'grid', summary: 'GET · 502', open: true,
        groups: [
          {
            rows: [
              { inFacts: true, label: 'Method', value: 'GET', mono: true },
              { label: 'Path', value: '/get_volumes', long: '/recovery-plans/recovery-groups/db_and_app_production_tier2_critical_brno/inventory/volumes', mono: true, copy: true },
              { label: 'Query string', value: 'provider_id=ibm-flashsystem-01', long: 'provider_id=ibm-flashsystem-01&include_mappings=true&include_relationships=true&page_size=500&cursor=eyJvZmZzZXQiOjUwMCwic29ydCI6Im5hbWUifQ', mono: true, copy: true, wide: true },
              { inFacts: true, label: 'Status', value: '502', badge: 'error' },
              { inFacts: true, label: 'Duration', value: '3284.8 ms' },
            ],
          },
          {
            title: 'Client', technical: true,
            rows: [
              { label: 'User agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0', mono: true, wide: true },
              { label: 'Referer', value: 'http://10.99.99.53:8080/recovery-plans/recovery-groups/db_app_group/edit', mono: true, link: true, wide: true },
            ],
          },
        ],
      },
      { id: 'reqbody', title: 'Request body', accent: 'technical', icon: 'code', summary: 'Empty', code: '' },
      {
        id: 'resbody', title: 'Response body', accent: 'technical', icon: 'code', summary: 'JSON · 214 B',
        code: '{\n  "detail": "Bad gateway: FlashSystem REST API did not answer within 3000 ms",\n  "provider_id": "ibm-flashsystem-01",\n  "endpoint": "https://10.99.99.61:7443/rest/v1/lsvdisk",\n  "retryable": true\n}',
      },
    ],
    siblings: ['GET /get_volumes', 'GET /vdisks_by_vm', 'POST /vms/search'],
  },

  platformProvider: {
    menu: 'Platform providers',
    entity: 'Platform provider',
    icon: 'network',
    title: 'Primary Airflow',
    longTitle: 'Primary Airflow orchestrator for application recovery in the Brno datacenter',
    techId: 'airflow-01',
    longTechId: 'airflow-primary-orchestrator-brno-datacenter-01-7f3a9c2e',
    statuses: [
      { label: 'AIRFLOW', tone: 'info' },
      { label: 'Credential available', tone: 'success' },
    ],
    meta: [],
    facts: [
      { label: 'Type', value: 'Airflow' },
      { label: 'Endpoint', value: '10.99.99.55:22' },
      { label: 'Credential', value: 'airflow-ssh', hint: 'available' },
    ],
    groups: [
      {
        rows: [
          { label: 'Description', value: 'Application recovery DAG orchestration.', long: 'Application recovery DAG orchestration for all production recovery groups. Runs the clean-room validation and the final cut-over DAGs; notifications go to the platform team.', wide: true },
          { label: 'URL', value: 'http://10.99.99.55:8080/', long: 'http://airflow-primary-orchestrator.brno.datacenter.internal.example.com:8080/home?status=active', link: true, external: true, mono: true },
          { label: 'Notification email', value: 'platform-team@example.com' },
        ],
      },
      {
        title: 'Connection',
        rows: [
          { label: 'IP address', value: '10.99.99.55', mono: true, copy: true },
          { label: 'Port', value: '22', mono: true },
          { label: 'DAG directory', value: '/home/airflow/dags', long: '/opt/airflow/deployments/production/brno/recovery/dags/application-recovery', mono: true, copy: true },
          { label: 'Credential', value: 'airflow-ssh', mono: true, secondary: 'Available' },
        ],
      },
      {
        title: 'Technical', technical: true,
        rows: [{ label: 'Provider ID', value: 'airflow-01', long: 'airflow-primary-orchestrator-brno-datacenter-01-7f3a9c2e', mono: true, copy: true }],
      },
    ],
    actions: { start: [{ label: 'Delete', variant: 'danger' }], end: [{ label: 'Edit', variant: 'primary' }] },
    siblings: ['Test SMTP', 'ABCo API', 'Aricoma Keycloak'],
  },
}
