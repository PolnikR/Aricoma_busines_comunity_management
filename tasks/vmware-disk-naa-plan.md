# Plán: VMware disk NAA a vdisk UID v Backing Storage Info

Stav: overené 2026-10-05 na FE `spike/ant-design-shell` @ `4a196f50` a BE `main` @ `78233ff`.
Úlohy: `tasks/vmware-disk-naa-todo.md`.

## Overený contract

- BE `api/schemas.py:144-152`: `VmDisk.naa: list[str] = []`. `vcenter/discovery.py:31-61`
  plní disk NAA zo všetkých VMFS extentov backing datastore (cache podľa datastore moId).
  Jeden disk má teda 0..N NAA a nejde o mapovanie disk → jeden FlashSystem volume.
- Generated `vmsResponse.gen.ts:78`: `naa: zod.array(zod.string()).default(...)`, vždy pole.
- FE `mapVmwareInventory.ts` `mapVirtualDisk` NAA zahadzuje; `DiscoveredVirtualDisk` ho nemá.
- `/vdisks_by_vm`: jeden resolved FlashSystem volume má `vdisk_UID: string`
  (FE `StorageVolume.vdiskUid`). VMware key volume je NAA (`volume.naa`), Power key je
  composite a `naa` je `null`.
- `BackingStorageInfo` dnes rozlišuje VMware a Power podľa `volume.naa !== null`.

## Rozhodnutia

1. **Disks:** nový stĺpec `NAA` medzi Datastore a File. Všetky hodnoty pod sebou, mono,
   `-` pri prázdnom poli; horizontálny scroll tabuľky ostáva.
2. **Backing Storage Info:** identita sa volí **explicitným propom** volajúceho
   (`identity: 'vdiskUid' | 'volumeIdAndUid'`), nie podľa `volume.naa`. VMware → riadok
   `vdisk UID` z `volume.vdiskUid`; IBM Power → Volume ID + Volume UID ako dnes. NAA sa
   v tejto sekcii nezobrazuje. Explicitný prop zabráni tomu, aby Power niekedy dostal NAA.
3. **Kolízia s pôvodným zadaním Backing Storage Info** (2026-10-04 zakazovalo vo VMware
   zobraziť `vdisk_UID`): nové zadanie to obracia; testy, ktoré overovali starý zákaz, sa
   prepíšu.
4. **Relationship helper:** kód sa nemení (mimo scope). Opravia sa iba dokumenty o
   contracte disk NAA.

## Non-goals

Zmena BE, nové API/request, zmena `/vdisks_by_vm`, `src/generated/**`, mapovanie disk →
konkrétny volume, zmena IBM Power semantiky, provider vzťahy, iný Resources UI, zmena
architektúry relationship helpera.
