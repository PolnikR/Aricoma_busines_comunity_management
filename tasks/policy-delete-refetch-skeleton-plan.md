# Implementačný plán – Skeleton riadkov po vymazaní policy

Dátum: 2026-10-22. Stav: návrh na review; implementácia nezačala.
TODO: [policy-delete-refetch-skeleton-todo.md](policy-delete-refetch-skeleton-todo.md).
Rozsah: Snapshot Policies, Recovery Application Policies, Clean Room Policies a Policy Sets.

## 1. Požadované správanie

Po úspešnom vymazaní zobraziť existujúci skeleton iba v dátových riadkoch príslušnej tabuľky, kým sa dokončí následný GET. Názvy stĺpcov, toolbar, vyhľadávanie, tabs, page header a zvyšok stránky zostanú zobrazené. Bežný background refetch bez vymazania naďalej ponechá dáta viditeľné.

Predpoklad zo spoločného brainstormingu: rovnaké správanie patrí do všetkých štyroch zoznamov. Nevzťahuje sa na create/edit ani na načítanie referencií cez Policy Catalog. Tento dokument povoľuje iba naplánovanie zmeny; implementácia až po následnom schválení používateľom.

## 2. Overený stav a izolácia práce

Vetva `spike/ant-design-shell`, HEAD `f3a00eb2`. V pracovnom strome už boli rozpracované zmeny v:

- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`
- `tasks/plan.md`
- `tasks/todo.md`

Defaultné task dokumenty teraz patria inému otvorenému plánu VMware Live Refresh. Nebudú prepísané ani pridané do tejto úlohy. Použije sa tematická dvojica dokumentov a lokálny TODO podľa používateľovej preferencie z tejto konverzácie; bez GitHub issues. Nevytvárať worktree, nemení sa vetva ani cudzí rozpracovaný obsah.

Analýza použila CodeGraph a aktuálny zdroj, nie iba skoršie review. Relevantné miesta:

| Zdroj | Aktuálne správanie | Dopad |
| --- | --- | --- |
| `src/shared/components/data-table/DataTable.tsx:76–100` | Reálne stĺpcové hlavičky sa vykreslia vždy. Pri `isLoading` sa iba `tbody` nahradí skeleton bunkami; default je 6 riadkov, dostupné `loadingRowCount`. | Nový skeleton komponent ani page skeleton netreba. |
| `src/shared/components/data-table/DataTable.test.tsx:48–69` | Testuje reálne hlavičky, skeleton body, `role=status`, `aria-busy` a neprítomnosť empty state počas loadingu. | Zachovať a spustiť ako regresiu. |
| `src/shared/components/data-table/DataTableSkeleton.tsx:20–105` | Samostatný väčší placeholder môže nahrádzať aj hlavičku/toolbar/pagination. | Pre tento tok ho nepoužiť. |
| `PolicySetsPage.tsx:14–16,37–42` | List query posiela do tabuľky `isLoading`, zatiaľ čo `isFetching` ide do toolbaru a retry indikácie. | Refetch s cache nepovolí skeleton body. |
| `SnapshotPoliciesPage.tsx:17–19,45–50`, `CleanRoomPoliciesPage.tsx:17–19,41–46`, `RecoveryAppPoliciesPage.tsx:17–19` | Rovnaké oddelenie prvého loadingu a background fetchu. | Štyri zoznamy potrebujú rovnaký cielený UI priebeh. |
| `PolicySetsTable.tsx:219–234`, `RecoveryAppPoliciesTable.tsx:256–268`; ostatné policy tabuľky majú rovnaký delete pattern | Mutation pending riadi confirm tlačidlo. Per-call `onSuccess` zatvorí potvrdenie aj vybraný detail. | Životnosť mutation pending sama nepokrýva dokončenie následného list GET. |
| `src/generated/query/policy-sets/policy-sets.gen.ts:306–310` a zodpovedajúce policy generated moduly | Generated `onSuccess` spustí `invalidateQueries` a potom hook-level `mutationOptions.onSuccess`; promise invalidácie nevracia. | Neodvodzovať skeleton iba z `deleteMutation.isPending`; generated kód neupravovať. |
| Štyri existujúce `*Refetch.test.tsx` | Reálne generated hooks a stubovaný fetch overujú druhý list GET po DELETE. Stub však opakovane vracia pôvodný record. | Doplniť deferred druhý GET a správnu odpoveď bez vymazanej entity; overiť aj čas medzi requestom a odpoveďou. |

Súvisiace ADR: [0002](../docs/adr/0002-generated-react-query-api-layer.md), body 8–9. Jedinou cache zostáva TanStack Query; invalidácia zostáva generated. Žiadne optimistic `setQueryData`, nové keys, mutačné API wrappers alebo nové HTTP endpointy.

## 3. Najmenší vhodný návrh

| Alternatíva | Posúdenie |
| --- | --- |
| Použiť `isFetching` ako loading celej tabuľky pri každom refetchi | Jednoduché, ale bliká aj pri focus/reconnect/manual refresh a nedodrží dohodnutý rozsah. |
| Použiť iba `deleteMutation.isPending` | Končí pred list GET; pôvodný problém môže zostať. |
| Lokálne kopírovať alebo filtrovať serverové dáta | Mení správu dát a obchádza ADR; na skeleton to nie je potrebné. |
| Cielený UI stav úspešné vymazanie → refetch → výsledok | Odporúčané. Malý spoločný UI hook odstráni štyrikrát rovnaké prechody, bez druhej cache. |

Navrhované umiestnenie: `src/features/recovery-plans/hooks/usePostDeleteRefresh.ts`. Je to stav používateľskej operácie, nie nová query alebo mutačná fasáda. Hook neimportuje generated fetchery, query keys ani QueryClient. Dostane iba callback na existujúci observer refetch.

Návrh kontraktu:

```ts
type PostDeletePhase = 'idle' | 'refreshing' | 'error'

// Callback používa existujúci generated query observer.
type RefreshList = () => Promise<{ isError: boolean }>

interface PostDeleteRefresh {
  phase: PostDeletePhase
  afterDelete: () => Promise<void>
  refresh: () => Promise<void>
}

declare function usePostDeleteRefresh(refreshList: RefreshList): PostDeleteRefresh
```

`afterDelete` nastaví refreshing synchronne pred čakaním, počká na výsledok a nastaví idle/error. `refresh` v idle vykoná obyčajný refresh bez skeletonu; pri chybe po vymazaní zopakuje cielenú obnovu so skeletonom. Opakované volanie počas refreshing sa pripojí k bežiacemu requestu. Callback v každej page použije `refetch({ cancelRefetch: false, throwOnError: false })`, takže query chyby sú výsledkom s `isError`, nie nerozlíšeným zlyhaním DELETE.

Žiadne vlastné dáta, query identity, timers, minimálna dĺžka animácie alebo nové dependencies. Pri unmount/remount sa dočasný UI stav neprenáša na inú stránku. Pozastavený request zostáva v správe štandardného TanStack reconnect/retry; nevymýšľať timeout, ktorý by predstieral dokončenie GET.

### Kritické načasovanie a jeden GET

Pripojenie k refetchu musí začať v **hook-level** `mutation.onSuccess` odovzdanom do existujúceho `useDelete*`. Generated callback ho volá synchronne hneď po spustení vlastnej invalidácie. V tomto bode sa `refetch({ cancelRefetch: false })` pripojí k už prebiehajúcemu GET a nereštartuje ho.

Nespúšťať ho až z terajšieho per-call success callbacku v `mutate(...)`: pri veľmi rýchlom GET by tam už request mohol byť dokončený a druhé `refetch()` by spustilo zbytočný ďalší GET. Generated callback nečaká na vrátený promise používateľského success handlera; preto trvanie skeletonu musí vlastniť UI hook, nie mutation pending.

Pri presune success obsluhy zachovať zatvorenie potvrdenia a detailu. Error obsluha DELETE zostáva odlišná a nikdy nevolá `afterDelete`. Nepoužiť `skipInvalidation`, druhé `invalidateQueries` ani ručné await wrappers okolo generated klienta.

Tento mechanizmus je prvé riziko na overenie v integračnom reze Policy Sets: deferred aj okamžitá odpoveď musia viesť k **jednému následnému list GET**, nie dvom. Ak installed observer semantika očakávané pripojenie nepotvrdí, najprv upraviť tento návrh; nerozširovať invalidáciu ani generated kód potichu.

## 4. Integrácia a viditeľný priebeh

Každá page vytvorí UI hook nad svojím existujúcim `refetch`. Do tabuľky doplní `postDeletePhase` a `onDeleted`, existujúce retry/toolbar refresh napojí na `refresh`. Page shell naďalej dostane pôvodné query `isFetching`; žiadna podmienka nenahradí celú stránku skeletonom.

Každá tabuľka:

- Zapojí hook-level success handler do existujúcej generated delete mutation a zavolá `onDeleted` bez odkladu po úspechu.
- Pre `DataTable` použije `isLoading || postDeletePhase === 'refreshing'` a zodpovedajúci existujúci loading aria-label. Počas tejto fázy nebudú staré riadky dostupné ani klikateľné. `columns`, toolbar a obal ostanú rovnaké.
- Zachová stránkovanie zobrazené; počas targeted obnovy môže existujúci loading prop dočasne zablokovať ovládanie pagination. Filtre, vyhľadávací text, density a page-size sa neresetujú.
- Po úspechu GET ukáže aktuálne riadky alebo skutočný empty state, vrátane vymazania posledného záznamu. Zachovať existujúce prepočítanie platnej stránky v `useTableState`.
- Pri chybe DELETE nezapne post-delete skeleton a ukáže dnešnú delete chybu.
- Pri úspešnom DELETE a zlyhaní GET vypne skeleton a použije existujúci request-error blok s osobitným textom: vymazanie prebehlo, aktuálny zoznam sa nepodarilo načítať, zobrazujú sa predchádzajúce údaje a môžu obsahovať vymazaný záznam. Retry obnovuje iba dotknutý list; neposiela DELETE druhýkrát.

Pri retry po tejto chybe treba počas targeted refreshing potlačiť starý blokujúci request-error render, aby neprekryl nový skeleton. Samotná query chyba a cache sa nemenia. Po výsledku sa zobrazí úspech alebo opäť jasné upozornenie. Pôvodný všeobecný load/refresh error pri operácii bez DELETE zostane zachovaný.

Nové texty iba pre rozlíšenie úspešného vymazania od chyby načítania zoznamu; preložiť do EN/SK/CS s rovnakými placeholders. Všeobecné UI prvky ani Policy Catalog netreba meniť.

## 5. Inventár predpokladaných zmien: 22 súborov

**Spoločný UI priebeh a texty (6):**

1. `src/features/recovery-plans/hooks/usePostDeleteRefresh.ts` – nový UI hook.
2. `src/features/recovery-plans/hooks/usePostDeleteRefresh.test.tsx` – nový focused hook test.
3. `src/locales/en.json`
4. `src/locales/sk.json`
5. `src/locales/cs.json`
6. `src/locales/postDeleteRefreshTranslations.test.ts` – nový locale test.

**Policy Sets (4):**

7. `src/features/recovery-plans/policy-sets/pages/PolicySetsPage.tsx`
8. `src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx`
9. `src/features/recovery-plans/policy-sets/pages/PolicySetsRefetch.test.tsx`
10. `src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`

**Snapshot (4):**

11. `src/features/recovery-plans/recovery-policies/snapshot/pages/SnapshotPoliciesPage.tsx`
12. `src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.tsx`
13. `src/features/recovery-plans/recovery-policies/snapshot/pages/SnapshotPoliciesRefetch.test.tsx`
14. `src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx`

**Recovery Application (4):**

15. `src/features/recovery-plans/recovery-policies/application-recovery/pages/RecoveryAppPoliciesPage.tsx`
16. `src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.tsx`
17. `src/features/recovery-plans/recovery-policies/application-recovery/pages/RecoveryAppPoliciesRefetch.test.tsx`
18. `src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx`

**Clean Room (4):**

19. `src/features/recovery-plans/recovery-policies/clean-room/pages/CleanRoomPoliciesPage.tsx`
20. `src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.tsx`
21. `src/features/recovery-plans/recovery-policies/clean-room/pages/CleanRoomPoliciesRefetch.test.tsx`
22. `src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.test.tsx`

Súčet: 3 nové + 19 existujúcich; 12 aplikačných/lokalizačných súborov + 10 testov. Component testy upravia požadované callback props a overia príslušné napojenie; nebudú štyrikrát opakovať celý testovací matrix hooku. Tento inventár nezahŕňa dva plánovacie dokumenty.

## 6. Testy, riziká a akceptácia

Spoločný hook test: idle obyčajný refresh bez skeletonu; úspešné vymazanie s deferred obnovou; úspech/chyba GET; retry po chybe; rýchly výsledok; neprenesenie operácie na novú namountovanú inštanciu. Testovať viditeľné stavy a výsledky callbackov, nie konkrétne interné state premenné.

Policy Sets integračný rez overí celú maticu cez reálne generated hooks a stubovaný fetch: pomalý DELETE ešte používa existujúci confirm loading; po úspechu DELETE a počas zadržaného GET sa starý riadok nezobrazí, ale hlavičky/page/toolbar ostanú. Po GET je záznam preč; posledné vymazanie ukáže empty. Pri zamietnutom DELETE sa list GET navyše nespustí. Pri chybe GET sa zobrazí post-delete warning a retry zopakuje iba GET. Samostatný okamžitý GET prípad zachytí riziko druhého requestu.

Pri troch policy druhoch stačí menší integračný dôkaz správneho endpointu a zapojenia skeletonu v deferred intervale. Shared hook maticu ani Orval kontrakty netestovať znova. Bežný toolbar/focus refresh nesmie skeletonizovať cached riadky. Zachovať existing edit/delete payload assertions, filter state a page-size; nepridávať celé nové E2E súpravy.

Regresie bez plánovaných úprav: `DataTable.test.tsx`, štyri `*Page.test.tsx` uvedených zoznamov a Catalog `model/policyCatalog.test.ts`, `hooks/usePolicyCatalog.test.tsx`. Vizuálny smoke na jednej policy tabuľke a Policy Sets: zadržaný GET, desktop aj 390 px, stabilné hlavičky/toolbar a skeleton iba v body, klávesnicou žiadne akcie na starých riadkoch. Stubované API, bez živého DELETE.

Hlavné riziká: nadbytočný GET pri zlom načasovaní callbacku; nerozlíšená DELETE/GET chyba; skeleton pri každom background refreshi; starý error panel prekrývajúci retry skeleton; zmena filter/pagination stavu. Pokrytie vyššie je explicitná akceptácia, nie dôvod na zmenu cache pravidiel.

Za dokončené považovať až po focused Vitest, ESLint dotknutých TS/TSX, TypeScript kontrole zmenených props a `git diff --check` plus samostatnej kontrole untracked súborov. Bez kompletného test suite a produkčného buildu. Po každom reze inline review; žiadni subagenti ani zásahy do inej rozpracovanej práce bez následného pokynu.

## 7. Poradie a veci mimo rozsahu

T1 hook → T2 texty → T3 Policy Sets ako prvý kompletný rez a overenie deduplikácie → checkpoint → T4 Snapshot → T5 Recovery Application → checkpoint → T6 Clean Room → T7 focused finálne overenie. Úlohy majú najviac 4 súbory a presné kritériá v TODO. Implementovať postupne; paralelizácia nie je pre tento rozsah potrebná.

Zámerne nezmenené: shared DataTable/Skeleton/PageShell, Orval output a konfigurácia, API endpointy, query keys, selectors, cache policy, invalidácia, Policy Catalog, create/edit formuláre/payloady, automatické mazanie historických referencií a nesúvisiace Recovery Plans oblasti. Žiadna nová serverová cache, optimistic delete ani minimálny umelý čas skeletonu.

Plánovanie samo nemení produkčný kód ani existujúce task dokumenty. Automatické testy produktu neboli v tejto plánovacej úlohe spustené; pred odovzdaním overiť obsah/Markdown, cesty a whitespace oboch nových dokumentov. Otvorenou bránou zostáva používateľovo schválenie implementácie.
