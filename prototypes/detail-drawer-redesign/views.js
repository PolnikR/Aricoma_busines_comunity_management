/* global DETAIL_OBJECTS */
// Variant D content, written in the vocabulary of the future shared detail primitives.
// Each section is a list of blocks; each block maps to one shared primitive:
//
//   { type: 'fields', title, description, fields }      -> DetailFieldGroup + DetailField
//   { type: 'technical', title, fields }                -> DetailFieldGroup variant="technical"
//   { type: 'status', title, status, when, facts,       -> DetailStatusBlock
//     reference, action }
//   { type: 'table', table }                            -> DetailTable
//   { type: 'code', label, meta, code, empty }          -> DetailCode
//
// Field: { label, value, long, strong, mono, copy, link: 'internal' | 'external', secondary,
//          badge (tone), tags[], secret, wide, empty }
// Feature code only decides WHICH blocks and fields to show; it never adds its own layout.
// Statuses already shown in the header badges are not repeated as fields.

;(function () {
  const O = DETAIL_OBJECTS
  const tableOf = (object, id) => O[object].sections.find((s) => s.id === id).table

  window.DETAIL_VIEWS = {
    recoveryGroup: {
      sections: [
        {
          id: 'overview', title: 'Overview', icon: 'grid',
          description: 'Configuration and workload of the recovery group.',
          blocks: [
            {
              type: 'fields', title: 'General',
              fields: [
                { label: 'Description', value: 'db_and_app', long: 'Primary database and application tier for the Brno production cluster, including the reporting replicas that must always recover together with the main database.', wide: true },
                { label: 'Policy set', value: 'test_1_hour_ps', strong: true, link: 'internal', secondary: 'Snapshot every 1 h' },
              ],
            },
            {
              type: 'fields', title: 'Workload',
              fields: [
                { label: 'Source category', value: 'Compute workloads' },
                { label: 'Workload type', value: 'VMware virtual machines' },
                { label: 'Resource type', value: 'VM' },
                { label: 'Resources', value: '4 VMs', strong: true, link: 'internal', jump: 'inventory' },
                { label: 'Resource provider', value: 'vCenter Brno 03', secondary: 'vmware-vcenter-03', link: 'internal' },
              ],
            },
          ],
        },
        {
          id: 'orchestration', title: 'Orchestration', icon: 'play',
          description: 'Orchestrator push and the latest DAG run.',
          blocks: [
            {
              type: 'status', title: 'Latest run',
              status: { label: 'success', tone: 'success' }, when: '6 Oct 2026, 09:30',
              facts: [
                { label: 'Duration', value: '10 s' },
                { label: 'Orchestrator', value: 'Primary Airflow' },
              ],
              reference: { label: 'Airflow run ID', value: 'dag_261005153937_b099da7e', long: 'dag_261005153937_b099da7e_db_and_app_production_tier2_critical_brno' },
              action: 'View recovery runs',
            },
          ],
        },
        {
          id: 'inventory', title: 'Inventory', icon: 'server', count: 4,
          description: 'Resources resolved from the latest orchestrated run.',
          aside: { label: '1 missing', tone: 'warning' },
          blocks: [{ type: 'table', table: tableOf('recoveryGroup', 'inventory') }],
        },
        {
          id: 'technical', title: 'Technical', icon: 'code', technical: true,
          description: 'Identifiers for support and integrations.',
          blocks: [
            { type: 'technical', title: 'Recovery group', fields: [{ label: 'Group ID', value: 'db_and_app', long: 'rg_db_and_app_production_tier2_critical_brno_primary_datacenter_7f3a9c2e41d0', copy: true }] },
            {
              type: 'technical', title: 'Providers',
              fields: [
                { label: 'Resource provider ID', value: 'vmware-vcenter-03', copy: true },
                { label: 'Volume provider ID', value: 'ibm-flashsystem-01', copy: true },
                { label: 'Orchestrator ID', value: 'airflow-01', copy: true },
              ],
            },
            { type: 'technical', title: 'Orchestration', fields: [{ label: 'Airflow run ID', value: 'dag_261005153937_b099da7e', long: 'dag_261005153937_b099da7e_db_and_app_production_tier2_critical_brno', copy: true, link: 'external' }] },
          ],
        },
      ],
    },

    vmwareVm: {
      sections: [
        {
          id: 'overview', title: 'Overview', icon: 'grid',
          description: 'Compute, guest and placement of the virtual machine.',
          blocks: [
            {
              type: 'fields', title: 'Compute',
              fields: [
                { label: 'vCPU', value: '2', strong: true },
                { label: 'Memory', value: '4 GB', strong: true },
                { label: 'Guest OS', value: 'Microsoft Windows Server 2022 (64-bit)' },
                { label: 'Tags', tags: ['WEB', 'ABC Orchestrator'], wide: true },
              ],
            },
            {
              type: 'fields', title: 'Placement',
              fields: [
                { label: 'Cluster', value: 'ACMTHCICLUSTER', secondary: 'acmthciesx03.dcmartin.local' },
                { label: 'Datastore', value: 'V5000_VOLUME01', secondary: '1 disk · 150 GB', link: 'internal', jump: 'backing' },
                { label: 'Provider', value: 'VMWARE-vmware-vcenter-01', link: 'internal' },
                { label: 'Folder', value: 'Datacenters/vm/Cievo/ABC Projekt/_TEST masiny', long: 'Datacenters/vm/Cievo/ABC Projekt/_TEST masiny/Frontend/Production/Brno/Cluster-A/Very/Deep/Folder/Structure', wide: true },
              ],
            },
          ],
        },
        {
          id: 'disks', title: 'Disks', icon: 'disk', count: 1,
          description: 'Virtual disks attached to the VM.',
          blocks: [{ type: 'table', table: tableOf('vmwareVm', 'disks') }],
        },
        {
          id: 'backing', title: 'Backing storage', icon: 'layers',
          description: 'Storage volumes behind the VM’s datastore.',
          blocks: [
            {
              type: 'status', title: 'Replication',
              status: { label: 'Consistent synchronized', tone: 'success' },
              facts: [
                { label: 'Mode', value: 'Metro Mirror' },
                { label: 'Progress', value: '100 %' },
                { label: 'Consistency group', value: 'rccg_db_and_app', mono: true },
              ],
            },
            {
              type: 'fields', title: 'V5000_VOLUME01', description: 'IBM FlashSystem 5000 · Pool0',
              fields: [
                { label: 'Provider', value: 'IBM FlashSystem 5000', secondary: 'ibm-flashsystem-01', link: 'internal' },
                { label: 'Pool', value: 'Pool0' },
                { label: 'Capacity', value: '150 GB', strong: true, secondary: '42 % used' },
              ],
            },
          ],
        },
        {
          id: 'technical', title: 'Technical', icon: 'code', technical: true,
          description: 'Identifiers for support and integrations.',
          blocks: [
            {
              type: 'technical', title: 'Virtual machine',
              fields: [
                { label: 'MoRef', value: 'vm-1043', copy: true },
                { label: 'Instance UUID', value: '502c1f3a-8b7e-4c6d-9a51-2f0e7d3c9b14', copy: true },
                { label: 'VM path', value: '[V5000_VOLUME01] TEST-WEB01/TEST-WEB01.vmx', long: '[V5000_VOLUME01] TEST-WEB01-PRODUCTION-FRONTEND-BRNO/TEST-WEB01-PRODUCTION-FRONTEND-BRNO.vmx', copy: true },
                { label: 'Hostname / IP', value: '', empty: true },
              ],
            },
            { type: 'technical', title: 'Disks', fields: [{ label: 'Hard disk 1 · NAA', value: 'naa.6005076810810261f800000000000a1b', copy: true }] },
            {
              type: 'technical', title: 'Backing volume',
              fields: [
                { label: 'Volume ID', value: '27' },
                { label: 'vdisk UID', value: '600507681081026A1800000000000A1B', copy: true },
              ],
            },
          ],
        },
      ],
    },

    ibmPower: {
      sections: [
        {
          id: 'summary', title: 'Summary', icon: 'grid',
          description: 'Operating system and lifecycle of the partition.',
          blocks: [
            {
              type: 'fields', title: 'System',
              fields: [
                { label: 'Operating system', value: 'AIX 7.3', strong: true, secondary: '7300-03-02-2546' },
                { label: 'Managed system', value: 'IIC-Server-8286-42A-SN21486AV', link: 'internal' },
                { label: 'Last activated profile', value: 'default_profile' },
              ],
            },
            {
              type: 'fields', title: 'State',
              fields: [
                { label: 'Bootable', value: 'Yes' },
                { label: 'Uptime', value: '21 d 23 h', secondary: '1 898 064 s' },
              ],
            },
          ],
        },
        {
          id: 'processor', title: 'Processor and memory', nav: 'Processor & memory', icon: 'cpu',
          description: 'Current, desired and allowed resources.',
          blocks: [
            {
              type: 'fields', title: 'Processors',
              fields: [
                { label: 'Current / desired', value: '4 / 4', strong: true },
                { label: 'Mode', value: 'Shared · uncapped' },
              ],
            },
            {
              type: 'fields', title: 'Memory',
              fields: [
                { label: 'Current / desired', value: '4096 / 4096 MB', strong: true },
                { label: 'Limits (min – max)', value: '1024 – 4096 MB' },
              ],
            },
          ],
        },
        {
          id: 'network', title: 'Network and monitoring', nav: 'Network', icon: 'network',
          description: 'RMC connection between the partition and the HMC.',
          blocks: [
            {
              type: 'status', title: 'RMC monitoring',
              status: { label: 'Active', tone: 'success' },
              facts: [
                { label: 'RMC IP address', value: '10.99.98.101', mono: true },
              ],
            },
          ],
        },
        {
          id: 'storage', title: 'Storage', icon: 'disk', count: 3,
          description: 'Volumes mapped through the Virtual I/O Servers.',
          blocks: [{ type: 'table', table: tableOf('ibmPower', 'storage') }],
        },
        {
          id: 'io', title: 'I/O and virtualization', nav: 'I/O', icon: 'server',
          description: 'Virtual and physical I/O configuration.',
          blocks: [{
            type: 'fields',
            fields: [
              { label: 'Maximum virtual I/O slots', value: '16' },
              { label: 'Physical I/O', value: 'No' },
            ],
          }],
        },
        {
          id: 'technical', title: 'Technical', icon: 'code', technical: true,
          description: 'Identifiers for support and integrations.',
          blocks: [
            {
              type: 'technical', title: 'Partition',
              fields: [
                { label: 'Partition ID', value: '4' },
                { label: 'Partition UUID', value: '774DD94-645F-458F-B271-1E64307800EC', long: '774DD94-645F-458F-B271-1E64307800EC-IIC-Server-8286-42A-SN21486AV', copy: true },
                { label: 'Logical serial number', value: '21486AV4', copy: true },
              ],
            },
            {
              type: 'technical', title: 'Storage WWPNs',
              fields: [
                { label: 'hdisk0', value: 'c05076082d1a0012', copy: true },
                { label: 'hdisk1', value: 'c05076082d1a0014', copy: true },
                { label: 'hdisk2-erp-archive-volume', value: 'c05076082d1a0016', copy: true },
              ],
            },
          ],
        },
      ],
    },

    accessLog: {
      sections: [
        {
          id: 'request', title: 'Request', icon: 'grid',
          description: 'One request handled by the platform API.',
          blocks: [
            {
              type: 'status', title: 'Response',
              status: { label: '502 Bad Gateway', tone: 'error' }, when: '05.10.2026 14:46:08',
              facts: [
                { label: 'Duration', value: '3.28 s', secondary: '3284.8 ms' },
                { label: 'Method', value: 'GET', mono: true },
                { label: 'User', value: 'test' },
              ],
            },
            {
              type: 'fields', title: 'Target',
              fields: [
                { label: 'Path', value: '/get_volumes', long: '/recovery-plans/recovery-groups/db_and_app_production_tier2_critical_brno/inventory/volumes', mono: true, copy: true, wide: true },
                { label: 'Query string', value: 'provider_id=ibm-flashsystem-01', long: 'provider_id=ibm-flashsystem-01&include_mappings=true&include_relationships=true&page_size=500&cursor=eyJvZmZzZXQiOjUwMCwic29ydCI6Im5hbWUifQ', mono: true, copy: true, wide: true },
              ],
            },
          ],
        },
        {
          id: 'reqbody', title: 'Request body', icon: 'code',
          description: 'Payload sent by the client.',
          blocks: [{ type: 'code', label: 'Request body', meta: 'Empty', code: '', empty: 'No body was recorded for this request.' }],
        },
        {
          id: 'resbody', title: 'Response body', icon: 'code',
          description: 'Payload returned by the platform API.',
          blocks: [{
            type: 'code', label: 'JSON', meta: '214 B',
            code: '{\n  "detail": "Bad gateway: FlashSystem REST API did not answer within 3000 ms",\n  "provider_id": "ibm-flashsystem-01",\n  "endpoint": "https://10.99.99.61:7443/rest/v1/lsvdisk",\n  "retryable": true,\n  "attempts": 3,\n  "trace_id": null\n}',
          }],
        },
        {
          id: 'technical', title: 'Technical', icon: 'code', technical: true,
          description: 'Client details and identifiers of this log entry.',
          blocks: [
            {
              type: 'technical', title: 'Client',
              fields: [
                { label: 'User agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0', copy: true },
                { label: 'Referer', value: 'http://10.99.99.53:8080/recovery-plans/recovery-groups/db_app_group/edit', copy: true, link: 'external' },
              ],
            },
            { type: 'technical', title: 'Log entry', fields: [{ label: 'Request ID', value: 'req-7f3a9c2e-41d0-4b8e-9a51-2f0e7d3c9b14', copy: true }] },
          ],
        },
      ],
    },

    platformProvider: {
      width: 880,
      sections: [
        {
          id: 'overview', title: 'Overview', icon: 'grid',
          description: 'What this platform provider is and who is notified.',
          blocks: [{
            type: 'fields',
            fields: [
              { label: 'Type', value: 'Airflow', strong: true },
              { label: 'Notification email', value: 'platform-team@example.com', link: 'internal' },
              { label: 'Description', value: 'Application recovery DAG orchestration.', long: 'Application recovery DAG orchestration for all production recovery groups. Runs the clean-room validation and the final cut-over DAGs; notifications go to the platform team.', wide: true },
              { label: 'URL', value: 'http://10.99.99.55:8080/', long: 'http://airflow-primary-orchestrator.brno.datacenter.internal.example.com:8080/home?status=active', mono: true, link: 'external', copy: true, wide: true },
            ],
          }],
        },
        {
          id: 'connection', title: 'Connection', icon: 'network',
          description: 'How the platform reaches the orchestrator host.',
          blocks: [
            {
              type: 'status', title: 'Credential',
              status: { label: 'Available', tone: 'success' },
              facts: [
                { label: 'Credential', value: 'airflow-ssh', mono: true },
                { label: 'Username', value: 'airflow', mono: true },
                { label: 'Password', secret: true },
              ],
            },
            {
              type: 'fields', title: 'Host',
              fields: [
                { label: 'IP address', value: '10.99.99.55', mono: true, copy: true },
                { label: 'Port', value: '22', mono: true },
                { label: 'DAG directory', value: '/home/airflow/dags', long: '/opt/airflow/deployments/production/brno/recovery/dags/application-recovery', mono: true, copy: true, wide: true },
              ],
            },
          ],
        },
        {
          id: 'technical', title: 'Technical', icon: 'code', technical: true,
          description: 'Identifiers for support and integrations.',
          blocks: [{ type: 'technical', fields: [{ label: 'Provider ID', value: 'airflow-01', long: 'airflow-primary-orchestrator-brno-datacenter-01-7f3a9c2e', copy: true }] }],
        },
      ],
    },

    identityUser: {
      width: 880,
      sections: [
        {
          id: 'overview', title: 'Overview', icon: 'grid',
          description: 'Profile and account state from the identity provider.',
          blocks: [
            {
              type: 'fields', title: 'Profile',
              fields: [
                { label: 'Username', value: 'jnovak', strong: true },
                { label: 'Email', value: 'jan.novak@example.com', long: 'jan.novak.recovery.operations.brno@aricoma-recovery-platform.example.com', link: 'internal' },
                { label: 'First name', value: 'Jan' },
                { label: 'Last name', value: 'Novák' },
              ],
            },
            {
              type: 'fields', title: 'Account',
              fields: [
                { label: 'Email verified', value: 'Not verified', badge: 'warning' },
                { label: 'Created', value: '12 Mar 2026, 08:14' },
                { label: 'Active session since', value: '', empty: true },
              ],
            },
          ],
        },
        {
          id: 'roles', title: 'Roles', icon: 'layers', count: 4,
          description: 'Realm and client roles assigned to the user.',
          blocks: [{
            type: 'fields',
            fields: [
              { label: 'Realm roles', tags: ['abco-admin', 'recovery-operator', 'auditor'], wide: true },
              { label: 'Client roles', tags: ['abco-frontend · viewer'], wide: true },
            ],
          }],
        },
        {
          id: 'technical', title: 'Technical', icon: 'code', technical: true,
          description: 'Identifiers for support and integrations.',
          blocks: [{
            type: 'technical',
            fields: [
              { label: 'User ID', value: 'f3a9c2e4-1d04-4b8e-9a51-2f0e7d3c9b14', copy: true },
              { label: 'Realm', value: 'aricoma' },
              { label: 'Federation link', value: '', empty: true },
            ],
          }],
        },
      ],
    },
  }
})()
