# Úlohy: IBM Power DetailDrawer — Backing Storage Info

Plán: `tasks/ibm-power-backing-storage-plan.md` (revízia 2026-10-04 proti `test` @ `722bece3`).

Uzavreté rozhodnutia:
- bez Orvalu;
- VMware ostáva volume-first;
- iba LPAR;
- meno providera sa berie z `providers`.

**Poradie:** najprv tento plán, až potom `tasks/detail-drawer-section-accents-*`. Accent plán následne rozšíri `IbmPowerDetailPanel.test.tsx` (neprepíše ho) a pokryje aj 6. sekciu Backing Storage Info.

- [ ] T1: `StorageVolume` `naaId` → `key` / `naa` / `volumeId`; `StorageVolumeWire` + `'volume_id'`; minimálna kompilačná oprava `BackingStorageInfo`; IBM Power payload v `mapVmStorageVolumes.test.ts`.
- [ ] T2: `git mv` `BackingStorageInfo` do `components/`, identita NAA vs Volume ID/UID, prop `emptyText`, container `@container/backing-storage`, locale `resources.backingStorage.*` (en/cs/sk).
- [ ] Checkpoint A: mapper, VMware panel, query/hook a recovery testy; typecheck.
- [ ] T3: VMware regresia na shared komponente a nový test „VMware nemá Volume ID/UID“.
- [ ] T4: Power integrácia
  - `providers` → `PowerInventoryView` → `IbmPowerDetailPanel`;
  - LPAR: `useVdisksByVm(partitionName, providerId)`;
  - VIOS: `useVdisksByVm('', undefined)`, query je disabled, nevznikne `/vdisks_by_vm` request a sekcia sa nerenderuje;
  - sekcia za Virtual I/O s titulkom `t('drawer.sections.backingStorageInfo')` (prop `labels.sections.backingStorage`), **bez** `defaultOpen`, teda predvolene zbalená;
  - mock hooku v `PowerInventoryView.test.tsx`.
- [ ] Checkpoint B: VMware a Power testy, eslint, typecheck; manuálny resize, LPAR a VIOS, ak je prehliadač.
- [ ] T5: Power locale, help a testy
  - locale: iba `resources.power.detail.noBackingVolumes` a `resources.power.help.backing.*`; **žiadny** `resources.power.groups.backingStorage`;
  - nový `IbmPowerDetailPanel.test.tsx`, body 1–15. Medzi nimi:
    - VIOS `toHaveBeenCalledWith('', undefined)` a bez sekcie;
    - `aria-expanded="false"` pred otvorením;
    - titulok z `drawer.sections.backingStorageInfo`;
  - provider flow v `PowerInventoryView.test.tsx`.
- [ ] Checkpoint C: validácia z plánu §6, kontrola locale kľúčov, `git diff --check`, review.
