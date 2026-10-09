# Spec: Recovery App – filtrovanie Recovery Groups podľa platformy a uzamknutie providerov

`RA/` je skratka pre `src/features/recovery-plans/recovery-applications/`. BE (`abco-be`) sa používa len na čítanie.

## Zistenia

**BE pravidlá**

`recovery/recovery.py:100-123`:
- Pre každú appku: každý tier musí odkazovať na existujúcu recovery group.
- Pre IBM Power appku navyše:
  - VM provider skupiny (`provider_id_vm`) musí byť typu `IBM_POWER`,
  - každý názov LPAR musí zodpovedať `^[A-Za-z0-9][A-Za-z0-9._-]{0,46}$`.
- Pre VMware BE typ skupiny nekontroluje. Zodpovedajúce pravidlo je len na FE.

**FE pred zmenou**

| Oblasť | Stav |
|---|---|
| `RA/components/RecoveryAppBuilder.tsx` | `availableGroups` filtruje iba `sourceCategory === 'backup_system_workload'`, takže pri IBM Power sú v ponuke aj VMware skupiny. Z `availableGroups` sa odvodzuje sidebar, mená, VM/LPAR možnosti aj priraďovanie. |
| `RA/components/AppMetadataForm.tsx` | Zdroj aj cieľ drží vo vlastnom stave. Zmena sa nedá vrátiť ani pri editácii zamknúť. |
| Editácia | Zdroj aj cieľ sa dajú zmeniť. Mapper hľadá providera v zozname, takže appka s už nedostupným providerom sa nedá uložiť. |
| Validácia | Nekontroluje typ skupín ani názvy LPAR. |

**Recovery Group editor (vzor uzamknutia)**

`RecoveryGroupTypeStep` / `RecoveryGroupTopologyStep`:
- prvok je `disabled` pri `isEditing`/`readOnly`,
- handler zmenu ignoruje (`if (!readOnly)`).

## Rozhodnutia

1. **Platforma skupín.** Typ zdroja určuje povolený `workloadType`:
   - `VMWARE` → `vmware_virtual_machines`,
   - `IBM_POWER` → `ibm_power_virtual_machines`,
   - čokoľvek iné → žiadne skupiny.
   - Skupina s `workloadType = null` (neurčený provider) nie je kompatibilná.
   - Pri editácii sa typ berie z uloženého `application.platform` (nie z providera, ktorý už nemusí existovať).
2. **Zmena zdroja pri vytváraní.**
   - Ak je v tieroch priradená aspoň jedna skupina, zobrazí sa `ConfirmDialog`.
   - Potvrdenie odpojí skupiny zo všetkých tierov (s nimi aj vybrané VM/LPAR) a zachová id, popis aj poradie tierov.
   - Zrušenie nezmení nič.
   - Zmena iba cieľa skupiny nemaže.
   - `AppMetadataForm` bude mať zdroj aj cieľ riadené cez props, aby zrušenie vrátilo hodnotu v selecte.
3. **Uzamknutie pri editácii.**
   - Editor zamkne providerov každej uloženej appky (režim Edit určuje editor, nie prítomnosť provider id).
   - Selecty sú `disabled` a ukazujú meno providera (alebo „unavailable“ s id, ak už neexistuje).
   - Builder zmenu providera ignoruje.
   - Mapper pošle pôvodné `platform`, `source_provider_id` a `target_provider_id` bez nového odvodenia z formulára.
   - *Revidované (`bd62d73b`, `9ff7b650`):*
     - Zamyká sa každá uložená appka, aj legacy záznam bez provider id. Taký záznam ukáže upozornenie na starý kontrakt a Save je zablokované.
     - Save je zablokované aj vtedy, keď uložený provider chýba alebo už nezodpovedá BE `validate_app_providers` (typ, pri VMware aj rola).
     - Kým sa provideri načítavajú alebo ich načítanie zlyhalo, verdikt sa nevynáša: Save čaká a pri chybe sa ponúkne Retry.
     - `source_connection`/`target_connection` sa nemapujú.
4. **Validácia pred uložením.**
   - Každá priradená skupina musí byť v zozname recovery groups.
   - Jej `workloadType` musí zodpovedať platforme.
   - Pri IBM Power musí každý LPAR spĺňať BE regex.
   - Chyba sa zobrazí cez existujúci `alert(t(messageKey))` v `handleSave` a request sa nepošle.
   - Kým sa recovery groups načítavajú, Save je zablokované.

## Mimo scope

- Zmeny na BE.
- Mapovanie starých connection polí.
- Nový dizajn chybových hlásení.
