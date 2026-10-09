# Úlohy: Recovery Applications – opravy z auditu

Plán: `tasks/recovery-app-audit-fixes-plan.md`. `RA/` je skratka pre `src/features/recovery-plans/recovery-applications/`.

### T1: IBM Power source/target
- [x] `IBM_POWER` provider s `credentialStatus=ok` je eligible ako source aj target bez ohľadu na rolu.
- [x] Pre VMware platí: source má rolu iné ako `target`, target má `role=target`.
- [x] Test: ten istý Power provider sa dá zvoliť ako source aj target a request pošle `platform=IBM_POWER`, `source_provider_id` a `target_provider_id` s rovnakým id.

**Overenie:** `RA/utils/eligibleProviders.test.ts`, `RA/utils/validateRecoveryApplication.test.ts`, `RA/components/AppMetadataForm.test.tsx`, `RA/utils/recoveryApplicationFormMapper.test.ts`

### T2: Zamknutý push pri editácii nasadenej appky
- [x] Builder dostane prop, ktorý zamkne prepínač push v stave zapnutý (`disabled`) a zobrazí lokalizované vysvetlenie.
- [x] Editor page ho zapne iba pri `orchestration.pushed === true`. Pri zázname s `run_id` a `pushed=false` sa nezapína.
- [x] Testy: zamknutý prepínač s textom; nepushnutá appka sa dá uložiť bez push; delete parametre sa nemenia.

**Overenie:** `RA/components/RecoveryAppBuilder.test.tsx`, `RA/pages/RecoveryApplicationEditorPage.test.tsx`

### T3: IBM Power inventár
- [x] Pre IBM Power je `enabled=false` a zobrazí sa `Alert` info s lokalizovaným textom (sk/en/cs).
- [x] VMware správanie sa nemení.

**Overenie:** `RA/components/RecoveryApplicationInventory.test.tsx`

### T4: notificationEmail
- [x] Form state má `notificationEmail: string | null`, ktorý sa načíta z `application.notificationEmail ?? null`.
- [x] `toRecoveryApplicationData` ho pošle bez zmeny.
- [x] Testy: create pošle `null`; edit zachová hodnotu aj `null`.

**Overenie:** `RA/utils/recoveryApplicationFormMapper.test.ts`, `RA/pages/RecoveryApplicationEditorPage.test.tsx`, `RA/pages/RecoveryApplicationBuilderPage.test.tsx`

### T5: DetailView
- [x] V Overview sa zobrazuje „Target provider“ (meno providera, prípadne id), „Policy set ID“ (`policy_set_id`) a „Notification email“. Prázdna hodnota sa zobrazí cez `DetailField` ako „Not set“.
- [x] `target_lpar_prefix` sa nezobrazuje, nesúlad s OpenAPI je zdokumentovaný v spec.

**Overenie:** `RA/components/RecoveryApplicationsTable.test.tsx`
