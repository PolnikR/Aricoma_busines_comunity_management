# Úlohy: VMware Live Refresh a provider invalidácia

Dátum: 2026-10-22. Plán: [plan.md](plan.md).
Stav: plán schválený pokynom používateľa „načítaj, vykonaj inline“. T1–T4 a oba checkpointy dokončené a overené; zmeny ponechané inline na pôvodnej vetve. Bez commitu a pushu podľa zadania. Nahradenie dokončeného WWPN plánu povolil používateľ.

## T1: Guard platnosti oneskoreného refreshu

**Popis:** Zaviesť minimálny QueryClient-scoped revision helper a napojiť ho na spoločnú úspešnú infra provider/credential invalidáciu a VMware snapshot. Credential vetva musí byť pokrytá už teraz, aby neskorší krok nepridával druhú cestu invalidácie.

**Akceptačné kritériá:**
- [x] Existujúci delete-provider regresný test prejde bez zmeny jeho assertion a všetkých pôvodných 20 hook testov ostane zelených.
- [x] Shared helper izoluje QueryClient aj ID, umožní legitímny refresh po bump/recreate a odmietne starý snapshot. Token je hodnotová kópia `Readonly<{ providerRevision: number; infraEpoch: number }>` pre neprázdne provider ID; validácia porovná obe čísla, takže zmena **ktorejkoľvek** hodnoty token zneplatní. Úplný credential scope zvýši ID revision, fallback infra epoch, platform scope infra neovplyvní.
- [x] Bump nastane pred prvým await invalidácie, aj ak query už neexistuje; test s pozastaveným cancellation preukáže odmietnutie starej odpovede počas tohto okna. Neúspešné mutations revisions nemenia.
- [x] Bez `providerId` `forceRefresh()` odmietne Promise s jasnou chybou ešte pred mutation/requestom; nevykoná HTTP ani zápis do cache, zatiaľ čo disabled `useQuery` správanie zostane nezmenené. Pôvodné úspešné requesty zachovajú pending/error settle.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`
- [x] Skontrolovať diff: žiadne generated/key/backend zmeny, bez druhej cache; zachované settle/pending/error správanie.

**Závislosti:** Schválený plán; pred začiatkom nový git status.
**Súbory (5, medium):**
- `src/shared/query/providerInventoryRevision.ts` (nový)
- `src/shared/query/providerInventoryRevision.test.ts` (nový)
- `src/shared/query/providerMutationInvalidation.ts`
- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`
- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts`

## T2: Provider lifecycle a izolácia klientov

**Popis:** Doplniť deterministické integračné scenáre cez generated options, ktoré preveria ochranu mimo samotného delete prípadu. Existujúci hook test súbor obsahuje cudziu dodanú reprodukciu; zachovať ju.

**Akceptačné kritériá:**
- [x] Update A počas refresh A zachová novšie inventory; update B ani platform providera s rovnakým ID neblokuje refresh A.
- [x] Delete a submit rovnakého ID odmietne starý výsledok, ale nový legitímny refresh sa zapíše; zdokumentovaná hranica mock testu voči backend reuse kontraktu.
- [x] Viac hook inštancií rovnakého klienta zdieľa lifecycle invalidáciu; dva klienty s rovnakým ID ostanú izolované. Normálny refresh a existujúci latest-request-wins prechádzajú.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx src/shared/query/providerMutationInvalidation.test.tsx`
- [x] Každý nový race test riadi odpoveď Promise a kontroluje cache až po dokončení starého requestu; bez sleep synchronizácie. Explicitne otestovať izoláciu providerRevision/infraEpoch, najmä samostatnú zmenu každého tokenového poľa a zachovanie druhého.

**Závislosti:** T1.
**Súbory (2, small):**
- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`
- `src/shared/query/providerMutationInvalidation.test.tsx`

## Checkpoint A: Provider lifecycle

- [x] T1–T2 zelené vrátane pôvodnej reprodukcie, update a recreate; zachované pôvodné testy.
- [x] Diff review potvrdí monotónnosť, oddelenie namespaces a synchronný bump bez nového race window.
- [x] Priebežný výsledok zaznamenať; zastaviť iba pri konkrétnom nevyriešenom kontrakte alebo chybe.

## T3: Credential zmeny a konzervatívny fallback

**Popis:** Rozšíriť delayed-response integráciu o obe credential mutation operácie a pôvodné pravidlá úplnosti provider mapovania.

**Akceptačné kritériá:**
- [x] Update aj delete credential ignorujú starý refresh dotknutého A; pri úplnom čerstvom zozname neovplyvnia B s inými credentials.
- [x] Chýbajúce, filtrované, stale alebo prázdne provider mapovanie zachová broad fallback vrátane refreshu, ktorého query bola odstránená pred credential úspechom.
- [x] Capture mapovania a bump prebehnú pred await/provider-list refetchom; failed credential mutation neblokuje platný refresh a pôvodné provider status/platform invalidation testy prechádzajú.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx src/shared/query/providerMutationInvalidation.test.tsx src/shared/query/providerInventoryRevision.test.ts`
- [x] Kontrola assertions na finálnej cache; neodvodzovať úspech iba od počtu callbackov.

**Závislosti:** T1–T2.
**Súbory (2, small):**
- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`
- `src/shared/query/providerMutationInvalidation.test.tsx`

## T4: Focused regresie a technické odovzdanie

**Popis:** Overiť dotknuté kontrakty a existujúcich používateľov bez zmeny ich produkčného kódu. Zapísať reálne výsledky, počty testov a limity.

**Akceptačné kritériá:**
- [x] Všetky požadované race scenáre a pôvodné relevantné testy prejdú; Resources/Recovery Groups používajú nezmenené keys a hook kontrakt.
- [x] Typecheck, focused ESLint, `git diff --check` pre tracked zmeny a **samostatná read-only whitespace/final-newline kontrola nových untracked súborov** prejdú alebo je prípadný preexistujúci blocker presne doložený bez oslabenia kontrol.
- [x] Report obsahuje root cause, zvolený mechanizmus, úplný zoznam vlastných zmien, presné príkazy/počty, regresie, limity (vrátane **nemožnosti rozpoznať externé zmeny bez lokálnej mutation**) a dôvod malej abstrakcie; žiadny commit/push ani zásah do cudzej práce.

**Overenie (plánované, nie výsledky):**
- [x] `node node_modules/vitest/vitest.mjs run src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx src/features/discovery-inventory/resources/model/inventoryQueries.test.ts src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/discovery-inventory/resources/pages/ResourcesPrefetch.integration.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx`
- [x] `npm run typecheck`
- [x] `node node_modules/eslint/bin/eslint.js src/shared/query/providerInventoryRevision.ts src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx --max-warnings 0`
- [x] `git diff --check` (iba tracked zmeny)
- [x] Read-only whitespace/final-newline kontrola nových súborov bez `git add` a bez zmeny indexu:

```powershell
$files=@('src/shared/query/providerInventoryRevision.ts','src/shared/query/providerInventoryRevision.test.ts')
foreach ($path in $files) {
  $text=[System.IO.File]::ReadAllText((Join-Path (Get-Location) $path))
  if ($text -match '(?m)[ \t]+\r?$' -or -not $text.EndsWith("`n")) { throw "Whitespace/final newline failed: $path" }
}
```

- [x] `git status --short` a diff review porovnať s východiskom; kompletnú suite ani build nespúšťať.

**Závislosti:** T1–T3.
**Súbory (2, small, dokumentácia):** `tasks/plan.md`, `tasks/todo.md`. Uvedené consumer testy sa iba spustia; nové chyby vyžadujú najprv určiť príčinu, nie automaticky rozširovať rozsah opravy.

## Checkpoint B: Odovzdanie opravy

- [x] T1–T4 dokončené a overené, pôvodný regresný test zelený.
- [x] Žiadne oslabené assertions, vypnuté testy, nové suppressions alebo nesúvisiace refaktory; explicitne potvrdená providerless ochrana a dvojhodnotový revision token.
- [x] Technický report a zvyšné riziká pripravené na review; kompletná suite/build explicitne uvedené ako nespustené.

## Evidencia plánovania

- [x] Architektúra, generated mutation cesta, credential fallback, query identita a ADR 0002 preverené.
- [x] Pôvodný regresný test reprodukovaný: 1 failed, 20 skipped; finálna cache obsahuje Stale VM.
- [x] Baseline oboch priamo dotknutých test súborov: 37 passed, 1 failed (38); jediná chyba je dodaná reprodukcia.
- [x] Používateľ povolil nahradiť dokončené tasks/plan.md a tasks/todo.md.
- [x] Používateľ schválil spresnený implementačný plán a vykonanie inline.


## Priebežná evidencia implementácie

- RED pred produkčnou opravou: hook súbor 25 passed / 15 failed (40). Zlyhania boli na stale cache hodnotách a providerless Promise, nie na timeoutoch alebo mock importe.
- Prvý revision guard odmietol stale mutation zápis, ale ponechaný observer po settlement rerenderi spustil obyčajný query fetch: finálna cache obsahovala Cached/Current VM. Preto doplnená lokálna `removedRevision` iba v existujúcom force-refresh stave. Pozastaví automatický refetch odstránenej query po odmietnutej odpovedi; nová revision, explicitný refresh alebo príchod platných dát ju odblokuje. Nie je to globálny deleted stav ani druhá cache. Pôvodná delete assertion zostala nezmenená.
- T1 rozsah spresnený: providerless/timing integračné testy sú v hook test súbore; shared invalidation test súbor sa nemenil. T1 tak má päť zmenených TS/TSX súborov, nie šesť.
- T1–T3 finálny focused beh: **69 passed, 0 failed, 3 súbory** (48 hook, 17 pôvodná invalidácia, 4 helper).
- Focused príkaz: `node node_modules/vitest/vitest.mjs run src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`.
- Pokryté aj obe credential operácie pri missing/filtered/stale/empty mapovaní, úplné mapovanie pred provider-list refetchom bez inventory query, a legitímny nový refresh po usadení starej odmietnutej odpovede.
- Prvé focused ESLint zlyhania boli iba v nových testoch (non-null assertions a void generic); opravené bez suppressions. Následný focused lint prešiel pred posledným rozšírením testov; T4 ho zopakuje.
- `npm run typecheck` zablokovala PowerShell execution policy pre npm.ps1; použitý ekvivalent `npm.cmd run typecheck`. Ten hlásil syntaktické chyby v súbežne upravovaných PolicySetsRefetch a troch *PoliciesRefetch testoch. Tieto cudzie súbory sa nemenia; T4 zopakuje kontrolu aktuálneho stavu.

## Finálny technický report — 2026-10-22

### Príčina a riešenie

Samostatná force-refresh mutation nebola zrušená cez cancelQueries a jej requestId guard nepoznal úspešnú provider/credential lifecycle zmenu. Preto po delete znovu vytvorila cache alebo po update prepísala novšie dáta. Nový helper udržiava iba platnosť výsledkov: WeakMap podľa QueryClient, providerRevision podľa ID a infraEpoch pre neúplný credential fallback. Snapshot má obe číselné hodnoty; zápis vyžaduje ich rovnosť aj pôvodný latest-request guard. Bump je pred prvým await invalidácie, credential vzťahy sa zachytávajú pred provider-list refetchom. Platform provider namespace zostáva oddelený.

Doplnená lokálna removedRevision v existujúcom hook pending stave bráni automatickému refetchu odstránenej query vyvolanému settlement rerenderom. Nie je to globálny tombstone: nová revision, explicitný refresh alebo platné dáta obnovia query fetchovanie. Providerless refresh odmietne Promise pred HTTP a pred vytvorením mutation. Pôvodné platné requesty zachovajú výsledný Promise, pending/error settlement a latest-request-wins.

### Úplný zoznam vlastných zmien

| Súbor | Účel |
| --- | --- |
| `src/shared/query/providerInventoryRevision.ts` (nový) | Malé spoločné API platnosti snapshotov, bez inventory cache dát. |
| `src/shared/query/providerInventoryRevision.test.ts` (nový) | 4 testy nezávislej zmeny oboch čísel tokenu, per-ID/client izolácie a monotónnosti. |
| `src/shared/query/providerMutationInvalidation.ts` | 3 nové riadky: import a synchronné infra provider/credential revision bumps; pôvodná invalidácia zachovaná. |
| `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts` | Snapshot/guard, fail-fast bez providera a obnoviteľné pozastavenie odstránenej query. |
| `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx` | 27 nových deterministických scenárov, spoločný HTTP/Promise fixture a cleanup; dodaný regresný test a jeho assertions zachované. Jeho 42 riadkov bolo vo worktree už pred našou implementáciou. |
| `tasks/plan.md` | Schválený plán a zdôvodnenie zisteného settlement/refetch okna. |
| `tasks/todo.md` | Checklist, skutočné overenie, report a limity. |

`providerMutationInvalidation.test.tsx` sa iba spúšťal, nemenil sa. Generated súbory, inventoryQueries, Resources UI, Recovery Groups UI, cache policy a QueryClient konfigurácia zostali bez našich zmien. Súbežná cudzia práca v Policy oblastiach pokračovala počas overovania; nebola obnovovaná, stashovaná, upravovaná ani zahrnutá do commitu.

### Skutočné finálne overenie

1. Rozšírený focused Vitest príkaz z T4: **122 passed, 0 failed, 7 súborov**, exit 0. Zahŕňa inventory query kontrakt, VMware hook, spoločnú invalidáciu, Resources page/prefetch a Recovery Groups hook.
2. Po poslednej lint oprave testovej queryFn (`Promise.resolve` namiesto async bez await) znovu spustené:

```powershell
node node_modules/vitest/vitest.mjs run src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx
npm.cmd run typecheck
node node_modules/eslint/bin/eslint.js src/shared/query/providerInventoryRevision.ts src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx --max-warnings 0
```

Hook: **48 passed, 0 failed**, exit 0; všetkých pôvodných 20 plus dodaná delete reprodukcia prechádzajú. Typecheck aj ESLint: exit 0. Predchádzajúce nesúvisiace parse chyby v Policy súboroch už posledný typecheck nehlásil; neboli opravované v tejto úlohe.

3. `git diff --check` a posledná focused varianta nižšie: exit 0. Git iba upozorňuje na LF→CRLF a neprístupný používateľský ignore súbor.

```powershell
git diff --check -- src/shared/query/providerMutationInvalidation.ts src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx tasks/plan.md tasks/todo.md
git status --short
git branch --show-current
```

4. Nové untracked helper súbory overené natívnou read-only PowerShell whitespace/final-newline kontrolou z T4: pass. Pôvodná `node -e` verzia z plánu v tomto PowerShelli stratila vnútorné úvodzovky a skončila SyntaxError; preto nahradená ekvivalentnou natívnou kontrolou bez stage/index zmien.

### Review, regresie a limity

Inline review podľa správnosti, čitateľnosti, architektúry, bezpečnosti a výkonu: bez zostávajúceho nálezu v dohodnutom rozsahu. Žiadne nové závislosti, všeobecná orchestration vrstva, ďalšia inventory cache, event bus, test suppressions, oslabené assertions ani backend zmeny. Malá shared abstrakcia je potrebná, pretože mutácie aj viac hookov musia používať rovnakú platnosť v rámci klienta; lokálny ref to nedokáže.

Pokryté oba credential úspechy aj fallback varianty, update/delete provider, izolácia B/platform/client, shared hooky, recreate, normálny refresh, out-of-order latest-request-wins, pending/error, providerless call a bump pred ukončením cancellation. Bump je viazaný na úspešne oznámenú lokálnu mutation: nepozná zmeny vykonané iným tabom, klientom ani používateľom bez lokálnej udalosti. Nezavádza globálne latest-request poradie medzi nezávislými hookmi. Per-ID revisions žijú s QueryClient; nevynulujú sa pri query GC. Reuse ID je overený cez reálne generated submit/delete options s mock HTTP; nepredstavuje produkčnú backend garanciu reuse ID.

Kompletná test suite, production build, browser E2E a živý backend neboli spustené. Nebol potrebný nový vizuálny UI návrh. Práca je ponechaná na `spike/ant-design-shell`, bez stage, commitu, pushu, merge, stashu alebo nového worktree podľa pokynov používateľa.
