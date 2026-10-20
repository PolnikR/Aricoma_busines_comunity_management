# Úlohy: Recovery Group eligibility pre Recovery Applications

Dátum: 2026-10-20. Stav: návrh na schválenie. Plán: [plan.md](plan.md).
Žiadna implementácia, commit ani push nie sú vykonané. Predchádzajúci checklist Overview bol dokončený.

## T0: Schválenie a baseline

**Popis:** Schváliť plán a pred realizáciou znovu skontrolovať stav dotknutých súborov a call sites validátora.
**Akceptácia:**
- [x] Používateľ schválil plán.
- [x] Zaznamenané existujúce worktree zmeny; prototypy ani cudzie úpravy sa nemenia.
- [x] Potvrdená cesta Builder → validátor s úplným groups.
**Overenie:** `git status --short`, focused kontrola call sites a diffu. **Závislosti:** žiadne. **Rozsah:** XS, bez implementačných zmien.

## T1: Spoločné eligibility pravidlo

**Popis:** Pridať malý helper do existujúceho platformového utility a testy pravidla aj existujúceho mapovania.
**Súbory:** `recovery-applications/utils/recoveryGroupPlatform.ts`, jeho `.test.ts`, `recovery-groups/helpers/mapRecoveryGroups.test.ts` (všetky pod `src/features/recovery-plans/`).
**Akceptácia:**
- [x] Pôvodná kompatibilita je nezmenená; helper navyše vyžaduje striktne true a neprázdny string run ID.
- [x] Celá matica z plánu vrátane whitespace a oboch platforiem prejde.
- [x] Mapper test dokazuje false + zachované ID aj null → undefined; produkčný mapper/model sa nemení.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-applications/utils/recoveryGroupPlatform.test.ts src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts`.
**Závislosti:** T0. **Rozsah:** M, 3 súbory.

## T2: Blokovanie neplatného uloženia

**Popis:** Rozšíriť Pick existujúcej validácie a použiť eligibility helper po missing/platform kontrolách. Zachovať existujúce poradie ostatných kontrol a alert mechanizmus.
**Súbory:** `src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.ts`, jeho `.test.ts`, `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`.
**Akceptácia:**
- [x] Matica platí pre nové aj locked aplikácie a nezávisí od push flagu aplikácie.
- [x] Chyba obsahuje tier/skupinu a validátor nemení vstupné tiers ani VM metadata.
- [x] Nový preklad existuje v EN/SK/CS, vysvetľuje publikovanie aj integritu ID; pôvodné missing/platform/LPAR chyby zostali.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.test.ts`; JSON assertion z plánu.
**Závislosti:** T1. **Rozsah:** M, 5 súborov.

## Kontrolný bod A

- [x] Helper, mapper a validátor testy prešli; rovnaké pravidlo sa používa bez duplicity.
- [x] Neboli pridané modelové polia, API zmeny ani kontrola snapshotov či DAG statusov.

## T3: Ponuka Buildera bez straty konfigurácie

**Popis:** Oddeliť kompatibilné skupiny pre VM dáta od eligible skupín pre sidebar a add handler. Zachovať úplný groups vstup validátora a form state existujúcich tiers.
**Súbory:** `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`, jeho `.test.tsx`.
**Akceptácia:**
- [x] Sidebar aj add/drop callback odmietajú neeligible skupiny; platformový výber ostáva rovnaký.
- [x] Existujúca nepublikovaná skupina zostane v tieri, Save zobrazí chybu a onSave sa nevolá.
- [x] Zmena true → false po refetchi nestratí VM výber, metadata ani tier konfiguráciu; po platnom republish/refetchi je uloženie opäť možné bez resetu.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`; testy zachovajú rozdiel medzi ID a názvom skupiny a nepovažujú mock canvas za dôkaz reálneho vykreslenia.
**Závislosti:** T1, T2, kontrolný bod A. **Rozsah:** S, 2 súbory.

## T4: Focused regresia a manuálne overenie

**Popis:** Overiť kombinovaný tok, lokalizácie a rozsah diffu. BE odporúčanie evidovať samostatne; BE nemeníme.
**Súbory:** bez ďalších plánovaných produkčných zmien; výsledky zaznamenať do tohto checklistu.
**Akceptácia:**
- [x] Štyri focused test súbory, focused ESLint, JSON assertion a diff check prešli.
- [x] Reálny Builder s TierCanvas/TierCard zachová konfiguráciu pri editácii aj rollback/refetchi; manuálne overené VMware a IBM Power, vrátane aplikácie bez vlastného pushu.
- [x] Diff obsahuje iba plánovaných 10 implementačných/test súborov a príslušnú evidenciu; BE, generated kód a nesúvisiace zmeny sú nedotknuté.
**Overenie:** presné príkazy v sekcii 7 plánu; manuálne create/edit, odmietnutie Save, obnovenie dát. Full suite/build len pri explicitnom dôvode alebo pokyne; nespustenie uviesť v reporte.
**Závislosti:** T3. **Rozsah:** S, overenie.

## Kontrolný bod B: Definition of Done

- [x] Splnené všetky akceptačné kritériá v pláne.
- [x] Review nepotvrdil tiché odstraňovanie, odvodenie publikovania iba z run ID alebo zmenu kompatibility.
- [x] Explicitne uvedená zostávajúca BE medzera a obmedzenie cached dát; FE úspech sa nevydáva za serverovú garanciu.
- [x] Výsledky testov a prípadné blokované manuálne kroky sú pravdivo zaznamenané.

## Overenie plánovacieho výstupu

Plán je pripravený, implementácia čaká na schválenie. Kontrola dokumentov neznamená úspech budúcich implementačných testov. Zákaz commitu a pushu zostáva v platnosti.
