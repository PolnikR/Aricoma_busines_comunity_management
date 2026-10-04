# TODO: Backing Storage Info

## Task 1: Mapper a model — storageProviderId, ioGroupName
- [x] `StorageVolume` má `storageProviderId` a `ioGroupName`
- [x] mapper číta `storage_provider_id` a `IO_group_name` cez lokálny wire typ (bez zmeny `src/generated/**`)
- [x] nový `mapVmStorageVolumes.test.ts` pokrýva nové polia, fallback a mapovanie source/target mappingov
- Overenie: `npm exec vitest run src/features/discovery-inventory/resources/helpers/mapVmStorageVolumes.test.ts`
- Súbory: `model/vmStorageVolumesTypes.ts`, `helpers/mapVmStorageVolumes.ts`, `helpers/mapVmStorageVolumes.test.ts`

## Task 2: BackingStorageInfo komponent + panel + locale
- [x] každý volume má vlastný blok so základnými údajmi aj pri `snapshotCount: 0`
- [x] display name volume: `volume.volumeName || volume.name || volume.id` (nikdy prázdna hlavička)
- [x] NAA zobrazené, `vdiskUid` nie
- [x] FlashCopy podčasť: počítadlá, `No FlashCopy mappings`
- [x] source AJ target mappings majú plnohodnotný detail: Source volume, Target volume, Status, Progress (clean progress), Created (start time)
- [x] loading skeleton volume blokov, error + Retry, empty state pre `volumes = []`
- [x] názov sekcie `Backing Storage Info`, key `drawer.sections.backingStorageInfo`
- [x] locale cleanup: odstrániť iba keys po refactore skutočne nepoužité; `details.snapshotSource/Target/Status/Progress/Created` ostávajú (používajú ich nové tabuľky)
- Component testy (`VirtualMachineDetailPanel.test.tsx`):
  - [x] volume sa zobrazí aj pri `snapshotCount = 0`
  - [x] zero mappings → `No FlashCopy mappings`
  - [x] viac backing volumes → zobrazia sa všetky
  - [x] NAA sa zobrazí
  - [x] `vdiskUid` sa v UI nezobrazí
  - [x] source mapping sa zobrazí (všetkých 5 údajov)
  - [x] target mapping sa zobrazí (všetkých 5 údajov)
  - [x] provider sa zobrazí ako Name + raw ID (Task 3)
  - [x] neznámy provider → iba raw ID (Task 3)
  - [x] raw hodnoty sa neformátujú / nehumanizujú
  - [x] prázdne volumes → backing-storage empty state
  - [x] display name fallback `volumeName → name → id`
  - [x] loading skeleton, error + Retry, retrying stav
  - [x] názov sekcie `Backing Storage Info`
- Overenie: `VirtualMachineDetailPanel.test.tsx`, `src/locales/detailDrawerHelpTranslations.test.ts`
- Súbory: `vmware/BackingStorageInfo.tsx`, `vmware/VirtualMachineDetailPanel.tsx`, `src/locales/{en,sk,cs}.json`

## Task 3: Resolution mena providera
- [x] `VmwareResourcesPage` odovzdá už načítaných `providers` do panelu
- [x] zobrazí sa meno providera + raw ID; neznáme ID → iba raw ID
- Overenie: `VirtualMachineDetailPanel.test.tsx`
- Súbory: `vmware/VmwareResourcesPage.tsx`, `vmware/VirtualMachineDetailPanel.tsx`, `vmware/BackingStorageInfo.tsx`

## Task 4: Help text
- [x] en/sk/cs `pages.virtualMachines.help.backing.*` vysvetľuje volumes, NAA a FlashCopy
- Overenie: `detailDrawerHelpTranslations.test.ts`, test helpu v paneli

## Checkpoint
- [x] focused testy, eslint na zmenených súboroch, `npm run typecheck`, `git diff --check`
- [x] commit
