# OpenAPI spec gaps

Fields the frontend needs typed that `openapi/abco-api.json` leaves untyped or
incomplete. Each gap forces a local schema in the frontend (marked `// SPEC GAP:`,
allowlisted in `eslint.config.js`, see ADR 0001). When backend types a field, the
frontend deletes the local part and the allowlist entry.

State: spec from regen commit `2df865b`.

## Untyped response fields

| Endpoint | Field in spec | Spec type | Shape the frontend relies on | Frontend file |
|---|---|---|---|---|
| `GET /get_power_vm` | `PowerVmRecord.lpar`, `PowerVmRecord.vios` | `record<string, unknown>` | `{ PartitionUUID?, PartitionName?, PartitionType?, PartitionState?, SystemName? }` plus scalar extras | `resources/api/schemas/powerInventorySchema.ts` |
| `GET /get_power_vm` | `PowerVmsResponse.counts_by_type` | `record<string, int>` | fixed keys `LogicalPartition`, `VirtualIOServer` | same |
| `GET /get_power_vm` | top-level `provider_id` | missing | `string`, optional | same |
| `GET /get_volumes` | `VolumesResponse.volumes[]` | `record<string, unknown>` | IBM vdisk record: `id`, `name`, `IO_group_*`, `status`, `mdisk_grp_*`, `capacity`, `type`, `FC_*`, `RC_*`, `vdisk_UID`, counts, `host_maps[{ host_id, scsi_id }]`, ... | `resources/api/schemas/flashSystemInventorySchema.ts` |
| `GET /get_volumes` | `pools`, `hosts`, `clusters` | `record<string, unknown>` | pool `{ name, capacity, used_capacity, free_capacity }`, host `{ name, cluster_id, cluster_name }`, cluster `{ name }` | same |
| `GET /vdisks_by_vm` | `VdisksByVmResponse.vdisks` | `record<string, unknown>` | volume record with `sanpshosts` (sic) `{ has_snapshots, snapshot_count, is_snapshot, source_mappings[], target_mappings[] }` | `resources/api/schemas/vmStorageVolumesSchema.ts` |
| `GET /get_volume_tree` | `VolumeTreeNode.kind` | `string` | enum `pool` \| `volume` \| `fcmap` \| `consistency_group` | `infrastructure/api/schemas/flashSystemVolumeTreeSchema.ts` |
| `GET /get_volume_tree` | `VolumeTreeNode.detail` | `record<string, unknown>` | one detail shape per `kind` (pool, volume, fcmap, consistency group) | same |
| `DELETE /delete_recovery_group`, `POST /rollback_group_from_orchestrator`, `DELETE /delete_recovery_app` | `RollbackReport` | only `status` | `airflow { status, dag_id?, paused?, failed_runs?, dag_file?, dag_record? }`, `ibm { status, consistency_groups?, fcmaps?, volumes?, errors? }` | `recovery-groups/api/schemas/recoveryGroupsSchema.ts`, `recovery-applications/api/schemas/recoveryApplicationsSchema.ts` |

## Incomplete request/response models

| Endpoint | Model | Gap | Impact |
|---|---|---|---|
| `POST /submit_recovery_group`, `GET /get_recovery_groups` | `RecoveryVM` | declares only `name`; the frontend sends and reads per-VM metadata `order`, `hostname`, `ip_address`, `os`, `cpu`, `memory_gb`, `storage_gb` | the frontend cannot validate the submit payload with the generated schema, because zod would strip the metadata; on read the generated schema strips it |
| `GET /vdisks_by_vm` | `VdisksByVmResponse.vdisks` key | the misspelled `sanpshosts` field is part of the actual response | should be renamed to `snapshots` in the backend and the spec |

## Backend defaults the frontend depends on

| Endpoint | Parameter | Default in spec | Why the frontend relies on it |
|---|---|---|---|
| `GET /vdisks_by_vm` | `ibm_provider_id` | `ibm-flashsystem-01` | VM detail cannot know which FlashSystem holds a VM's disks since `defaultFlashcopyProviderId` was removed. Request: resolve the FlashSystem from the disks' `naa` identifiers so the parameter is not needed. |
| `GET /get_recovery_app_inventory` | `compute_provider_id` | `vmware-vcenter-02` | a recovery application does not store the compute provider its run recovered to. Request: store it on the run or return it without requiring the parameter. |
