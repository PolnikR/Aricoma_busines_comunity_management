# TODO: VMware disk NAA a vdisk UID

Plán: `tasks/vmware-disk-naa-plan.md`

## Task 1: Model a mapper
- [x] `DiscoveredVirtualDisk.naa: string[]`
- [x] `mapVirtualDisk`: `naa: disk.naa` (generated default `[]`, bez fallbacku)
- [x] testy: jedna NAA, viac NAA v poradí API, prázdne pole
- [x] fixtures `DiscoveredVirtualDisk` doplnené o explicitné `naa: []`
- Overenie: `mapVmwareInventory.test.ts`, typecheck

## Task 2: Disks tabuľka
- [x] stĺpec `NAA` (Label | Capacity | Datastore | NAA | File | Thin provisioned), locale `details.naa` en/sk/cs
- [x] všetky NAA pod sebou, mono, `-` pri prázdnom poli, scroll tabuľky bez zmeny
- [x] testy: header, jedna, viac, prázdne, ostatné stĺpce
- Overenie: `VirtualMachineDetailPanel.test.tsx`

## Task 3: Backing Storage Info identita
- [x] prop `identity: 'vdiskUid' | 'volumeIdAndUid'` z volajúceho; VMware `vdisk UID`, Power Volume ID + UID
- [x] locale `resources.backingStorage.vdiskUid` en/sk/cs; `resources.backingStorage.naa` odstrániť, ak ostane nepoužitý
- [x] testy: VMware zobrazí vdisk UID a nie NAA; Power Volume ID/UID a nie NAA
- Overenie: `VirtualMachineDetailPanel.test.tsx`, `IbmPowerDetailPanel.test.tsx`

## Task 4: Dokumenty contextual relationship helperov
- [x] spec/plán/TODO: disk NAA API poskytuje (`string[]`), FE ho zahadzoval a teraz ho zachová; stále žiadne 1:1 disk → volume

## Checkpoint
- [x] focused testy, eslint, `npm run typecheck`, `git diff --check`, commit
