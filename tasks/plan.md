# Implementačný plán: Recovery Group eligibility pre Recovery Applications

Dátum: 2026-10-20. Stav: návrh na schválenie, bez implementácie.
Checklist: [todo.md](todo.md). Tento plán nahrádza dokončený plán Overview; jeho história zostáva v Gite.

## Cieľ a hranice

Recovery Group možno priradiť a uložiť v Recovery Application iba pri splnení všetkých podmienok: existujúca platformová kompatibilita, `pushToOrchestrator === true`, `airflowRunId` je neprázdny reťazec. Predpoklad: whitespace-only ID je neplatné (`trim().length > 0`); uloženú hodnotu ID nemeníme. Pravidlo platí aj pri ukladaní aplikácie bez jej vlastného pushu do Airflow.

Existujúce priradenia, VM metadata, výber VM, poradie a nastavenia tiers sa pri načítaní alebo obnovení zoznamu nesmú automaticky odstraňovať ani prepisovať. Neplatné priradenie zastaví uloženie s vysvetlením. Žiadne nové endpointy, modelové polia, OpenAPI zmeny, kontroly snapshotov, DAG statusov alebo dostupnosti Airflow. Backend sa nemení.

## 1. Analýza aktuálneho stavu

Odkazy sú relatívne k tomuto dokumentu; uvedené riadky zodpovedajú analyzovanému stavu.

| Oblasť | Existujúci kód a zistenie |
| --- | --- |
| Platformová kompatibilita | [recoveryGroupPlatform.ts](../src/features/recovery-plans/recovery-applications/utils/recoveryGroupPlatform.ts), riadky 11–19: `isRecoveryGroupCompatible` vyžaduje backup workload a platformovo zodpovedajúci `workloadType`; platformu normalizuje na uppercase. Túto funkciu nemeníme. |
| Builder – ponuka | [RecoveryAppBuilder.tsx](../src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx), 119–145: platforma pochádza z locked providers alebo vybraného providera. `availableGroups` filtruje iba kompatibilitu; používa sa pre sidebar, labely aj VM možnosti. |
| Priradenie a VM metadata | Builder, 180–205 a 219–243: pridanie hľadá skupinu v `availableGroups`; rovnaký zoznam sa používa pri doplnení VM metadát. Nový filter preto nesmie zúžiť zdroj dát pre už uloženú konfiguráciu. |
| Existujúce tiers | Builder, 51–58 a 139–141: inicializácia klonuje tiers, canvas dostáva form state, nie filtrované tiers. [TierCard.tsx](../src/features/recovery-plans/recovery-applications/components/TierCard.tsx), 110–111: zoznam VM zahŕňa aj už vybrané VM. Automatické čistenie priradení netreba pridávať. |
| Uloženie | Builder, 318–333: čaká na prvé načítanie skupín a volá validátor s úplným `groups`; pri chybe zobrazí preložený alert a nevolá `onSave`. Toto je minimálne vhodné miesto na blokovanie. |
| Validátor | [validateRecoveryApplication.ts](../src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.ts), 47–56 a 135–164: aktuálny zoznam má zúžený `Pick` bez orchestration polí. Kontroluje chýbajúcu skupinu, platformu a IBM Power LPAR názvy; publikovanie nekontroluje. `groups` je voliteľné, jediný produkčný volajúci Builder ho už odovzdáva. |
| FE typy | [recoveryGroupTypes.ts](../src/features/recovery-plans/recovery-groups/model/recoveryGroupTypes.ts), 79–84: existujú `airflowRunId?: string | null` a `pushToOrchestrator?: boolean`. Nové polia ani rozšírenie typu o `null` pre pushed netreba. |
| Mapper | [mapRecoveryGroups.ts](../src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.ts), 86–101: `airflowRunId = record.orchestration?.run_id`, `pushToOrchestrator = record.orchestration?.pushed ?? undefined`. `false` zostáva `false`, `null` sa normalizuje na undefined. Mapper je už správny. `status: Active` neznamená publikovanie. |
| Načítanie | [useRecoveryGroups.ts](../src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.ts), 26–29 a 146–151: Builder dostáva mapované záznamy, stav načítania, chybu a refresh. Netreba nový request ani hook. |
| Existujúce testy | [recoveryGroupPlatform.test.ts](../src/features/recovery-plans/recovery-applications/utils/recoveryGroupPlatform.test.ts): platformy, case-insensitivity a nepodporované platformy. [validateRecoveryApplication.test.ts](../src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.test.ts), od 117: aktuálne/stored skupiny a LPAR validácia. [RecoveryAppBuilder.test.tsx](../src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx), od 244 a 269: filtrovanie, locked platforma, uloženie existujúcich skupín. Ich platné fixtures dnes často nemajú orchestration polia. |
| Testy mapovania | [mapRecoveryGroups.test.ts](../src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts), od 370: prenášanie run ID a pushed flagu je už testované; doplniť explicitný rollback prípad false + zachované ID a nullable vstupy. |

Samostatné pozorovanie mimo rozsahu: [TierCanvas.tsx](../src/features/recovery-plans/recovery-applications/components/TierCanvas.tsx), 118–123, vyhľadáva VM options podľa názvu skupiny, kým Builder ich kľúčuje ID. Existujúci nesúlad neopravovať v tejto úlohe; testy zachovania uložených VM musia používať aj odlišné ID a názov.

## 2. Minimálny návrh a presný zoznam zmien

Preferované riešenie: jedna malá čistá funkcia `isRecoveryGroupEligible` v existujúcom `recoveryGroupPlatform.ts`, žiadny nový modul ani framework. Kombinuje nezmenené `isRecoveryGroupCompatible(group, platform)` s `group.pushToOrchestrator === true`, kontrolou typu ID a `group.airflowRunId.trim().length > 0`.

| Súbor | Potrebná zmena a dôvod |
| --- | --- |
| `src/features/recovery-plans/recovery-applications/utils/recoveryGroupPlatform.ts` | Pridať spoločný eligibility helper s úzkym `Pick` existujúcich polí. Zamedzí rozdielnemu pravidlu medzi ponukou a ukladaním. Kompatibilitu nemení. |
| `src/features/recovery-plans/recovery-applications/utils/recoveryGroupPlatform.test.ts` | Pridať maticu eligibility, zachovať pôvodné platformové testy. |
| `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx` | Oddeliť `compatibleGroups` (dnešný platformový filter pre VM options a lookup metadát) od `availableGroups` (eligibility pre sidebar a pridávanie). Žiadne nové state/effect, iba odvodené zoznamy. Priradené tiers ostávajú vo form state. |
| `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx` | Doplniť publikované fixtures, test ponuky a odmietnutia pri pridaní; editáciu a zmenu pushed po refetchi, vrátane zachovania konfigurácie. |
| `src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.ts` | Rozšíriť existujúci `Pick` o `pushToOrchestrator` a `airflowRunId`. Po existujúcich missing/platform kontrolách použiť spoločný helper a vrátiť chybu s tierom a skupinou. Kontrolovať úplné aktuálne groups, nie sidebar ani orchestration uložené v tieri. |
| `src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.test.ts` | Matica pravidla pri ukladaní, editácia, nezmenený vstup po chybe; platné fixtures doplniť explicitne, bez globálneho mockovania helpera. |
| `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json` | Jeden nový kľúč `recovery.application.validation.recoveryGroupNotPublished` s parametrami `group`, `tier`. Text musí pokryť aj true + chýbajúce ID: skupina nie je pripravená na použitie, vyžaduje publikovanie a platný run ID; znovu ju publikovať a obnoviť zoznam alebo ju vedome nahradiť. |
| `src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts` | Regresia false + platné ID, null/absent pushed a null/empty run ID cez existujúcu schema/mapper cestu. Bez zmeny mappera. |

Celkom 10 existujúcich súborov implementácie a testov, žiadny nový produkčný súbor. Model, mapper, hook, TierCanvas/TierCard, editor page, generated súbory a BE zostávajú bez úprav.

Validátor môže zachovať svoj existujúci voliteľný parameter `groups`, keďže všetky produkčné uloženia idú cez Builder, ktorý ho odovzdáva. Pri implementácii znovu overiť call sites. Novú validáciu nepodmieňovať `formState.pushToOrchestrator`: ide o publikovanie skupiny, nie aplikácie.

Pri editácii sa neplatná skupina naďalej zobrazí s uloženými VM a metadátami. Pokus o uloženie použije dnešný alert mechanizmus a skončí pred `onSave`. Netreba nový varovný framework ani ďalší validátor. Oprava je vedomé nahradenie/odstránenie priradenia alebo znovupublikovanie skupiny a obnovenie dát; samotné obnovenie nesmie prepísať tier.

## 3. Postup a závislosti

Podrobný checklist a akceptačné kritériá jednotlivých krokov sú v [todo.md](todo.md).

1. T1: spoločné eligibility pravidlo a testy + regresné testy mappera (3 súbory, bez závislosti).
2. T2: save validácia a preklady (5 súborov, závisí od T1).
3. Kontrolný bod A: focused unit testy, zhodné pravidlo pre oba platformové typy, lokalizované chyby.
4. T3: filtrovanie Buildera bez straty existujúcej konfigurácie + komponentové testy (2 súbory, závisí od T1 a T2).
5. T4: spoločné focused overenie a manuálna editácia; bez ďalších plánovaných produkčných súborov.
6. Kontrolný bod B: akceptačné kritériá a review diffu. Implementácia začne až po schválení tohto plánu; aktuálne bez commitu a pushu.

## 4. Testovacia matica

Maticu testovať v helperi aj vo validátore, pre VMware a IBM Power s inak platným formulárom.

| Kompatibilita | pushed na API / FE | run ID | Výsledok |
| --- | --- | --- | --- |
| Áno | true | platný neprázdny string | Povolená |
| Áno | false | platné zachované ID | Zamietnutá; zásadná rollback regresia |
| Áno | true | null | Zamietnutá |
| Áno | true | prázdny string | Zamietnutá |
| Áno | null / undefined → undefined | platné ID | Zamietnutá |
| Nie | true | platné ID | Zamietnutá pôvodnou platformovou kontrolou |
| Áno | true | undefined alebo iba whitespace | Zamietnutá |

Doplňujúce scenáre:

- Existujúca aplikácia s nepovolenou skupinou: skupina, VM výber, metadata, order a tier description zostanú zachované; Save zobrazí konkrétny tier/skupinu a `onSave` sa nevolá.
- Platná skupina po obnovení dát zmení pushed na false, ale ID ostane: zmizne z ponuky, zostane v tieri a ďalší Save je odmietnutý.
- Znovupublikovanie + obnovenie platných dát: Save prejde s pôvodnou konfiguráciou, bez resetu formulára.
- Neplatné ID skupiny poslané priamo do add/drop callbacku sa nepriradí, aj keby obišlo sidebar.
- Pravidlo platí pre nový formulár aj locked editáciu, pri zapnutom aj vypnutom pushi samotnej aplikácie.
- Zachovať regresie pre platform mismatch, chýbajúcu skupinu, nezistenú platformu, storage group a IBM Power LPAR názvy.
- Zachovať zdrojový provider confirmation flow a zmenu target providera bez odstránenia skupín.
- Overiť editáciu cez skutočný TierCanvas/TierCard pri manuálnom teste, pretože Builder testy používajú mockované podkomponenty.

## 5. Backend: zistená medzera a samostatné odporúčanie

Overený bol lokálny checkout `../../abco-be`; toto nepotvrdzuje verziu nasadeného backendu. CodeGraph CLI pre BE nenašiel použiteľný index, preto sa BE čítal priamo. Backend nebol upravený ani spustený.

- [recovery/recovery.py](../../abco-be/recovery/recovery.py), 89–129: `validate_recovery_app` kontroluje existenciu skupín, IBM Power provider/LPAR pravidlá a policy set. Nekontroluje `orchestration.pushed` ani neprázdny run ID.
- Ten istý súbor, 152–167: `attach_recovery_group_run_uuids` iba kopíruje ID zo záznamu skupiny; neoveruje publikovanie.
- [api/routers/recovery_apps.py](../../abco-be/api/routers/recovery_apps.py), 90–106 a 154–183: `/submit_recovery_dag` vykoná validáciu pred upsertom; rovnaká cesta obsluhuje uloženie aj push. Chýbajúca kontrola preto ovplyvňuje oba režimy.
- [api/routers/recovery_groups.py](../../abco-be/api/routers/recovery_groups.py), 265: rollback zachová orchestration a prepíše pushed na false, takže run ID môže zostať.
- Navyše BE kontrola platformy priradenej skupiny je v `validate_recovery_app` explicitná pre IBM Power, nie symetrická VMware kontrola ako na FE. Ide o samostatnú existujúcu odchýlku; nemení tento FE scope.

Odporúčanie pre samostatnú BE úlohu: v existujúcom `validate_recovery_app` nad serverovým záznamom každej skupiny overiť `pushed is True` a string run ID s neprázdnym trimom, bez ohľadu na push flag aplikácie. Odmietnuť pred perzistenciou a Airflow operáciami, s identifikátorom skupiny a tieru cez existujúcu HTTP 400 cestu. Pridať testy create/update aj publish, hlavne false + zachované ID a overenie, že pri chybe neprebehne upsert ani push. Bez nového endpointu či schémy. Platformovú paritu riešiť ako osobitné rozhodnutie BE vlastníka.

## 6. Riziká a opatrenia

| Riziko | Opatrenie |
| --- | --- |
| Historické skupiny nemajú orchestration údaje | Zámerne zamietnuť; jasná chyba, žiadne odvodzovanie z Active/status či run ID. |
| Nový filter zúži aj VM možnosti/metadáta | Oddeliť kompatibilné dáta pre existujúce tiers od zoznamu pre nové priradenie; nemeniť form state pri refetchi. |
| Staré test fixtures sa stanú neplatnými | Platné prípady označiť explicitne true + ID; negatívne prípady ponechať konkrétne. |
| Chyba maskovaná skoršou formulárovou validáciou | Matica používa kompletný platný formulár, providerov a policy, s jedinou menenou podmienkou. |
| FE cache alebo súbežný rollback po načítaní | FE validuje posledné dostupné dáta. Bez BE kontroly nie je možné garantovať stav v čase uloženia; samostatné BE odporúčanie je potrebné aj proti priamemu API volaniu. Nepridávať polling ani Airflow requesty. |
| Fetch error so stale dátami | Dnešné správanie načítania nemeníme; nemožno tvrdiť, že cached dáta sú aktuálna serverová garancia. Error UI/refresh ostávajú zachované. |
| Nesúvisiace rozpracované zmeny | Nezasahovať do prototypov ani iných worktree zmien, žiadne auto-fixy alebo globálne preformátovanie. |

## 7. Overenie a Definition of Done

Po implementácii spustiť iba dotknuté testy:

```powershell
npm.cmd exec vitest run src/features/recovery-plans/recovery-applications/utils/recoveryGroupPlatform.test.ts src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.test.ts src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts
npm.cmd exec eslint -- src/features/recovery-plans/recovery-applications/utils/recoveryGroupPlatform.ts src/features/recovery-plans/recovery-applications/utils/recoveryGroupPlatform.test.ts src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.ts src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.test.ts src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts --max-warnings 0
node -e 'const fs=require("node:fs"); for(const lang of ["en","sk","cs"]){ const d=JSON.parse(fs.readFileSync("src/locales/"+lang+".json","utf8")); const v=d["recovery.application.validation.recoveryGroupNotPublished"]; if(typeof v!=="string" || !v.includes("{{group}}") || !v.includes("{{tier}}")) throw Error(lang); }'
git diff --check
```

Plný suite ani production build sa štandardne nespúšťajú. Ak vznikne konkrétna typová neistota po zmene Pick kontraktu, použiť existujúci `npm.cmd run typecheck` a zaznamenať dôvod; nepoužiť `npm run build`, ktorý zahŕňa celý suite.

Akceptačné kritériá:

- Sidebar a pridanie povolia presne kompatibilné skupiny s pushed true a platným run ID.
- Save použije rovnaké pravidlo pre všetky priradené tiers, vrátane editácie a aplikácie bez vlastného pushu.
- False + zachované ID nikdy neprejde; null/undefined pushed sa nepovažuje za publikovanie.
- Neplatné uloženie zobrazí lokalizovanú chybu a nevolá onSave; existing konfigurácia zostane zachovaná.
- Platformová kompatibilita, LPAR validácia a provider flow sú bez regresie.
- Mapper a model ostanú bez produkčnej zmeny; nepribudne stav, endpoint ani OpenAPI zmena.
- Focused testy, lint, JSON assertion a diff check prejdú; manuálne sa overí create/edit pre obe platformy a rollback/refetch scenár.
- Report jasne oddelí FE výsledok od nevyriešenej BE medzery a uvedie nespustený full suite/build.

Aktuálna fáza: iba uloženie plánu a checklistu. Implementačné testy ani build neboli spustené. Bez implementácie, automatických opráv, commitu a pushu; čaká sa na schválenie.
