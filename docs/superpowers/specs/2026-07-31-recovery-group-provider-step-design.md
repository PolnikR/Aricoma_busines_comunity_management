# Recovery Group Provider Step Design

## Goal

Make the Recovery Group wizard derive available resource-type cards from connected providers and require the user to select one concrete provider before selecting resources.

## Wizard flow

The wizard will contain four steps:

1. **Group details** — ID, name, and description.
2. **Resource type** — dynamically available resource-type cards.
3. **Provider** — one provider matching the selected resource type.
4. **Resources** — resources loaded only from the selected provider.

The shared `WizardSteps` component remains generic. Recovery Group-specific provider selection belongs in a new feature component such as `RecoveryGroupProviderStep`.

## Dynamic resource-type cards

`RecoveryGroupBuilder` loads providers with `useProviders()`. Only providers with `credentialStatus === "ok"` make a resource type available.

The response drives card visibility:

| Provider type | Category | Card | Workload type | Resource type |
| --- | --- | --- | --- | --- |
| `VMWARE` | Compute workloads | VMware virtual machines | `vmware_virtual_machines` | `vm` |
| `IBM_POWER` | Compute workloads | IBM Power virtual machines | `ibm_power_virtual_machines` | `vm` |
| `FLASHCOPY` | Storage systems | IBM FlashSystem volumes | `ibm_flashsystem` | `volume` |

Multiple healthy providers of the same type produce one resource-type card. Unsupported or unavailable provider types produce no card. The current disabled Oracle, SAP HANA, IBM Fusion, Active Directory, and Db2 cards are not displayed.

The provider-to-card metadata is held in a feature-owned registry rather than conditional JSX. The provider response determines which registry entries are visible.

## Provider selection

After selecting a resource type, the Provider step displays only healthy providers whose `type` matches the selected workload:

- VMware card → `VMWARE` providers
- IBM Power card → `IBM_POWER` providers
- IBM FlashSystem card → `FLASHCOPY` providers

The user selects exactly one provider. `Next` remains disabled until a provider is selected. The selected provider ID is stored in the Recovery Group draft.

Changing the resource type clears the selected provider and resources. Changing the provider clears selected resources.

## Resource loading

The Resources step receives both `workloadType` and `providerId` and enables exactly one inventory query:

- VMware → `fetchVmwareInventory(providerId)`
- IBM Power → `fetchPowerInventory(providerId)`
- IBM FlashSystem → `fetchFlashSystemInventory(providerId)`

Only resources returned for that provider can be selected. No inventory request runs before a provider is selected.

The feature will use a Recovery Group-specific hook to choose the correct inventory fetcher and return a normalized list for the shared selection components. Provider-specific response mapping remains in discovery inventory helpers.

## Data model

The Recovery Group draft gains `providerId: string | null`. New groups cannot be saved until it contains a provider ID. The frontend keeps this normalized field independent of backend payload naming. An API mapper can translate it to fields such as `provider_id_vm` or `provider_id_volume`.

Selected resources remain resource names to match the current Recovery Group payload. The group-level `providerId` scopes those names to one provider.

Existing locally stored Recovery Groups without `providerId` remain readable with `providerId: null`. They require the user to select a provider before the group can be saved again.

## Loading and error states

- While providers load, show a loading state instead of reporting that no resource types exist.
- If provider loading fails, show a retryable error.
- If no healthy supported providers exist, show an empty state.
- If the selected provider disappears or loses valid credentials, invalidate the selection and block progression.
- Resource inventory errors remain retryable and must identify the selected provider.

## Tests

Add or update tests for:

- cards derived from healthy provider types;
- deduplication when multiple providers share a type;
- exclusion of unhealthy and unsupported providers;
- provider list filtering by selected type;
- progression blocked without a provider;
- clearing provider/resources when upstream selections change;
- calling the correct inventory fetcher with the selected provider ID;
- loading, empty, and error states;
- compatibility handling for existing stored groups.
