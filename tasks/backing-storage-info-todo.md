# TODO: Backing Storage Info

## Task 1: Mapper a model — storageProviderId, ioGroupName
- [x] `StorageVolume` má `storageProviderId` a `ioGroupName`
- [x] mapper číta `storage_provider_id` a `IO_group_name` cez lokálny wire typ (bez zmeny `src/generated/**`)
- [x] nový `mapVmStorageVolumes.test.ts` pokrýva nové polia, fallback a mapovanie source/target mappingov
- Overenie: `npm exec vitest run src/features/discovery-inventory/resources/helpers/mapVmStorageVolumes.test.ts`
- Súbory: `model/vmStorageVolumesTypes.ts`, `helpers/mapVmStorageVolumes.ts`, `helpers/mapVmStorageVolumes.test.ts`

## Task 2: BackingStorageInfo komponent + panel + locale
- [ ] každý volume má vlastný blok so základnými údajmi aj pri `snapshotCount: 0`
- [ ] display name volume: `volume.volumeName || volume.name || volume.id` (nikdy prázdna hlavička)
- [ ] NAA zobrazené, `vdiskUid` nie
- [ ] FlashCopy podčasť: počítadlá, `No FlashCopy mappings`
- [ ] source AJ target mappings majú plnohodnotný detail: Source volume, Target volume, Status, Progress (clean progress), Created (start time)
- [ ] loading skeleton volume blokov, error + Retry, empty state pre `volumes = []`
- [ ] názov sekcie `Backing Storage Info`, key `drawer.sections.backingStorageInfo`
- [ ] locale cleanup: odstrániť iba keys po refactore skutočne nepoužité; `details.snapshotSource/Target/Status/Progress/Created` ostávajú (používajú ich nové tabuľky)
- Component testy (`VirtualMachineDetailPanel.test.tsx`):
  - [ ] volume sa zobrazí aj pri `snapshotCount = 0`
  - [ ] zero mappings → `No FlashCopy mappings`
  - [ ] viac backing volumes → zobrazia sa všetky
  - [ ] NAA sa zobrazí
  - [ ] `vdiskUid` sa v UI nezobrazí
  - [ ] source mapping sa zobrazí (všetkých 5 údajov)
  - [ ] target mapping sa zobrazí (všetkých 5 údajov)
  - [ ] provider sa zobrazí ako Name + raw ID (Task 3)
  - [ ] neznámy provider → iba raw ID (Task 3)
  - [ ] raw hodnoty sa neformátujú / nehumanizujú
  - [ ] prázdne volumes → backing-storage empty state
  - [ ] display name fallback `volumeName → name → id`
  - [ ] loading skeleton, error + Retry, retrying stav
  - [ ] názov sekcie `Backing Storage Info`
- Overenie: `VirtualMachineDetailPanel.test.tsx`, `src/locales/detailDrawerHelpTranslations.test.ts`
- Súbory: `vmware/BackingStorageInfo.tsx`, `vmware/VirtualMachineDetailPanel.tsx`, `src/locales/{en,sk,cs}.json`

## Task 3: Resolution mena providera
- [ ] `VmwareResourcesPage` odovzdá už načítaných `providers` do panelu
- [ ] zobrazí sa meno providera + raw ID; neznáme ID → iba raw ID
- Overenie: `VirtualMachineDetailPanel.test.tsx`
- Súbory: `vmware/VmwareResourcesPage.tsx`, `vmware/VirtualMachineDetailPanel.tsx`, `vmware/BackingStorageInfo.tsx`

## Task 4: Help text
- [ ] en/sk/cs `pages.virtualMachines.help.backing.*` vysvetľuje volumes, NAA a FlashCopy
- Overenie: `detailDrawerHelpTranslations.test.ts`, test helpu v paneli

## Checkpoint
- [ ] focused testy, eslint na zmenených súboroch, `npm run typecheck`, `git diff --check`
- [ ] commit
