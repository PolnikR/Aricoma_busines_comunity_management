# Úlohy: Recovery App – Recovery Groups podľa platformy a uzamknutie providerov

Plán: `tasks/recovery-app-group-platform-lock-plan.md`. `RA/` je skratka pre `src/features/recovery-plans/recovery-applications/`.

### T1: Filtrovanie skupín
- [x] VMware zdroj ponúkne iba skupiny `vmware_virtual_machines`, IBM Power zdroj iba `ibm_power_virtual_machines`.
- [x] Bez zdroja sa neponúkne nič. Skupina s `workloadType = null` sa neponúkne nikdy.
- [x] Filter platí pre sidebar, priraďovanie aj VM/LPAR možnosti.

**Overenie:** `RA/utils/recoveryGroupPlatform.test.ts`, `RA/components/RecoveryAppBuilder.test.tsx`

### T2: Zmena zdroja pri vytváraní
- [x] Ak sú priradené skupiny, zmena zdroja otvorí `ConfirmDialog` (texty v sk/en/cs).
- [x] Potvrdenie odpojí skupiny vrátane VM/LPAR a zachová tiery (id, popis, poradie).
- [x] Zrušenie nechá pôvodný zdroj aj priradenia.
- [x] Zmena cieľa skupiny nemaže. Bez priradených skupín sa dialóg nezobrazí.

**Overenie:** `RA/components/RecoveryAppBuilder.test.tsx`, `RA/components/AppMetadataForm.test.tsx`

### T3: Uzamknutie pri editácii
- [x] Selecty zdroja aj cieľa sú `disabled`, zobrazujú meno providera, prípadne id ako „unavailable“.
- [x] Builder zmenu providera ignoruje. Editor page pošle pôvodné `platform`, `source_provider_id` a `target_provider_id` aj vtedy, keď provider už nie je dostupný.
- [x] Legacy záznam bez provider id ostane odomknutý.

**Overenie:** `RA/components/AppMetadataForm.test.tsx`, `RA/utils/recoveryApplicationFormMapper.test.ts`, `RA/utils/validateRecoveryApplication.test.ts`, `RA/pages/RecoveryApplicationEditorPage.test.tsx`

### T4: Validácia pred uložením
- [x] Ak skupina chýba alebo nesedí platforma, zobrazí sa konkrétna lokalizovaná chyba a uloženie sa zablokuje.
- [x] IBM Power: neplatný názov LPAR zablokuje uloženie.
- [x] Kým sa skupiny načítavajú, Save je zablokované.

**Overenie:** `RA/utils/validateRecoveryApplication.test.ts`, `RA/components/RecoveryAppBuilder.test.tsx`

### T5: Regresia
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications`, `npx tsc -b`, eslint.
