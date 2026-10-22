# TODO – Shared Policy Catalog

Stav: implementácia schválená pokynom `executing-plans inline`; T1–T7 vykonané a overené. Bez commitu a pushu podľa pokynov používateľa.
Kontrakt, stavová matica, analýza a inventár: [policy-catalog-plan.md](policy-catalog-plan.md).
Tracker pre túto úlohu: iba tento lokálny checklist podľa výslovnej požiadavky používateľa.

## T1 – Čistý model dostupnosti a referencií

**Popis:** Zaviesť päť source stavov, štyri reference stavy, typed lookup a súhrn Policy Set referencií podľa kontraktu v pláne.

**Akceptácia:**

- [x] `data !== undefined` odlíši cache vrátane `[]`; error bez dát nie je empty, cache s chybou nie je ready.
- [x] Missing vzniká iba po úspešnom výsledku; chybou neoveriteľné ID je unknown, prázdne ID notConfigured; lookup zachová druh aj generated typ.
- [x] Parametrizované unit testy pokryjú celú maticu, `isFetching/isRefreshing/isPaused`, paused/idle pending, kolíziu ID medzi druhmi a zmiešaný summary; zvlášť `unknown/cachedError` nikdy nesmie viesť k `resolved` summary.

**Súbory (2 nové, S):** `catalog/model/policyCatalog.ts`, `catalog/model/policyCatalog.test.ts` pod `src/features/recovery-plans/recovery-policies/`.
**Závislosti:** žiadne, až po schválení plánu.
**Overenie:** `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/catalog/model/policyCatalog.test.ts`; focused ESLint týchto dvoch súborov; `git diff --check`.

## T2 – Generated hooks adaptér a cache kompatibilita

**Popis:** Implementovať jeden `usePolicyCatalog`, ktorý spojí existujúce hooks/selectors s T1 a adresuje retry po druhu.

**Akceptácia:**

- [x] Hook používa pôvodné hooks/selectors bez vlastných keys, HTTP, providerov, cache zápisov, nových timing options alebo synchronizácie cez state/effect. Verejné API vracia iba odvodené UI signály `isFetching`, `isRefreshing`, `isPaused`; neexponuje raw TanStack `fetchStatus`, `isStale` ani `dataUpdatedAt`.
- [x] `retry(kind)` obnoví len daný zdroj, pri prebiehajúcom requeste ho nereštartuje; UI počas `isFetching/isPaused` zabráni opakovanému klikaniu. Chyba zostáva dostupná v príslušnom source stave.
- [x] Malé hook/fetch testy overia napojenie troch generated hooks/selectors, súbeh observerov so zdieľanou query identitou, cached refresh failure a cielený retry. **Netestovať znova raw response envelope, Zod output defaulty ani generated mutation invalidáciu**; patria existujúcej Orval/QueryClient vrstve.

**Súbory (2 nové, S):** `catalog/hooks/usePolicyCatalog.ts`, `catalog/hooks/usePolicyCatalog.test.tsx` pod rovnakým feature adresárom.
**Závislosti:** T1.
**Overenie:** `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/catalog/hooks/usePolicyCatalog.test.tsx`; focused ESLint oboch súborov; `git diff --check`.

### Checkpoint po T1–T2

- [x] Source/reference matica vrátane zmiešaných `unknown/cachedError` prípadov má dôkazy v unit testoch; hook integračný seam potvrdí zdieľané query identity a cielené retry, nie internú implementáciu Orvalu.
- [x] Inline review kontraktu: žiadne raw queries vo verejnom API, duplikovaná API schéma, nový cache owner či príliš všeobecný framework.

## T3 – Texty stavov pre tri jazyky

**Popis:** Doplniť len chýbajúce texty pre per-kind loading/error/cachedError, missing/unknown a dostupne pomenované retry.

**Akceptácia:**

- [x] EN/SK/CS rozlišuje nenájdenú referenciu, neoveriteľnú dostupnosť a chybu aktualizácie; text netvrdí vymazanie entity ani aktuálnosť cached dát.
- [x] Existujúce použiteľné kľúče sa znovu použijú; nový locale test overí neprázdnosť a kompatibilné placeholders všetkých nových kľúčov.

**Súbory (4, M):** `src/locales/en.json`, `sk.json`, `cs.json`, nový `src/locales/policyCatalogTranslations.test.ts`.
**Závislosti:** sémantika T1; možno pripraviť nezávisle od T2, v tomto workflow vykonať postupne.
**Overenie:** `node node_modules/vitest/vitest.mjs run src/locales/policyCatalogTranslations.test.ts`; Node `JSON.parse` všetkých troch súborov; focused ESLint testu; `git diff --check`.

## T4 – Modal a Form zachovajú draft aj pri nedostupnosti

**Popis:** Prepojiť modal na Catalog a zjednotiť prezentáciu troch druhov vo formulári.

**Akceptácia:**

- [x] Snapshot prvý loading/error už nevykreslí empty; všetky tri druhy zobrazia cached options aj s upozornením a vlastným retry.
- [x] Historické ID sa ukáže pri missing/unknown aj pri prázdnych options; nezmaže sa a nepridá sa validačný zákaz uloženia.
- [x] Existujúce exact payload, create/edit prefill, ID lock a required testy zostanú; doplnený component prípad overí, že retry nezresetuje draft ani dirty guard.

**Súbory (3, M):** `src/features/recovery-plans/policy-sets/components/PolicySetModal.tsx`, `PolicySetForm.tsx`, `PolicySetModal.test.tsx`.
**Závislosti:** T2, T3.
**Overenie:** `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx`; focused ESLint týchto troch súborov; `git diff --check`.

### Checkpoint po T3–T4

- [x] Create/edit používa pôvodné payloady a guard; zlyhanie jedného zdroja neskryje cached options ostatných.
- [x] Review prvého UI rezu oproti stavovej matici; žiadna nová politika ukladania alebo automatické čistenie referencií.

## T5 – Rozlíšenie referencií v detaile tabuľky

**Popis:** Nahradiť tri query/data fallbacky Catalogom bez nových stavov tabuľkových riadkov.

**Akceptácia:**

- [x] Detail zachová resolved názov alebo uložené ID, rozlíši missing/unknown a ukáže príslušný retry pri chybe zdroja.
- [x] Cached meno zostane viditeľné s informáciou o chybe refreshu; prázdna referencia ostane bez hodnoty.
- [x] Počet policies počíta nastavené ID, JSON/delete/edit a list error/retry zostanú oddelené; testy overia odlišnú zodpovednosť detailu bez kopírovania celej unit matice.

**Súbory (2, S):** `src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx`, `PolicySetsTable.test.tsx`.
**Závislosti:** T2, T3.
**Overenie:** `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`; focused ESLint oboch súborov; `git diff --check`.

## T6 – Picker so stavom a retry podľa druhu policy

**Popis:** Nahradiť lokálne mapy a OR stavy spoločným resolution; zachovať existujúci list/detail layout aj verejné props.

**Akceptácia:**

- [x] Details pomenúva konkrétny problémový druh a retry; úspešné/cached karty zostávajú, missing a unknown sú odlíšené.
- [x] List hľadá rovnako podľa názvu/opisu setu a resolved recovery názvu; cached recovery názov zostane použiteľný, neznámy má ID fallback pri zobrazení.
- [x] Výber setu, `aria-pressed`, layout a builder props sa nemenia; component testy pokryjú partial failure, retry intent a zachovanie vyhľadávania/výberu bez opakovania doménovej matice.

**Súbory (5, M):** `src/shared/components/policy-set-picker/PolicySetPicker.tsx`, `PolicySetPickerList.tsx`, `PolicySetPickerDetails.tsx`, `PolicySetPicker.test.tsx` a `src/features/recovery-plans/recovery-groups/prototype/TopologyPreview.tsx` (iba napojenie priameho odberateľa props odhalené TypeScriptom).
**Závislosti:** T2, T3.
**Overenie:** `node node_modules/vitest/vitest.mjs run src/shared/components/policy-set-picker/PolicySetPicker.test.tsx`; focused ESLint štyroch súborov; `git diff --check`; vizuálny smoke dlhých hlášok a retry na úzkej šírke, bez živého backendu.

### Checkpoint po T5–T6

- [x] Všetky tri kontajnery používajú rovnaké doménové pravidlá a zachovajú historické ID; UI obsahuje iba prezentáciu a interakcie.
- [x] Review diffu potvrdí odstránenie pôvodných lookup/state duplicít bez úprav generated vrstvy, cache policy a nesúvisiacich funkcionalít.

## T7 – Finálne overenie kontraktu a regresií

**Popis:** Overiť integrovanú zmenu po dokončení rezov; nezavádzať nové produkčné súbory.

**Akceptácia:**

- [x] TypeScript, focused ESLint, 6 Catalog/UI/locale test súborov, 4 existujúce regresné súbory, `git diff --check` pre tracked zmeny a samostatná whitespace/final-newline kontrola nových untracked súborov prejdú; žiadna celá suite ani produkčný build.
- [x] Review potvrdí inventár 18 súborov (5 nových, 13 existujúcich), žiadne nové dependencies, suppressions, oslabovanie assertions, cache keys alebo zmeny payloadov; verejné Catalog API nepreteká internými TanStack metadátami.
- [x] Zdokumentované skutočne spustené príkazy a limity; zmenu odovzdať na review bez pushu. Tento plán sám žiadnu implementáciu ani commit nepovoľuje.

**Súbory:** žiadne nové produkčné; ak overenie odhalí potrebnú opravu, priradiť ju k T1–T6 a zopakovať príslušný focused scope.
**Závislosti:** T1–T6.

**TypeScript:**

```powershell
npm.cmd run typecheck
```

**Focused Vitest (nové/upravené testy):**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/catalog/model/policyCatalog.test.ts src/features/recovery-plans/recovery-policies/catalog/hooks/usePolicyCatalog.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx src/shared/components/policy-set-picker/PolicySetPicker.test.tsx src/locales/policyCatalogTranslations.test.ts
```

**Existujúce regresie iba spustiť (bez plánovanej úpravy):**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx src/features/recovery-plans/policy-sets/pages/PolicySetsRefetch.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx
```

**Focused ESLint (15 TS/TSX súborov):**

```powershell
node node_modules/eslint/bin/eslint.js src/features/recovery-plans/recovery-policies/catalog/model/policyCatalog.ts src/features/recovery-plans/recovery-policies/catalog/model/policyCatalog.test.ts src/features/recovery-plans/recovery-policies/catalog/hooks/usePolicyCatalog.ts src/features/recovery-plans/recovery-policies/catalog/hooks/usePolicyCatalog.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetModal.tsx src/features/recovery-plans/policy-sets/components/PolicySetForm.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx src/shared/components/policy-set-picker/PolicySetPicker.tsx src/shared/components/policy-set-picker/PolicySetPickerList.tsx src/shared/components/policy-set-picker/PolicySetPickerDetails.tsx src/shared/components/policy-set-picker/PolicySetPicker.test.tsx src/locales/policyCatalogTranslations.test.ts src/features/recovery-plans/recovery-groups/prototype/TopologyPreview.tsx --max-warnings 0
```

**JSON a Git:**

```powershell
node --input-type=module -e 'import fs from "node:fs"; for (const locale of ["en", "sk", "cs"]) JSON.parse(fs.readFileSync("src/locales/" + locale + ".json", "utf8"));'
git diff --check
git diff --stat
git status --short
```

`git diff --check` **nekontroluje untracked súbory**. Nasledujúci read-only checker preto preverí dve plánovacie `.md` a všetkých päť nových súborov podľa inventára (aj keď ešte nie sú pridané do indexu); nevyžaduje `git add`, nezmení index ani cudzie súbory:

```powershell
node --input-type=module -e 'import fs from "node:fs"; const root = "src/features/recovery-plans/recovery-policies/catalog/"; const files = ["tasks/policy-catalog-plan.md", "tasks/policy-catalog-todo.md", root + "model/policyCatalog.ts", root + "model/policyCatalog.test.ts", root + "hooks/usePolicyCatalog.ts", root + "hooks/usePolicyCatalog.test.tsx", "src/locales/policyCatalogTranslations.test.ts"]; for (const p of files.filter(fs.existsSync)) { const s = fs.readFileSync(p, "utf8"); const bad = s.split(/\r?\n/).flatMap((line, i) => /[ \t]+$/.test(line) ? [i + 1] : []); if (bad.length || !s.endsWith("\n")) { console.error(p, "trailing whitespace lines:", bad, "final newline:", s.endsWith("\n")); process.exitCode = 1; } }'
```

### Finálny checkpoint

- [x] Všetkých desať scenárov z plánu má pokrytie na určenej vrstve, bez duplicitnej integračnej matice pre každý komponent alebo opakovania Orval kontraktových testov.
- [x] Žiadne neautorizované rozšírenie scope; review používateľa pred ďalšími krokmi podľa následného zadania.
