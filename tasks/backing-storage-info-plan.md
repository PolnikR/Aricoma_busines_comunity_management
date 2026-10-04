# Plán: Backing Storage Info vo VMware VM DetailDraweri

## Prehľad

Sekcia `Backing storage info` vo VMware VM DetailDraweri je dnes iba snapshot view
(`vdisks_by_vm` → `sourceMappings` → počítadlá + jedna snapshot tabuľka). Prepracuje sa
na pohľad na backing storage: jeden blok pre každý backing volume (základné storage
údaje) a pod ním FlashCopy / snapshot podčasť. Volume sa zobrazí vždy, aj pri
`snapshot_count === 0`. Backend, OpenAPI ani `src/generated/**` sa nemenia.

## Aktuálny stav

- `mapVmStorageVolumes.ts` mapuje `vdisks` na `StorageVolume[]`, ale nečíta
  `storage_provider_id` ani `IO_group_name` (nie sú v generated `StorageVolume` schéme;
  `validatingMutator.keepUnlistedFields` ich v payloade zachováva).
- `VirtualMachineDetailPanel.tsx` flatne všetky `sourceMappings` do jednej tabuľky;
  `targetMappings` sa iba počítajú. Volume bez mappingov nie je vidieť vôbec.
- Locale key `drawer.tabs.snapshots` = `Backing storage info` (en/sk/cs).
- Mapper nemá vlastný test.
- Providery sú v Resources flowe už načítané (`ResourcesPage` → `useGetProviders` →
  `VmwareResourcesPage` prop `providers`), takže meno providera sa dá resolvovať bez
  nového API callu.

## Rozhodnutia (potvrdené používateľom 2026-10-04)

- **Provider:** zobraziť meno providera z už načítaných `providers` + raw ID ako
  sekundárny text; ak sa ID nenájde, iba raw ID. `VirtualMachineDetailPanel` dostane
  voliteľný prop `providers`.
- **Názov sekcie:** `Backing Storage Info` vo všetkých jazykoch (ako dnes anglicky);
  help titulok/text v sk/cs ostáva lokalizovaný, aktualizuje sa iba význam.
- **Hodnoty:** raw z backendu (degraded, scsi, striped, 1.00TB), konzistentne
  s FlashSystem volume detailom.
- **Locale key:** `drawer.tabs.snapshots` → `drawer.sections.backingStorageInfo`
  (používa ho iba tento panel).
- **Type boundary:** lokálny wire typ v mapperi
  `StorageVolumeOutput & Partial<Record<'storage_provider_id' | 'IO_group_name', unknown>>`
  + bezpečné čítanie stringu, podľa vzoru `mapOrchestratorRuns.ts`.
- `vdiskUid` ostáva v modeli, v UI sa nerenderuje.

## Komponentová štruktúra

```
VirtualMachineDetailPanel
  DetailDrawerSection "Backing Storage Info"
    BackingStorageInfo            (nový súbor vmware/BackingStorageInfo.tsx)
      DataTableRequestState       (error + Retry, bez zmeny)
      loading  -> skeleton blokov volume (role=status)
      volumes=[] -> "No backing storage volume was resolved for this virtual machine."
      BackingStorageVolume × N    (section aria-labelledby = názov volume)
        hlavička: názov volume + "Backing storage volume"
        dl: Backing provider, NAA, Capacity, Status, Pool, I/O group, Protocol, Type
        FlashCopy / Snapshots
          dl: Snapshot count, Source mappings, Target mappings
          žiadne mappingy -> "No FlashCopy mappings"
          Source mappings DataTable (ak existujú)
          Target mappings DataTable (ak existujú)
```

## Úlohy

Pozri `tasks/backing-storage-info-todo.md`.

## Riziká

| Riziko | Dopad | Mitigácia |
|---|---|---|
| `storage_provider_id` / `IO_group_name` chýba v payloade | Nízky | fallback `''` → v UI `-` |
| Duplicitné aria-label tabuliek pri viacerých volumes | Nízky | label obsahuje názov volume |
