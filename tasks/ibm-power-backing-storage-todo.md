# Úlohy: IBM Power DetailDrawer — Backing Storage Info

Plán: `tasks/ibm-power-backing-storage-plan.md` (revízia 2026-10-04 proti `test` @ `722bece3`).

Uzavreté rozhodnutia:
- bez Orvalu;
- VMware ostáva volume-first;
- iba LPAR;
- meno providera sa berie z `providers`.

**Poradie:** najprv tento plán, až potom `tasks/detail-drawer-section-accents-*`. Accent plán následne rozšíri `IbmPowerDetailPanel.test.tsx` (neprepíše ho) a pokryje aj 6. sekciu Backing Storage Info.

- [x] T1: `StorageVolume` `naaId` → `key` / `naa` / `volumeId`; `StorageVolumeWire` + `'volume_id'`; minimálna kompilačná oprava `BackingStorageInfo`; IBM Power payload v `mapVmStorageVolumes.test.ts`.
- [x] T2: `git mv` `BackingStorageInfo` do `components/`, identita NAA vs Volume ID/UID, prop `emptyText`, container `@container/backing-storage`, locale `resources.backingStorage.*` (en/cs/sk).
- [x] Checkpoint A: mapper, VMware panel, query/hook a recovery testy; typecheck.
- [x] T3: VMware regresia na shared komponente a nový test „VMware nemá Volume ID/UID“.
- [x] T4: Power integrácia
  - `providers` → `PowerInventoryView` → `IbmPowerDetailPanel`;
  - LPAR: `useVdisksByVm(partitionName, providerId)`;
  - VIOS: `useVdisksByVm('', undefined)`, query je disabled, nevznikne `/vdisks_by_vm` request a sekcia sa nerenderuje;
  - sekcia za Virtual I/O s titulkom `t('drawer.sections.backingStorageInfo')` (prop `labels.sections.backingStorage`), **bez** `defaultOpen`, teda predvolene zbalená;
  - mock hooku v `PowerInventoryView.test.tsx`.
- [x] Checkpoint B: VMware a Power testy, eslint, typecheck. Manuálny smoke v prehliadači nevykonaný (v session nie je prehliadač ani backend).
- [x] T5: Power locale, help a testy
  - locale: iba `resources.power.detail.noBackingVolumes` a `resources.power.help.backing.*`; **žiadny** `resources.power.groups.backingStorage`;
  - nový `IbmPowerDetailPanel.test.tsx`, body 1–15. Medzi nimi:
    - VIOS `toHaveBeenCalledWith('', undefined)` a bez sekcie;
    - `aria-expanded="false"` pred otvorením;
    - titulok z `drawer.sections.backingStorageInfo`;
  - provider flow v `PowerInventoryView.test.tsx`.
- [x] Checkpoint C: validácia z plánu §6, kontrola locale kľúčov, `git diff --check`, review.

## Výsledok (2026-10-04)

Commity:
- `fcf89309`: plán.
- `4093f7f8`: T1, model a mapper.
- `54e8abd9`: T2, shared komponent a locale.
- `362c3f7f`: T3, VMware regresia.
- `74835809`: T4, Power integrácia.
- `301ceb3f`: T5, help a testy.

Odchýlky od plánu:
- `resources.power.detail.noBackingVolumes` pribudol už v T4, aby T4 nezobrazoval surový kľúč.
- Bod 15 (titulok z `drawer.sections.backingStorageInfo`) je overený v `PowerInventoryView.test.tsx`, kde sa kľúč reálne napája. `IbmPowerDetailPanel.test.tsx` dostáva labely zvonka.

Overenie:
- Focused Vitest (plán §6): 11 súborov a 79 testov prešlo; po úprave lintu znovu 18 Power testov.
- `npm run typecheck`, eslint zmenených TS/TSX, `check-feature-layout`, `git diff --check`: prešli.
- Kontrola locale: en/cs/sk majú rovnakú množinu 22 kľúčov a starý prefix nezostal.

Nespustené:
- celý test suite;
- production build;
- browser smoke.
