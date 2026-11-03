# TODO: FE ochrana referencií Policies a Policy Sets

Plán: [policy-reference-protection-plan.md](policy-reference-protection-plan.md).
Stav: T1–T13 dokončené inline 2026-11-03; focused testy, typy, lint, browser QA a review prešli.
Príkazy a výsledky sú zaznamenané nižšie. Počas pôvodného plánovania sa nespúšťali.

## Fáza 1: Spoločné vyhodnotenie a bezpečný priebeh

### T1: Čisté vyhodnotenie referencií

**Popis:** Pridať jeden modelový modul pre Policy → Policy Sets a Policy Set → Groups/Apps. Reuse existujúceho PolicyKind a generated typov; presné ID a priame referencie.

**Akceptácia:**
- [x] Všetky tri kind mapujú správne pole; jeden/viac/null/žiadny odkaz a rovnaké ID v inom poli sú rozlíšené.
- [x] Group a app consumers vracajú názvy a ID podľa skutočného raw kontraktu vrátane koreňového app policy_set_id; ignorujú nepriame tier väzby.
- [x] Selector nemaskuje chýbajúce dáta/error ako úspešný empty výsledok a je spoločný pre guard aj Used in.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/recovery-plans/references/model/policyReferences.test.ts`
- [x] Focused ESLint na oba uvedené TS súbory: `npm.cmd exec eslint -- <súbory> --max-warnings 0`.

**Závislosti:** Žiadne.
**Súbory:** `src/features/recovery-plans/references/model/policyReferences.ts`, rovnomenný `.test.ts`.
**Rozsah:** S, 2 súbory.

### T2: Fresh preflight a serializácia operácie

**Popis:** Implementovať spoločný useReferenceProtectedDelete s nemenným cieľom a callbackom na pôvodný mutateAsync. Žiadny nový mutation/API framework.

**Akceptácia:**
- [x] Policy robí jeden nový no-store GET; set dva paralelné GET. DELETE callback sa vyvolá iba po úplnom úspechu bez referencií; failure vrátane schema/403/404 zostáva fail closed.
- [x] Synchrónny latch pokrýva checking aj deleting; fresh/prázdna cache ani starší in-flight GET neobídu nový preflight. Následný používateľský pokus kontrolu zopakuje.
- [x] Checking/deleting/issue sú odlíšené; abort/unmount check nespustí neskorší DELETE; zamietnutie DELETE promise nespôsobí unhandled rejection ani nesprávnu check-error správu.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/recovery-plans/references/hooks/useReferenceProtectedDelete.test.tsx`
- [x] Reálny generated GET cez mock fetch: request poradie, no-store, delayed response, dvojité vyvolanie, 0 DELETE pri každom zlyhaní.
- [x] Focused ESLint na hook a jeho test.

**Závislosti:** T1.
**Súbory:** `src/features/recovery-plans/references/hooks/useReferenceProtectedDelete.ts`, rovnomenný `.test.tsx`.
**Rozsah:** S, 2 súbory.

### Checkpoint A

- [x] T1–T2 focused testy a lint prešli; guard používa skutočné kontrakty.
- [x] Žiadna production delete cesta zatiaľ nebola nahradená neúplnou implementáciou.
- [x] Skontrolované obmedzenie FE-only súbežných zmien a no-cache rozhodovanie.

## Fáza 2: Preklady a informácia o blokovaní

### T3: Preklady pre guard, Used in a detail odkazy

**Popis:** Doplniť ploché EN/SK/CS kľúče pre checking, blokujúce typy a objekty, failure zdroje, retry, empty, cached warning, missing detail a navigáciu.

**Akceptácia:**
- [x] Všetky tri jazyky pokrývajú nové stavy; chybu overenia nemožno zameniť za „nepoužíva sa“.
- [x] Kontrola testuje neprázdnosť a rovnaké placeholdery, vrátane názvu/ID; existujúce texty sa nemenia.
- [x] Texty nevytvárajú tvrdenie o transakčnej alebo backend ochrane.

**Overenie:**
- [x] `npm.cmd exec vitest run src/locales/policyReferenceTranslations.test.ts`
- [x] Pri implementácii parsovanie JSON a kontrola SK/CS diakritiky.

**Závislosti:** Definované stavy v pláne a T2.
**Súbory:** `src/locales/en.json`, `sk.json`, `cs.json`, `policyReferenceTranslations.test.ts`.
**Rozsah:** M, 4 súbory.

### T4: Viditeľné zamietnutie v samostatnom dialógu

**Popis:** Pridať `ReferenceDeleteNotice` využívajúci existujúci Alert, zobrazený v samostatnom scrollovateľnom výsledkovom dialógu pre všetky štyri objekty (nie vo `footerStart` DetailView). Vstupom sú štruktúrované issue z guard.

**Akceptácia:**
- [x] Blokovanie zobrazuje všetky názvy a ID, odlišuje groups/apps/sets a bezpečne renderuje text.
- [x] Check failure pomenuje neoverený zdroj vrátane chýb oprávnení; čiastočný úspech sa nevydáva za celkový empty.
- [x] Po zablokovaní sa confirmation zatvorí, pôvodný detail zostane otvorený a až potom sa zobrazí samostatný výsledkový dialóg; bez prekrývania modálov.
- [x] Výsledkový dialóg má maximálnu výšku, vlastný scroll, všetky názvy/ID, funkčný focus trap a Close. Nezasahuje do `shrink-0` footeru DetailView; po zavretí zostávajú Delete/Edit dostupné.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/recovery-plans/references/components/ReferenceDeleteNotice.test.tsx`
- [x] Integračný test otvorenia a zatvorenia výsledkového dialógu nad otvoreným detailom, Escape/focus a desiatok blokujúcich referencií bez roztiahnutia DetailView footeru.
- [x] Focused ESLint na komponent a test.

**Závislosti:** T2, T3.
**Súbory:** `src/features/recovery-plans/references/components/ReferenceDeleteNotice.tsx`, rovnomenný `.test.tsx`.
**Rozsah:** S, 2 súbory.

### Checkpoint B

- [x] T3–T4 focused overenia prešli; stavy a názvy sú lokalizované a viditeľné.
- [x] Žiadna zmena shared DetailView, ConfirmDialog alebo Policy Catalog kontraktu.

## Fáza 3: Tri kompletné policy delete cesty

### T5: Snapshot Policy delete ochrana

**Popis:** Napojenie SnapshotPoliciesTable na guard a notice pri zachovaní generated mutation a onDeleted lifecycle.

**Akceptácia:**
- [x] Každé Confirm vykoná preflight; používaná policy aj GET failure majú 0 DELETE a viditeľný dôvod.
- [x] Nepoužitá policy vykoná presne 1 DELETE s pôvodným ID; post-delete refresh success/error sa zachová.
- [x] Pending zakáže opakované potvrdenie aj Escape/backdrop zrušenie; nový pokus resetuje staré chyby.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/snapshot/pages/SnapshotPoliciesRefetch.test.tsx`
- [x] Doplniť explicitné GET policy_sets fixtures do existujúcich HTTP stubov; focused ESLint na 3 súbory.

**Závislosti:** T1, T2, T4.
**Súbory:** Dva uvedené testy a `src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.tsx`.
**Rozsah:** M, 3 súbory.

### T6: Recovery App Policy delete ochrana

**Popis:** Rovnaký existujúci flow s kind recoveryApp, bez duplicity check logiky a bez zmien edit/create.

**Akceptácia:**
- [x] Použitie v jednom/viacerých setoch a GET failure blokujú DELETE; nesúvisiace pole rovnakého ID neblokuje.
- [x] Úspešné mazanie zachová invalidáciu, zatvorenie a post-delete refresh vrátane jeho chyby.
- [x] Pending, notice, reset a callback smerovanie sú napojené na spoločný guard.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/pages/RecoveryAppPoliciesRefetch.test.tsx`
- [x] Explicitné preflight fixtures a focused ESLint na 3 súbory.

**Závislosti:** T1, T2, T4; T5 stanoví integračný vzor.
**Súbory:** Dva uvedené testy a `src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.tsx`.
**Rozsah:** M, 3 súbory.

### T7: Clean Room Policy delete ochrana

**Popis:** Napojenie kind cleanRoom na existujúci confirmation a mutation bez zásahu do BE.

**Akceptácia:**
- [x] Všetky blokujúce sety sa vypíšu; HTTP/network/schema chyba má 0 DELETE aj pri cached empty výsledku.
- [x] Úspešný priebeh zachová pôvodnú refresh semantiku a presné request parametre.
- [x] Každý existujúci FE delete vstup ide cez guard; opakované Confirm počas pending neodosiela nič navyše.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/clean-room/pages/CleanRoomPoliciesRefetch.test.tsx`
- [x] Explicitné preflight fixtures a focused ESLint na 3 súbory.

**Závislosti:** T1, T2, T4; T5 stanoví integračný vzor.
**Súbory:** Dva uvedené testy a `src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.tsx`.
**Rozsah:** M, 3 súbory.

### Checkpoint C

- [x] Všetky tri typy policies majú request-level dôkaz blokovania aj úspešného delete.
- [x] Refetch testy zachovali pôvodné assertions; nepribudol validačný bypass ani zmena generated klienta.
- [x] Cielená kontrola typov po zavedení zdieľaných TS modulov: `npm.cmd run typecheck`; prípadné nesúvisiace chyby zaznamenať.

## Fáza 4: Policy Set delete a prvý cieľový detail

### T8: Policy Set delete ochrana

**Popis:** Napojenie PolicySetsTable na paralelný fresh groups/apps preflight a spoločný notice.

**Akceptácia:**
- [x] Iba group, iba app a oba typy blokujú DELETE s konkrétnymi názvami a ID; neposudzujú sa podľa stavu orchestrácie.
- [x] Zlyhanie jedného/oboch GET blokuje; pri oboch úspešných prázdnych výsledkoch presne 1 DELETE až po oboch response.
- [x] Overview zostane zachovaný; pending a pôvodný post-delete refresh sa správajú ako pri policies.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx src/features/recovery-plans/policy-sets/pages/PolicySetsRefetch.test.tsx`
- [x] Explicitné groups/apps response fixtures a focused ESLint na 3 súbory.

**Závislosti:** T1, T2, T4.
**Súbory:** Dva uvedené testy a `src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx`.
**Rozsah:** M, 3 súbory.

### T9: Group detail z URL

**Popis:** Doplniť parameter detail na existujúci group list/table flow.

**Akceptácia:**
- [x] URL otvorí správny existujúci detail z celého groups poľa, vrátane ID s rezervovanými znakmi, nezávisle od filtrov/paginácie.
- [x] Close vyčistí iba detail parameter; Back/Forward a zmena ID fungujú, bez parametra zostane pôvodné správanie.
- [x] Ak je URL `?detail=A`, výber riadku B zmení URL na `?detail=B` s push do histórie, zachová ostatné parametre a otvorí B, nie A.
- [x] Loading/error/nenájdený cieľ sa rozlišujú; všetky existujúce close/delete/edit vetvy neotvoria detail znovu zo zvyšného parametra.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`
- [x] Nový izolovaný `RecoveryGroupsTable.url.integration.test.tsx` s reálnym MemoryRouter/Routes bez `useNavigate` mocku; overiť reálnu URL, klik A → B, Back/Forward a zatvorenie detailu. Existujúce `.test.tsx` si môže ponechať svoje unit mocky.
- [x] Focused ESLint na 3 súbory.

**Závislosti:** T3 pre missing-detail texty.
**Súbory:** `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`, rovnomenný `.test.tsx` a nový `.url.integration.test.tsx`.
**Rozsah:** M, 3 súbory.

### Checkpoint D

- [x] T8–T9 focused overenia prešli; Policy Set delete je fail closed, group link má reálny cieľ.
- [x] Existujúca BE ochrana Recovery Group → Application sa neprepísala FE aproximáciou.

## Fáza 5: Used in s cache a oboma detail odkazmi

### T10: Application detail z URL

**Popis:** Zaviesť rovnaký detail parameter na applications list/table bez prechodu na editor.

**Akceptácia:**
- [x] Odkaz používa presné raw ID a otvorí read-only detail správnej application, aj ak nie je na aktuálnej stránke/vo filtrovaných riadkoch.
- [x] Close, Back/Forward, zmena ID a ostatné query parametre sa správajú podľa T9; bez detail parametra žiadna zmena pôvodného flow.
- [x] Pri `?detail=A` klik na riadok B aktualizuje `detail=B` bez straty ostatných parametrov a zobrazí B.
- [x] Chýbajúci záznam, loading/error a všetky existujúce close/delete/edit vetvy sú pokryté bez implicitného DELETE alebo edit navigácie.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`
- [x] Nový izolovaný `RecoveryApplicationsTable.url.integration.test.tsx` s reálnym MemoryRouter/Routes bez `useNavigate` mocku; URL, klik A → B, Back/Forward a close overené na skutočnom router state. Pôvodné unit testy nemeniť kvôli mockovaniu navigácie.
- [x] Focused ESLint na 3 súbory.

**Závislosti:** T3; rešpektovať rovnaký URL kontrakt ako T9.
**Súbory:** `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`, rovnomenný `.test.tsx` a nový `.url.integration.test.tsx`.
**Rozsah:** M, 3 súbory.

### T11: Lazy Used in v detaile Policy Setu

**Popis:** Pridať priamy DetailViewSection pod Overview a komponent PolicySetUsage s generated query hooks, spoločným selectorom a Link akciami.

**Akceptácia:**
- [x] Overview je nezmenený; groups/apps sa kvôli Used in nenačítajú pred aktivovaním sekcie. Čistý mount využije platnú cache.
- [x] Oba typy consumers majú správne názvy/ID a odkazy na detail; všetky loading/paused/error/cachedError/partial/empty stavy sa rozlišujú, retry cieli len zlyhaný zdroj.
- [x] Globálny empty sa zobrazí iba pri úspechu oboch zdrojov; odstránenie/prepnutie referencií nemení nesúvisiace Policy Catalog správanie.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/recovery-plans/policy-sets/components/PolicySetUsage.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`
- [x] Test navigácie klikne skutočný Link a otvorí existujúci cieľový detail cez reálny MemoryRouter/Routes bez `useNavigate` mocku; nepostačuje iba spy na `navigate`. Integračné testy URL v T9/T10 sa opakovane použijú na overenie cieľov.
- [x] Focused ESLint na všetky 4 súbory.

**Závislosti:** T1, T3, T8, T9, T10.
**Súbory:** `src/features/recovery-plans/policy-sets/components/PolicySetUsage.tsx`, `.test.tsx`, existujúce `PolicySetsTable.tsx`, `.test.tsx`.
**Rozsah:** M, 4 súbory.

### T12: Cache a invalidácie po zmene referencií

**Popis:** Overiť reálny query client s produkčnými defaults a reálne mutation cesty; doplniť iba dokázanú chýbajúcu invalidáciu mimo generated, ak sa nájde.

**Akceptácia:**
- [x] Fresh hit/empty hit má 0 GET, iba jeden miss má 1 GET, oba stale/missing 2 GET; TTL a isInvalidated spôsobia očakávaný fetch aj pri remounte tabu.
- [x] Group create/edit/delete a application create/edit/delete/reconciliation aktualizujú priamych consumers pred TTL; aktívny/neaktívny Used in a zdieľanie raw cache funguje.
- [x] Žiadne providers GET pre Usage, nový query key, side cache, globálna invalidácia ani ručný zápis doménových zoznamov do raw cache.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/recovery-plans/policy-sets/components/PolicySetUsage.cache.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications.test.tsx src/features/recovery-plans/recovery-applications/hooks/recoveryApplicationsWire.test.tsx`
- [x] Použiť riadený čas/dataUpdatedAt a createAppQueryClient alebo jeho defaults; neakceptovať test s náhodným staleTime=0 ako dôkaz cache kontraktu.
- [x] Focused ESLint na nový test a prípadné presne identifikované opravy.

**Závislosti:** T8, T11.
**Súbory:** Nový `src/features/recovery-plans/policy-sets/components/PolicySetUsage.cache.test.tsx`. Produkčné zmeny sa nepredpokladajú; pri zistenej medzere samostatne pomenovať affected hook a test pred jeho opravou, najviac 5 súborov na úlohu.
**Rozsah:** S štandardne 1 súbor; prípadná oprava najviac M.

### Checkpoint E

- [x] T10–T12 focused testy a lint prešli; lazy mount, oba detail odkazy a cache/invalidation sú dokázané.
- [x] Žiadne všeobecné rozšírenie DetailView ani zmena backend/API kontraktu.
- [x] Výsledky a prípadné presné invalidation medzery sú zapísané v tomto checklist dokumente až po vykonaní.

## Fáza 6: Regresie a odovzdanie

### T13: Finálne focused overenie a report

**Popis:** Skontrolovať kompletný používateľský flow a audit všetkých štyroch FE delete vstupov. Zachovať úzky rozsah overenia.

**Akceptácia:**
- [x] Všetky acceptance kritériá T1–T12 majú dôkaz; vyhľadanie neodhalí priamy produkčný DELETE obchádzajúci guard. Žiadne zmeny BE/generated/OpenAPI ani nesúvisiace refaktory.
- [x] V izolovanom prehliadači s testovacími dátami overené blokovanie, úspešné mazanie, pomalý/error GET, samostatný výsledkový dialóg (scroll a fokus), Used in, odkazy, prepnutie detailu pri aktívnom `?detail=A` klikom na riadok B, EN/SK/CS, mobilný layout a dlhé názvy; prípadná nedostupnosť browsera je uvedený limit, nie vykonaná kontrola.
- [x] Report uvádza príkazy, výsledky, nebežanú kompletnú suite/build a FE-only súbežný limit. Commit len podľa autorizácie platnej pri implementácii; teraz sa žiadny nevytvára.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/recovery-plans/references/model/policyReferences.test.ts src/features/recovery-plans/references/hooks/useReferenceProtectedDelete.test.tsx src/features/recovery-plans/references/components/ReferenceDeleteNotice.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetUsage.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetUsage.cache.test.tsx src/features/recovery-plans/policy-sets/pages/PolicySetsRefetch.test.tsx src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/snapshot/pages/SnapshotPoliciesRefetch.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/pages/RecoveryAppPoliciesRefetch.test.tsx src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/clean-room/pages/CleanRoomPoliciesRefetch.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.url.integration.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.url.integration.test.tsx src/locales/policyReferenceTranslations.test.ts`
- [x] `npm.cmd run typecheck` pre nové typed hook/selector a rozšírené komponenty.
- [x] `npm.cmd exec eslint -- <iba skutočne zmenené TS/TSX súbory> --max-warnings 0` a `git diff --check`.
- [x] Kompletnú test suite a `npm.cmd run build` nespúšťať predvolene; širší rozsah iba pri novej konkrétnej potrebe alebo výslovnej požiadavke.

**Závislosti:** T1–T12.
**Súbory:** Doplnenie výsledkov do týchto dvoch dokumentov; žiadny plánovaný nový produkčný modul.
**Rozsah:** S, 2 dokumenty; overovanie existujúcich affected súborov.

### Checkpoint F: Pripravené na odovzdanie

- [x] Cielené automatické overenia prešli; limity browser/produkčného BE sú uvedené pravdivo.
- [x] Používateľské správanie zodpovedá schválenému FE-only rozsahu.
- [x] Žiadne tvrdenie o absolútnej ochrane pred priamym API volaním alebo súbežnou zmenou iným klientom.

## Gate pred implementáciou

- [x] Používateľ skontroloval tieto dva dokumenty a schválil implementáciu.

Implementácia je schválená; focused overenie a atómové commity vlastných zmien sa riadia AGENTS.md. Existujúce `tasks/plan.md` a `tasks/todo.md` sa neprepisujú.

## Priebeh vykonania

- 2026-11-03: Schválené inline na existujúcej vetve `spike/ant-design-shell`, základ `47d54c06`. Produkčný worktree bol čistý, oba plánovacie dokumenty boli untracked. Plán načítaný vrátane doplnení samostatného výsledkového dialógu a nemockovanej URL navigácie.
- T1–T4: prebieha implementácia spoločného modelu, guard hooku, výsledkového dialógu a EN/SK/CS textov.
- Baseline: `npm.cmd exec vitest run` nad štyrmi existujúcimi Policy/Policy Set table test súbormi — 45 passed, 4 files, exit 0. Kompletná suite ani build sa nespúšťali.
- Ruling: Inline vykonanie používa pomocných agentov podľa executing-plans/subagent-driven-development; zdieľané moduly, preklady a PolicySetsTable sa upravujú postupne. Nezávislé URL navigácie T9/T10 môžu vzniknúť popri jadre po zafixovaní prekladových kľúčov, pretože majú výlučné súbory. Cena pri nesprávnom rozhodnutí: nutná integrácia alebo úprava test fixtures; žiadny BE alebo zdieľaný API kontrakt sa tým nemení.
- T1/T2 priebežne: selector, fresh preflight hook a locale testy 24 passed v 3 súboroch; notice a integračné cesty ešte prebiehajú.
- T9/T10 rozsah: `RecoveryApplicationsListPage.test.tsx` potrebuje reálny MemoryRouter aj pri existujúcom useNavigate mocku, pretože tabuľka teraz používa useSearchParams. Ide o prispôsobenie fixture, nie zmenu produkčného kontraktu mimo plánu.
- T1–T4 implementácia: focused model/hook/notice/locales beh 29 passed; po lint úprave hook znovu 20 passed; focused ESLint všetkých 7 TS/TSX súborov exit 0. Nezávislé review jadra prebieha.
- T9/T10 priebežne: obe nové nemockované router integračné sady 8/8 passed; súvisiace unit/lifecycle/orchestration/page regresie a lint sa dokončujú.
- T1–T4: nezávislé review bez findings; overené jadro commitnuté ako `98fb6722` (`feat: add shared policy reference deletion checks`).
- T9/T10: finálny focused beh 144 passed / 8 files; ESLint nad piatimi zmenenými súbormi exit 0. T5–T10 integračné review prebieha.
- T11/T12: prebieha lazy Used in a cache/invalidation integrácia; existujúci guard v PolicySetsTable sa zachováva.
- T5–T8: 45 component testov prešlo; štyri Refetch sady 29/29, následný Snapshot retry-after-unlink test 7/7 (celkové Refetch pokrytie 30). ESLint 12 affected súborov a následného Snapshot doplnenia prešiel. Tri policy napojenia commit `498a0cdc`; Policy Set sa uloží spolu s Used in.
- Review T5–T10: guard produkčné cesty bez findings. Important gap chýbajúcich URL Edit/Delete/Rollback/unmount/filter scenárov sa rieši novými testami; tie odhalili kolíziu kľúča menu/detail pri rovnakom ID. Namespace kľúča menu sa opravuje v oboch tabuľkách.
- Typecheck prvý beh odhalil iba nové testové `exact` vo `ByRoleOptions` (nepodporovaný parameter). Oprava odstraňuje iba tento parameter, zachováva presný string name matching; nasledovať bude finálny typecheck.
- Browser QA: `node node_modules/.cache/verify-policy-references.mjs` prešiel pre EN/SK/CS (exit 0). Overené lazy Used in, cache reuse pri prepnutí tabu, oba Link odkazy s rezervovanými znakmi v ID, row-click dispatch A→B a Back, pending Escape, 40 blokujúcich setov, scroll/desktop+390px mobile, result Close, GET 503 blokuje DELETE a nepoužitá policy sa vymaže. Screenshots a results sú v `node_modules/.cache/policy-reference-browser/`. Žiadne page errors; console iba zámerne simulovaný 503. Dev StrictMode abortuje prvý query GET, preto browser cache assertion porovnáva počty pred/po remounte; presné 0/1/2 request counts overujú RTL testy s produkčnými cache defaults.
- T9/T10 review fix: 23/23 real-router URL testov prešlo (group 13, app 10); linter nad oboma tabuľkami a URL testami exit 0. Menu aj DetailView majú disjunktné kľúče `menu-`/`detail-`; commit `37c24390` ukladá navigáciu. Zvyšných 136 súvisiacich ne-URL testov predtým prešlo; nové časovacie assertions čakajú na finálny router state.
- T11/T12: 31 Usage/table/cache testov prešlo, po nich doplnený desiaty cache scenár pri unmount pôvodného mutation hooku; existujúce tri mutation hook sady 62 passed. Žiadna chýbajúca produkčná invalidácia sa nepotvrdila. Finálny T13 zahrnie doplnený scenár.
- Test-only TS oprava: notice a tri Refetch testy 20 passed; ESLint exit 0. Následný typecheck odhalil len chýbajúce `notificationEmail: null` v novej app-submit fixture; fixture doplnená bez casts/suppressions.
- Finálny `npm.cmd run typecheck`: exit 0. Focused ESLint všetkých zmenených TS/TSX (tracked diff od `47d54c06` + nové task súbory) a `git diff --check`: exit 0. Finálny T13 Vitest beh nad 20 explicitnými súbormi prebieha.
- Finálne nezávislé whole-feature review: bez Critical/Important/Minor findings. Skorší URL coverage gap je vyriešený; pôvodný hook-unmount aj nový Usage remount majú priame/kompozičné testové pokrytie.

## Finálny report — 2026-11-03

- T1–T13 splnené. Štyri FE delete cesty vždy vykonajú nový GET preflight, pri použití alebo zlyhaní overenia neodosielajú DELETE. Pôvodné generated mutations a následný refresh zostali zachované.
- Policy Set detail má lazy Used in so zdieľanými query keys a štandardnými cache defaults. Reálne group/app mutations, priradenie/odpojenie setu, invalidácie, remount a odpojenie pôvodného mutation hooku sú pokryté integračnými testami. Produkčné invalidácie nebolo treba meniť.
- Odkazy vedú na existujúce Group/Application detaily cez presné URL ID; zachovávajú iné parametre a podporujú Back/Forward. Opravená kolízia React keys menu/detail odhalená rozšírenými testami.
- Finálny T13 Vitest beh: **241 passed, 0 failed, 20 files**, exit 0, 154.77 s. Zahŕňa finálny cache test s odpojením originátora ukladania a opravené typované fixtures. Doplňujúce existujúce mutation hook regresie: **62 passed**.
- `npm.cmd run typecheck`: exit 0. Focused ESLint všetkých zmenených TS/TSX s `--max-warnings 0`: exit 0. `git diff --check`: exit 0.
- Browser QA: EN/SK/CS, lazy/cache, Link navigácia, rezervované ID, row-click dispatch a história, pending Escape, 40 blokujúcich objektov, desktop/mobile rozmer, scroll/Close, failure aj success delete flow. Page errors 0; iba zámerne simulované HTTP 503 v console. Screenshots boli vizuálne skontrolované.
- Nezávislé finálne review bez findings. Predchádzajúci Important coverage gap bol uzavretý 23 úspešnými real-router testami; nález duplicate keys bol opravený, nie odložený.
- Backend, `openapi/abco-api.json` a generated súbory zostali nezmenené. Kompletná suite, production build, živý backend ani storage operácie sa nespúšťali.
- FE-only limit zostáva: kontrola nie je transakčná, nedokáže zabrániť súbežnému priradeniu medzi GET a DELETE ani priamemu volaniu API iným klientom. Nedostatočné oprávnenie GET bezpečne blokuje mazanie.
- Práca zostáva na pôvodnej vetve `spike/ant-design-shell`, bez merge alebo pushu. Commity implementácie: `98fb6722` spoločné jadro; `498a0cdc` tri policy delete integrácie; `37c24390` detail navigácia; `14f72c76` Policy Set delete + Used in + finálne testové typové opravy. Tieto dokumenty sa uložia samostatným dokumentačným commitom.

### Skutočný finálny testovací príkaz

```powershell
npm.cmd exec vitest run src/features/recovery-plans/references/model/policyReferences.test.ts src/features/recovery-plans/references/hooks/useReferenceProtectedDelete.test.tsx src/features/recovery-plans/references/components/ReferenceDeleteNotice.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetUsage.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetUsage.cache.test.tsx src/features/recovery-plans/policy-sets/pages/PolicySetsRefetch.test.tsx src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/snapshot/pages/SnapshotPoliciesRefetch.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/pages/RecoveryAppPoliciesRefetch.test.tsx src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/clean-room/pages/CleanRoomPoliciesRefetch.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.url.integration.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.url.integration.test.tsx src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.test.tsx src/locales/policyReferenceTranslations.test.ts
```

### Ostatné finálne kontroly

```powershell
npm.cmd run typecheck
$taskChangedFiles = @(@(git diff --name-only 47d54c06 -- '*.ts' '*.tsx') + @(git ls-files --others --exclude-standard -- '*.ts' '*.tsx')) | Sort-Object -Unique
npm.cmd exec eslint -- $taskChangedFiles --max-warnings 0
git diff --check
node node_modules/.cache/verify-policy-references.mjs
```

Browser skript a screenshots sú lokálne QA artefakty v ignorovanom `node_modules/.cache/`; nie sú produkčnou závislosťou. Trvalé regresie sú uložené vo Vitest/RTL testoch.
