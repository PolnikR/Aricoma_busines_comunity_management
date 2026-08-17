# API Endpoint Groups — Frontend Reference

The backend's `/docs` (Swagger UI) now groups all endpoints by category instead
of listing them flat. **No paths, params, request/response shapes, or auth
changed** — this is only about how endpoints are organized/labeled. Existing
frontend code needs no changes because of this.

Every endpoint still requires the `X-User: <username>` header as before
(except `/credentials/pubkey`, which needs none).

## Groups

| Swagger group | Endpoints |
|---|---|
| Health | `GET /health` |
| Providers | `GET /get_providers`, `POST /submit_provider`, `DELETE /delete_provider` |
| Platform Providers | `GET /get_platform_providers`, `POST /submit_platform_provider`, `DELETE /delete_platform_provider` |
| Credentials | `GET /get_credentials`, `POST /submit_credential`, `DELETE /delete_credential`, `GET /credentials/pubkey` |
| vCenter Inventory | `GET /vms`, `GET /vms_in_folder`, `GET /vms_by_tag`, `GET /tags` |
| Discovery | `GET /vdisks_by_vm` |
| Storage Volumes | `GET /get_volumes` |
| IBM Power | `GET /get_power_vm` |
| Operations | `GET /get_orchestrator_runs` |
| Recovery Apps | `GET /get_recovery_apps`, `POST /submit_recovery_dag` |
| Recovery Groups | `GET /get_recovery_groups`, `POST /submit_recovery_group`, `DELETE /delete_recovery_group` |
| Snapshot Policies | `GET /get_policies`, `POST /submit_policy`, `DELETE /delete_policy` |
| Policy Sets | `GET /get_policy_sets`, `POST /submit_policy_set`, `DELETE /delete_policy_set` |

Use these group names if you're organizing an API client file per group
(e.g. `api/providers.js`, `api/credentials.js`) — they map 1:1 to the
backend's own `api/routers/*.py` split.