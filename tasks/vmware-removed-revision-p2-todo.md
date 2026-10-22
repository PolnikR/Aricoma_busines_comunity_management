# Úlohy: P2 regresia removedRevision

Dátum: 2026-10-22. Plán: [vmware-removed-revision-p2-plan.md](vmware-removed-revision-p2-plan.md).
Stav: spresnený plán schválený pokynom vykonať inline; P2-1 až P2-4 a oba checkpointy dokončené a overené. Používateľ schválil samostatné cesty kvôli súbežnému Snapshot Policy plánu v tasks/plan.md a tasks/todo.md. Bez commitu/pushu, stash/reset, zmeny vetvy, worktree alebo subagentov.

## P2-1: Reaktívny kontrakt explicitného odstránenia

**Popis:** Rozšíriť existujúci QueryClient-scoped helper o explicitný infra delete marker a úzko adresovanú subscription. Najprv unit testy nového kontraktu, potom minimálna implementácia. Revision token sa nemení a aplikácia v tomto kroku zostáva na existujúcom správaní.

**Akceptačné kritériá:**
- [x] Mark/delete, podmienené clear a čítanie fungujú bez existujúcej query. Deleted sa neodvodzuje z cache. Helper poskytuje synchronné čítanie deleted stavu pre `forceRefresh()` aj identitu/generáciu lifecycle udalosti na bezpečné overenie **po await**. Oba údaje revision tokenu, izolácia klientov/ID a monotónnosť zostanú zachované.
- [x] React snapshot je stabilný boolean, callbacky sú adresované iba správnemu klientovi a provider ID; unsubscribe ukončí odbery. Rovnaký boolean nevytvorí render loop a nový delete stále dostane novú marker identity.
- [x] Clear starého markeru nevymaže novší delete; starší delete tiež nesmie po novšom recreate považovať svoju identitu za aktuálnu. Credential revision/epoch bump marker nemení ani neblokuje správne conditional clear. Žiadna inventory cache, generický event bus alebo kópia deleted stavu v hooku.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/shared/query/providerInventoryRevision.test.ts`
- [x] Nové testy preukázateľne RED→GREEN; pôvodné tokenové assertions zachované. Unsubscribe preveriť v React subscribe/unsubscribe cykle.

**Závislosti:** Schválený nový P2 plán; pred editovaním git status a aktuálny zdroj.
**Súbory (2, small):** `src/shared/query/providerInventoryRevision.ts`, `src/shared/query/providerInventoryRevision.test.ts`.

## P2-2: Automatický fetch pri update a recreate

**Popis:** Napojiť marker na úspešné infra provider mutácie a useSyncExternalStore v hooku. Odstrániť removedRevision. Doplniť integrácie reaktivity a deterministicky rozšíriť existujúce credential fixtures podľa plánu, aby zachovali assertions bez blokovania legitímneho fetchu.

**Akceptačné kritériá:**
- [x] Všetky štyri P2 focus/reconnect reprodukcie a dve remount kontroly prejdú bez zmeny assertions. Zachované token guard, latest-request-wins, providerless odmietnutie, normal fetch, debounce a pending/error settlement.
- [x] Infra delete zvýši revision a nastaví marker pred prvým await. Pôvodný delete-provider test aj assertion ostanú nezmenené; po stale odpovedi a focus/reconnect sa cache neobnoví a nezačne nechcený normálny HTTP fetch. Preveriť aj delete bez pending Live Refresh.
- [x] Recreate zruší iba stále rovnaký zachytený marker až po cancel/invalidate. Dva pripojené hooky bez manuálneho refreshu/remountu/rerenderu načítajú aktuálne dáta jedným zdieľaným requestom. Desať credential scenárov zachová undefined assertion počas kontrolovanej novej odpovede, potom pridá presné Current VM a nulový prechodný stale zápis podľa plánu.
- [x] `forceRefresh()` so stále označeným deleted providerom sa **synchronne podľa shared helpera** odmietne ako Promise pred mutation/HTTP, aj keď volajúci drží referenciu z predošlého renderu. Žiadna pending mutation, HTTP request ani zápis do cache; po úspešnom recreate nový explicitný Live Refresh funguje. Zachovať providerless odmietnutie a revision guard pre už rozbehnuté requesty.

**Overenie:**
- [x] Nové delete/recreate integrácie najprv RED, potom minimálna oprava a:
- [x] `node node_modules/vitest/vitest.mjs run src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`
- [x] Promise poradie a request counts dokážu, že recreate fetch nezačne pred skončením cancellation a následne nezačne druhýkrát tou istou invalidáciou. Žiadny sleep/unmount na obídenie kontraktu.

**Závislosti:** P2-1.
**Súbory (3, medium):** `src/shared/query/providerMutationInvalidation.ts`, `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts`, `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`.

## Checkpoint A: Lifecycle a reaktivita

- [x] Štyri P2 zlyhania a pôvodná delete ochrana sú zelené; žiadna heuristika chýbajúcich inventory dát. Manuálny Live Refresh pri explicitne odstránenom providerovi nevykonáva HTTP ani neobnoví cache.
- [x] Delete/recreate funguje v oboch stále pripojených hookoch, bez manuálnej akcie a duplicitného fetchu rovnakého key.
- [x] Inline review potvrdí jedného vlastníka deleted stavu, stabilný snapshot, cleanup a bezpečné poradie notifikácií. Všetky focused testy sú zelené pred P2-3.

## P2-3: Izolácia a súbežné lifecycle dokončenia

**Popis:** Pokryť failure, izoláciu a **oba smery** dokončenia lifecycle operácií, aby odložený recreate ani odložený delete nevytvorili nové race window. Existujúce testy sa nevypínajú, neopravujú oslabením assertions ani presunom mount lifecycle.

**Akceptačné kritériá:**
- [x] Failed infra submit/delete aj credential submit/delete nemenia revision ani deleted stav. Úspešný credential update/delete bumpuje pôvodný scope/fallback, ale nikdy nevytvára ani nemaže provider deleted marker.
- [x] Delete A neblokuje B ani rovnaké ID druhého QueryClient. Platform mutácie rovnakého ID nemenia infra stav. Zmena providera/klienta a unmount uprace odbery; nové pripojenie deleted ID ostane disabled do lokálneho úspešného submitu.
- [x] Starší submit dokončený po novšom delete ho neodblokuje. Credential mutation počas pending recreate nemení marker identity a nezablokuje správnu obnovu. Aj po opačnom poradí starých Live Refresh odpovedí zostáva len nové inventory; request counts nevykazujú fetch loop.
- [x] **Opačné poradie (old delete → newer recreate → old delete resumes):** Pozastaviť starý úspešný delete na `await cancelQueries`, dokončiť novší úspešný submit/recreate toho istého ID a overiť aktuálny nový request/cache (`Current VM`). Až potom uvoľniť starý delete; jeho oneskorené `removeQueries`/`invalidateQueries` nesmú vymazať ani zrušiť novšie dáta/request. Test musí preukázať presné poradie, finálny aj prechodný QueryCache stav, počet HTTP requestov a absenciu dodatočného refetch loopu. Ak zlyhá, doplniť minimálnu lifecycle identity/generation kontrolu pred post-await zásahmi, prípadne úzko scoped per-ID usporiadanie operácií, **nie** oslabiť test.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`
- [x] Riadené Promise preveria medziľahlý aj konečný stav **oboch poradí submit/delete**; staré assertions na skutočný delete a šesť reprodukčných prípadov sú zachované. Silná kontrola Current VM a QueryCache udalostí rozlišuje nový query výsledok od starej mutation. Doplniť manuálny deleted-state refresh test pred/po rerenderi hooku.

**Závislosti:** P2-1 a P2-2.
**Súbory (5, medium):** `src/shared/query/providerInventoryRevision.ts`, `src/shared/query/providerInventoryRevision.test.ts`, `src/shared/query/providerMutationInvalidation.ts`, `src/shared/query/providerMutationInvalidation.test.tsx`, `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`. Produkčný hook zostáva predmetom P2-2; v P2-3 ho meniť iba po opätovnom preskúmaní rozsahu.

## P2-4: Focused regresie a technický report

**Popis:** Overiť dotknuté moduly a existujúcich používateľov Resources/Recovery Groups. Zapísať presné výsledky a oddeliť prípadné cudzie Snapshot Policy chyby. Produkčné komponenty a generated súbory sa nemenia.

**Akceptačné kritériá:**
- [x] Všetky štyri P2 prípady prejdú spolu s pôvodnými úspešnými scenármi a rozšírením A–H zo zadania, vrátane pôvodnej delete ochrany. Navyše prejde **old delete → newer recreate → old delete resumes** a odmietnutie manuálneho Live Refresh pri deleted markeri (aj pred rerenderom). Žiadny test nie je vypnutý alebo oslabený.
- [x] Focused ESLint a diff kontrola prejdú. Typecheck prejde alebo sú presne doložené výhradne nesúvisiace diagnostiky; cudzie flashcopy_copy_rate fixtures sa tu neopravujú.
- [x] Report obsahuje root cause, návrh a rozdiel voči removedRevision, React reaktivitu/timing, úplný zoznam vlastných zmien, počty/príkazy pred a po a riziká. Zachovať vetvu a cudzie zmeny; bez commitu/pushu.

**Overenie (plánované, nie výsledky):**
- [x] `node node_modules/vitest/vitest.mjs run src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx`
- [x] `npm.cmd run typecheck`
- [x] `node node_modules/eslint/bin/eslint.js src/shared/query/providerInventoryRevision.ts src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx --max-warnings 0`
- [x] `git diff --check`; pri cudzej whitespace chybe doložiť samostatne focused kontrolu vlastných súborov.
- [x] Pre nové untracked P2 Markdown súbory použiť samostatnú read-only whitespace/final-newline kontrolu (git diff ich pred stage nevidí). Žiadny stage ako pomôcka validácie.
- [x] `git status --short` a kontrola vetvy; porovnať cudzie zmeny s východiskom. Kompletnú suite ani production build nespúšťať.

**Závislosti:** P2-1 až P2-3.
**Súbory (2, small, evidencia):** `tasks/vmware-removed-revision-p2-plan.md`, `tasks/vmware-removed-revision-p2-todo.md`.

## Checkpoint B: Odovzdanie P2 opravy

- [x] P2-1 až P2-4 overené; štyri zlyhania odstránené a pôvodná delete ochrana zachovaná.
- [x] Reaktivita, marker lifetime, **obe poradia** interleaving submit/delete, manuálny deleted-state refresh guard a request counts doložené; žiadna lokálna kópia deleted stavu ani nová inventory cache.
- [x] Report pripravený na review; kompletná suite/build explicitne uvedené ako nespustené. Žiadny commit/push ani zásah do súbežného Snapshot Policy/Policy Catalog plánu.

## Evidencia plánovania

- [x] Prečítané nové zadanie, aktuálny CodeGraph zdroj, QueryClient/refetch mechanizmus, helper unit testy a desať credential assertions.
- [x] Čerstvá reprodukcia: 4 failed / 2 passed / 48 skipped. Focus/reconnect provider aj credential vetvy zlyhávajú na finálnej Recovered VM assertion, remount prejde.
- [x] Súbežná výmena predvolených task súborov zachytená pred zápisom; tieto súbory sa neprepísali. Používateľ schválil samostatné P2 cesty.
- [x] Plán zachová pôvodné assertions a rozšíri kontrolu o riadenú novú odpoveď a absenciu prechodného stale zápisu; bez implementačných zmien počas plánovania.
- [x] Používateľ schválil spresnený P2 plán a vykonanie inline.

## Priebežné výsledky vykonania

- Spresnený plán schválený pokynom načítať a vykonať inline. Bez subagentov, commitu/pushu alebo zásahov do cudzej Snapshot Policy práce.
- Pôvodné P2 reprodukcie znovu potvrdené: 4 failed, 2 passed, 48 skipped. Nové helper testy pred API implementáciou zlyhali na chýbajúcich funkciách; po implementácii všetkých 9 unit testov prešlo.
- Nové lifecycle integrácie pred napojením hooku zlyhali v 3 prípadoch: recreate neobnovil oba pripojené hooky a stará forceRefresh referencia vytvorila mutation pred/po rerenderi odstráneného providera.
- Po napojení explicitného deleted stavu, subscription a guardov: prvý focused beh 83 passed / 0 failed (3 súbory). Po interleaving/izolačnom rozšírení: 90 passed / 0 failed (3 súbory).
- Samostatná kontrola React-batched delete/recreate: 1 passed, 64 skipped; normálny inventory HTTP fetch nezačal s deleted=true a obnovil sa jedným novým requestom.
- Desať credential scenárov zachovalo pôvodnú undefined assertion počas riadenej novej odpovede; potom overujú automatický request, presné Current VM a absenciu prechodného stale zápisu.
- Starší fixture prípad „credential fallback“ pôvodne povoľoval manuálny refresh aj po skutočnom delete iba na základe credential bumpu. Nový výslovný kontrakt to zakazuje: doplnené odmietnutie po credential mutation a úspešný submit/recreate pred pôvodným finálnym New Live VM overením. Pôvodné cache assertions zostali zachované.
- React Compiler lint odmietol memoizáciu callbacku viazaného na odvodené mutovateľné normalization objektové pole. Callback teraz závisí od pôvodného providerId prop a QueryClient a používa rovnaký canonical normalizer. Bez suppressions a bez duplikovania normalizačných pravidiel.

## Finálny technický report — 2026-10-22

### Root cause

Pôvodný settleForceRefresh nastavil removedRevision po akejkoľvek úspešnej provider/credential invalidácii, ak chýbali cached dáta. Nešlo o dôkaz delete: po prvom neúspešnom načítaní a neúspešnom refetchi stále platného providera nastavil canFetch=false. Focus a reconnect potom neobnovili disabled query. Remount problém maskoval resetovaním lokálneho pending stavu.

### Implementované riešenie a vlastníctvo

- Existujúci WeakMap helper si zachováva nezmenený dvojhodnotový token providerRevision/infraEpoch. Oddelene drží aktuálnu infra provider operačnú identitu s boolean deleted a provider-scoped subscriptions.
- Každý lokálne úspešný infra submit/delete vytvorí novú aktuálnu entry identity. Delete nastaví deleted=true a notifikuje pred prvým await. Submit ponechá predchádzajúci deleted stav počas cancel/invalidate a až complete aktuálnej operácie ho prepne na false.
- Operation handle poskytuje isCurrent a complete. Kontrola po await cancelQueries zabraňuje starému delete odstrániť query novšieho recreate; ďalšia kontrola pred invalidate chráni nasledovný zásah. Complete tiež interne kontroluje aktuálnosť, takže starší submit neodblokuje novší delete. Credential bump túto identitu nemení.
- Nainštalovaný QueryClient.cancelQueries synchronne zachytí aktuálne queries a zavolá ich cancel ešte pred vrátením Promise; oneskorené čakanie na tento Promise nevykonáva novú cancellation nad budúcimi queries. Test gate preto zastaví až čakanie po skutočnom cancel, presne ako produkčný tok.
- useSyncExternalStore odoberá len aktuálny QueryClient/provider ID; stabilný boolean snapshot aktualizuje enabled bez kópie deleted stavu v hooku. Unsubscribe vyčistí odber. Recreate aktivuje stále pripojené hooky a TanStack zdieľa jeden nový request rovnakého key.
- removedRevision a heuristika query dát sa úplne odstránili. Force-refresh lokálny stav vlastní len pending/error. onSuccess zachoval latest-request-wins aj porovnanie oboch revision hodnôt.
- forceRefresh číta aktuálny deleted stav synchronne priamo z helpera ešte pred mutateAsync. Odmietne deleted aj cez starú funkčnú referenciu pred React renderom, bez HTTP/pending mutation/cache zápisu. Po recreate znovu funguje. Providerless odmietnutie zostalo zachované.

Oproti pôvodnému removedRevision existuje dôkaz úspešného delete aj React reaktivita. Aktívny provider bez dát už nie je blokovaný. Boolean deleted sa po recreate zruší; aktuálna operačná identita zostane iba na rozlíšenie starých dokončení. Ide o jeden stav na provider ID, nie históriu ani všeobecný orchestration framework.

### Upravené súbory tejto úlohy

| Súbor | Účel |
| --- | --- |
| `src/shared/query/providerInventoryRevision.ts` | Explicitný deleted stav, subscriptions a identity úspešných operácií; pôvodné tokenové API zachované. |
| `src/shared/query/providerInventoryRevision.test.ts` | 5 nových helper prípadov; spolu 9 unit testov vrátane pôvodných tokenových assertions. |
| `src/shared/query/providerMutationInvalidation.ts` | Začiatok infra operácie, post-await stale guards a podmienené dokončenie recreate; credential/platform invalidácia zachovaná. |
| `src/shared/query/providerMutationInvalidation.test.tsx` | Failure matrix so známym deleted stavom a platform save/delete izolácia; spolu 22 prípadov. |
| `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts` | Odstránenie removedRevision, useSyncExternalStore a synchronný manuálny deleted guard. |
| `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx` | Spolu 65 prípadov: pôvodné P2 reprodukcie, automatický recreate, oba interleaving smery, HTTP/cache medzistavy, manuálna stará referencia a izolácia. Preexistujúcich šesť reprodukcií ani pôvodný delete test sa neoslabili. |
| `tasks/vmware-removed-revision-p2-plan.md` | Spresnený schválený návrh a výsledná konkretizácia. |
| `tasks/vmware-removed-revision-p2-todo.md` | Stav úloh, overenie a tento report. |

Default tasks/plan.md a tasks/todo.md, Snapshot Policy/OpenAPI/generated/locales súbory a Policy Catalog neboli touto prácou upravované. Resources a Recovery Groups produkčné komponenty, query keys, cache policy a createAppQueryClient sa nemenili. Hook test súbor mal pri začiatku už reprodukčný diff 85 additions / 1 deletion.

### Testovacie výsledky pred a po

Pred opravou: štyri P2 focus/reconnect prípady failed, dve remount kontroly passed. Historický review baseline piatich súborov bol 113 passed / 4 failed (117).

Po oprave: **138 passed, 0 failed, 5 test súborov**, exit 0. Z toho hook 65, helper 9, spoločná invalidácia 22 a existujúce Resources/Recovery Groups testy spolu 42. Pôvodných 117 prípadov je zelených a pribudlo 21 prípadov. Desať credential scenárov zachovalo undefined assertion počas kontrolovaného nového HTTP requestu, potom doplnilo presné aktuálne dáta a neprítomnosť prechodného stale zápisu. Žiadny test sa nevynechal.

Skutočne vykonané hlavné finálne príkazy:

```powershell
node node_modules/vitest/vitest.mjs run src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx
npm.cmd run typecheck
node node_modules/eslint/bin/eslint.js src/shared/query/providerInventoryRevision.ts src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx --max-warnings 0
git diff --check
git diff --cached --name-only
git status --short
```

Vitest: 138/138. Typecheck: exit 0, bez zostávajúcich Snapshot Policy diagnostík. Ich súbežná oprava nebola súčasťou tejto úlohy. Focused ESLint: exit 0, bez suppressions. git diff --check: exit 0 (iba bežné LF→CRLF upozornenia). Samostatná read-only whitespace/final-newline kontrola dvoch untracked P2 dokumentov tiež prešla; git diff ich pred stage nevidí.

```powershell
$paths=@('tasks/vmware-removed-revision-p2-plan.md','tasks/vmware-removed-revision-p2-todo.md')
foreach ($path in $paths) {
  $text=[System.IO.File]::ReadAllText((Join-Path (Get-Location) $path))
  if ($text -match '(?m)[ \t]+\r?$' -or -not $text.EndsWith("`n")) { throw "Whitespace/final newline failed: $path" }
}
```

### Review, riziká a Git stav

Inline review podľa správnosti, jednoduchosti, architektúry, bezpečnosti a výkonu: bez zostávajúceho nálezu v schválenom rozsahu. Presné request counts a prechodné QueryCache stavy pokrývajú pending/completed nový fetch po starom delete; React-batched delete/recreate takisto fetchuje až s deleted=false. Bez nových runtime závislostí, metadata query, cache vrstvy, generického event busu, backend zmien alebo kvalitatívnych výnimiek.

Zostávajúce hranice: viditeľné sú iba lokálne oznámené úspešné mutations v danom QueryClient. Iný tab/klient alebo poradie backend zápisov bez lokálneho oznámenia sa nesynchronizuje. Per-ID revisions a posledná lifecycle entry žijú s klientom; nezavádza sa reset pri query GC, ktorý by oživil staré tokeny. Klientsky reuse ID je testovaný cez generated options s mock HTTP, nie ako garancia backend implementácie. Kompletná suite, production build, browser E2E ani živý backend sa nespúšťali.

**Dôležité pri odovzdaní zdieľaného workspace:** Počas tejto práce sa mimo mojich Git nástrojových akcií objavil commit `b52d9377279649708fad3e0d939c4c6f8fc721db` s názvom `fix(discovery): track VMware provider deletion and resolve hook lint errors`. Obsahuje hook a hook test súbor vrátane rozpracovaných zmien tejto úlohy. Commit bol prečítaný a zachovaný; aktuálne súbory zodpovedajú overenému obsahu. Ja som nevykonal git add/commit/push/merge/reset/stash ani zmenu vetvy. Shared helper/invalidation a ich testy zostávajú necommitnuté spolu s týmito P2 dokumentmi; samotný uvedený commit preto nepredstavuje všetky súbory opravy. Overenie 138 testov, typechecku a lintovania platí pre aktuálny workspace ako celok.
