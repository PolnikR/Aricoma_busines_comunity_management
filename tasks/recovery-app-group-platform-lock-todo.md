# Úlohy: Recovery App – Recovery Groups podľa platformy a uzamknutie providerov

Plán: `tasks/recovery-app-group-platform-lock-plan.md`. `RA/` je skratka pre `src/features/recovery-plans/recovery-applications/`.

### T1: Filtrovanie skupín
- [ ] VMware zdroj ponúkne iba skupiny `vmware_virtual_machines`, IBM Power zdroj iba `ibm_power_virtual_machines`.
- [ ] Bez zdroja sa neponúkne nič. Skupina s `workloadType = null` sa neponúkne nikdy.
- [ ] Filter platí pre sidebar, priraďovanie aj VM/LPAR možnosti.

**Overenie:** `RA/utils/recoveryGroupPlatform.test.ts`, `RA/components/RecoveryAppBuilder.test.tsx`

### T2: Zmena zdroja pri vytváraní
- [ ] Ak sú priradené skupiny, zmena zdroja otvorí `ConfirmDialog` (texty v sk/en/cs).
- [ ] Potvrdenie odpojí skupiny vrátane VM/LPAR a zachová tiery (id, popis, poradie).
- [ ] Zrušenie nechá pôvodný zdroj aj priradenia.
- [ ] Zmena cieľa skupiny nemaže. Bez priradených skupín sa dialóg nezobrazí.

**Overenie:** `RA/components/RecoveryAppBuilder.test.tsx`, `RA/components/AppMetadataForm.test.tsx`

### T3: Uzamknutie pri editácii
- [ ] Selecty zdroja aj cieľa sú `disabled`, zobrazujú meno providera, prípadne id ako „unavailable“.
- [ ] Builder zmenu providera ignoruje. Editor page pošle pôvodné `platform`, `source_provider_id` a `target_provider_id` aj vtedy, keď provider už nie je dostupný.
- [ ] Legacy záznam bez provider id ostane odomknutý.

**Overenie:** `RA/components/AppMetadataForm.test.tsx`, `RA/utils/recoveryApplicationFormMapper.test.ts`, `RA/utils/validateRecoveryApplication.test.ts`, `RA/pages/RecoveryApplicationEditorPage.test.tsx`

### T4: Validácia pred uložením
- [ ] Ak skupina chýba alebo nesedí platforma, zobrazí sa konkrétna lokalizovaná chyba a uloženie sa zablokuje.
- [ ] IBM Power: neplatný názov LPAR zablokuje uloženie.
- [ ] Kým sa skupiny načítavajú, Save je zablokované.

**Overenie:** `RA/utils/validateRecoveryApplication.test.ts`, `RA/components/RecoveryAppBuilder.test.tsx`

### T5: Regresia
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications`, `npx tsc -b`, eslint.
