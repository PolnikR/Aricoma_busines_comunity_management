# Plán: Recovery Group topology UI a backend integrácia

## Rozsah a pracovisko

Realizovať schválený návrh Local / Metro Mirror Existing v produkčnom Recovery Group wizarde, vrátane načítania, editácie a uloženia cez existujúce Orval-generated hooks. Zachovať vzhľad aplikácie a kompaktný drag-and-drop výber s auxiliary inputom priamo v riadku volume.

Pracovať výhradne vo vetve `prototype/recovery-group-topology`, worktree `.worktrees/topology-preview`. Pred každou mutáciou Gitu overiť vetvu. Neprepínať hlavný checkout a nemeniť vetvu `test`. Tento dokument je plán; jeho vytvorenie nespúšťa implementáciu.

Vizuálny podklad: `src/features/recovery-plans/recovery-groups/prototype/TopologyPreview.tsx` a `AuxiliaryVolumeDropZone.tsx`. Prototyp nepremiestňovať do produkcie ako hotový komponent; produkčná verzia použije shared primitíva a reálne dáta.

Starý plán Compact Recovery Inventory bol dokončený (všetky úlohy v tasks/todo.md boli označené). Jeho história zostáva v Gite. Aktuálny checklist je `tasks/todo.md`.

## Overený stav projektu

- `src/generated/query/zod/recoveryGroup.gen.ts` a read schémy poznajú `topology: local | metro_mirror`, `metro_mirror.mode`, `consistency_group_id` a `volumes[].auxiliary_name`. Chýbajúca topology má default local.
- Provider schéma a `selectProviders` zachovávajú `partnerProviderId` a `credentialStatus`.
- `useRecoveryGroups.ts` používa `useGetRecoveryGroups`, `useSubmitRecoveryGroup`, generated delete/rollback hooks. Starý `api/recoveryGroupsApi.ts` už neexistuje; neobnovovať ho.
- `mapRecoveryGroups.ts` uchováva rawRecord, ale draft/normalizovaný model a submit mapper nové hodnoty nepodporujú. `toRecoveryGroupJson` bez rawRecord má dokonca topology natvrdo local.
- `useRecoveryGroupRelatedVolumes` už prijíma explicitný FlashSystem ID a používa existujúce query options z `inventoryQueries`. Nevracať starý defaultFlashcopyProviderId model.
- Source sa dnes vyberá v Related storage; pri zmene/clear sa resetujú relatedVolumes. Presun do Topology musí tieto závislosti riešiť vedome.
- Schéma povoľuje managed, ale zadanie povoľuje iba existing. Schéma sama nevynucuje povinný auxiliary názov ani consistency group; potrebná je frontend doménová validácia.

## Rozhodnutia a dátový kontrakt

### Topology a Source

1. Topology dropdown: Local / Metro Mirror. Metro Mirror mode dropdown: Existing; Managed disabled s Coming soon. Target je odvodený zo Source.partnerProviderId, nikdy editable select ani samostatné uložené ID.
2. Nová skupina začína bez zvolenej topology. Starý záznam bez topology sa načíta ako local. Načítaný managed záznam označiť ako nepodporovaný a zablokovať save; nesmie sa potichu konvertovať na existing.
3. Výber Source: iba FLASHCOPY s credentialStatus ok. Na rozlíšenie partnera používať úplný zoznam providerov, nie len source-role filter. Partner musí existovať, byť iný FLASHCOPY a mať platné credentials. Missing/unknown/self/wrong-type partner a chyba načítania providerov blokujú Metro Mirror pokračovanie s konkrétnou správou.
4. Provider status nie je dôkaz funkčnej replikácie. Nezavádzať health endpoint ani tvrdenie o overení relationship.
5. Draft rozšíriť o topology, metroMirrorMode, consistencyGroupId a auxiliaryNamesByVolume. Typy topology/mode odvodiť z generated Output typov. Source ukladať v existujúcom draft.relatedVolumeProviderId (aj počas výberu topology pred workloadom); nový duplicitný Source stav nezavádzať.
6. Pre VM skupinu je providerId compute provider a relatedVolumeProviderId Source. Pre volume-only flow sa pri zvolení storage workloadu providerId synchronizuje so Source; Provider krok môže zobraziť tento zdroj read-only. Neumožniť dve odlišné voľby storage providera. Načítanú volume-only skupinu inicializovať so Source z group.providerId.

### Wire payload a round-trip

- `provider_id_volume` je vždy SOURCE; pri Metro Mirror nikdy partner.
- `provider_id_vm` je compute provider; pri volume-only skupine zostáva existujúca konvencia prázdnej hodnoty.
- Local posiela topology local, volumes s name; vynechá metro_mirror aj auxiliary_name.
- Metro Mirror posiela topology metro_mirror, metro_mirror `{ mode: 'existing', consistency_group_id: trimmedString }`; každý vybraný source volume posiela `{ name, auxiliary_name: trimmedString }`.
- VM flow čerpá volumes z relatedVolumes; volume-only flow z resources. Mapovanie auxiliary musí podporovať oba.
- Consistency Group ID je text, nie number: zachovať napr. `001`. Overiť neprázdnu trimmed hodnotu, nevymýšľať numerické obmedzenia.
- Použiť súčasný submit hook a jeho query params provider_id / push_to_orchestrator; nemeniť význam orchestration.
- GET → model → draft → submit aj model → JSON musia zachovať topology a auxiliary mapping. Zachovať VM metadata, orchestration údaje a rawRecord passthrough pri exporte. Existujúce podporované polia nesmú miznúť pri editácii len kvôli topológii.
- Po úspešnom submit preferovať zodpovedajúci záznam servera podľa ID, ak je dostupný; fallback toRecoveryGroup musí zachovať nové polia. Overiť aktuálnu cache invalidáciu generated vrstvy, nevytvárať paralelnú cache.

### Prechody a kompatibilita

- Local → Metro Mirror: zachovať Source a source volumes, vyžadovať CG ID a auxiliary údaje. Metro Mirror → Local: vyčistiť CG ID aj auxiliary mapu; nič z nich neposlať do Local payloadu.
- Zmena Source: vyčistiť source volume výber, auxiliary mapu, CG ID a discovery suppression/cache identitu v builderi. Zachovať compute provider, VM výber, Policy Set a orchestration. Znovu discoverovať len s novým Source.
- Zmena VM/compute/workload: resetovať príslušné existujúce downstream údaje, odstrániť auxiliary údaje odstránených volumes. Platné mapovanie rovnakého volume na rovnakom Source zachovať pri návrate medzi krokmi.
- Samotná zmena workload typu nesmie vymazať Topology ani zvolený Source. Oddeliť existujúci reset relatedVolumeProviderId od resetu relatedVolumes; pri volume-only synchronizovať providerId so Source.
- Drop je idempotentný; odstránenie volume vymaže jeho auxiliary údaj. Opätovný drop neobnoví starý auxiliary názov. Clear selection nevymaže Source z Topology.
- Manuálne pridané volumes nezmiznú pri refetchi; ručne odobraté discovered volumes sa nesmú okamžite vrátiť cez builder useMemo. Evidence výnimiek viazať na Source + compute + VM kontext. Neskorý výsledok starého dotazu nesmie prepísať novú voľbu.
- Local si ponechá existujúci voliteľný Related storage. Legacy Local VM záznam bez storage môže zostať bez storage pri editácii, ak nemá volumes; netreba vymýšľať Source. Nový create flow vyžaduje Source v Topology. Pri Metro Mirror vyžadovať aspoň jeden source volume a auxiliary pre každý.
- Next, sidebar aj Create/Save uplatnia rovnakú validáciu. Provider invalidácia počas editácie blokuje save bez straty zadaných hodnôt. Chyby BE ponechajú draft a existujúce error UI.

## Shared UI a rozloženie

- Použiť existujúce WizardSteps, Field, Select, Input, Button, Badge, ResourceSidebar, ResourceSelectionCard, EmptyState, ListSkeleton a FetchErrorAlert. Existujúce Policy Set/Orchestration komponenty zachovať a napojiť na reálne dáta.
- Rozšíriť ResourceSelectionCard o voliteľný `renderItemContent?: (resource: string) => ReactNode`. Slot nahradí iba obsah vybraného riadku; shared komponent naďalej vlastní drop, scroll, empty state a remove. Predvolené renderovanie a checkbox režim zostanú bez zmeny. Nepoužiť tento slot na vnáranie ďalšieho remove buttonu.
- Ak pre skrátený text s prístupným úplným názvom neexistuje vhodný shared prvok, vytvoriť `src/shared/components/truncated-text/TruncatedText.tsx` a test. Názov skracovať iba prezentačne, plná hodnota musí byť dostupná cez hover, focus aj touch a pre screen reader; nikdy nemení ID/payload. Bez kopírovania prototype drop handlerov do produkcie.
- Feature ResourcesStep dostane voliteľný row-content prop a prepošle ho do shared selection card. Feature kompozícia riadku: Source názov, shared Input size sm pre Auxiliary, shared remove. Jeden volume = jeden riadok, bez duplicitnej tabuľky a bez badge pri každom inpute.
- Local/Metro form je kompaktný: Source a read-only Target v jednom riadku, Mode a CG ID v ďalšom. Na úzkej obrazovke stĺpce prejdú pod seba.
- Vyjsť z existujúceho aplikačného layoutu, nie z prototypového samostatného main h-dvh. Propagovať flex-1/min-h-0/overflow-hidden od page k wizardu; footer shrink-0. Scrollovať inventory a selection list v dostupnom priestore, nie celú stránku. Pri nedostatku výšky dovoliť scroll obsahu kroku, nikdy skryť tlačidlá.
- VM flow: Details, Topology, Resource type, Provider, Resources, Related storage, Policy Set, Orchestration (8). Volume flow bez Related storage (7); inline auxiliary polia sú v Resources. Indexy centralizovať v existujúcom calculateRecoveryGroupStepIndices.
- Všetok nový produkčný text lokalizovať v en/sk/cs. Nenosiť do produkcie mock toolbar, query-param shortcuts, demo payload ani sample providery.

## Poradie a úlohy

V cestách nižšie `RG/` = `src/features/recovery-plans/recovery-groups/`. Každá úloha: najprv relevantný failing test, minimálna implementácia, focused overenie, atomic commit. Úlohy vykonávať sekvenčne kvôli spoločnému builder/model stavu.

### T1 — Model a čítanie Local/Metro Mirror (M)
Opis: Rozšíriť normalizovaný read model a draft bez straty kontraktových hodnôt.
Súbory: RG/model/recoveryGroupTypes.ts; RG/helpers/mapRecoveryGroups.ts; RG/helpers/mapRecoveryGroups.test.ts.
Akceptácia: legacy default local; zachované CG/mode/auxiliary pre VM aj volume; rawRecord a VM metadata zostávajú zachované.
Overenie: `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts`.
Závislosti: žiadne. Nové draft polia zaviesť kompatibilne s existujúcimi fixtures; pri integrácii builder inicializuje všetky explicitne.

### T2 — Submit validácia a payload (M)
Opis: Uložiť Local aj Metro Mirror cez existujúci typed mapper a blokovať neúplný draft.
Súbory: RG/api/recoveryGroupsValidation.ts; nový RG/api/recoveryGroupsValidation.test.ts; RG/helpers/mapRecoveryGroups.ts; RG/helpers/mapRecoveryGroups.test.ts.
Akceptácia: presné payloady pre oba režimy/oba resource typy; odmietnutie managed, prázdneho CG/auxiliary a duplicitných source names; Local zahodí Metro polia a zachová legacy optional storage.
Overenie: explicitne oba test súbory. Testy zahŕňajú CG `001`, whitespace a normalizáciu názvov bez straty mapovania.
Závislosti: T1.

### Kontrolný bod A
Read/write round-trip funguje na fixture kontraktoch; nebol zmenený generated kód ani wire endpoint. Skontrolovať model/mapper diff pred UI integráciou.

### T3 — Reálny submit a načítanie (M)
Opis: Pripojiť nové údaje v existujúcom useRecoveryGroups k generated mutácii, výsledku a refetchu.
Súbory: RG/hooks/useRecoveryGroups.ts; RG/hooks/useRecoveryGroups.test.tsx.
Akceptácia: create/update odovzdajú správne body a zachované query params; vyberie sa správny returned record; následné GET/edit obsahuje rovnakú topológiu a mapovanie. Chyba submit nič nevymaže. Pred mutateAsync znovu overiť zvolený Source/partner voči dostupným providers a zamedziť submitu počas načítania/chyby; zachovať výnimku legacy Local bez storage. Nepoliehať sa iba na disabled tlačidlo.
Overenie: `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx`; test s mock generated hook boundary, bez druhého API wrappera.
Závislosti: T2.

### T4 — Kompaktné shared resource riadky (M)
Opis: Pridať obsahový slot do existujúcej drop zóny a shared prístupné skrátenie názvu.
Súbory: src/shared/components/resource-selection/ResourceSelectionCard.tsx a .test.tsx; nový src/shared/components/truncated-text/TruncatedText.tsx a .test.tsx.
Akceptácia: existujúce volania a checkbox režim bez regresie; jeden input na riadok s dostupným remove; úplný názov dostupný bez zmeny dát a bez závislosti len od hover.
Overenie: focused testy oboch shared komponentov; 100 riadkov, dlhé názvy, keyboard focus, touch disclosure, drag/drop, empty state, removal.
Závislosti: žiadne.

### T5 — Topology formulár a provider pravidlá (M)
Opis: Samostatný controlled feature komponent s dropdownmi a read-only partnerom.
Súbory: nové RG/components/RecoveryGroupTopologyStep.tsx a .test.tsx; nové RG/utils/recoveryGroupTopology.ts a .test.ts; en/sk/cs kľúče zahrnúť v lokalizačnej úlohe T8.
Akceptácia: Local/Existing/disabled Managed; spoľahlivé vyriešenie partnera z all providers; loading/error/missing credentials/partner bránia pokračovaniu, retry je dostupné.
Overenie: explicitné dva nové test súbory; helper otestovať na source-role aj target-role providerovi. Komponent berie dáta a callbacks z buildera, nevytvára API hook.
Závislosti: T1. Testy do T8 môžu overovať translation keys; hardcoded produkčné fallbacky nepridávať.

### T6 — Zapojenie wizardu a závislostí (L, súdržná integrácia)
Opis: Vložiť Topology krok, presunúť Source výber a zjednotiť gate/state transitions bez nového wizard frameworku.
Súbory: RG/components/RecoveryGroupBuilder.tsx a .test.tsx; RG/utils/calculateRecoveryGroupStepIndices.ts a nový .test.ts; RG/hooks/useRecoveryGroupRelatedVolumes.ts.
Akceptácia: 8/7 krokov a správne edit prefill; provider_id_volume/discovery vždy používajú Source; zmeny Source/VM/clear/remove nemiešajú inventory ani nevracajú odstránené volumes.
Overenie: explicitné builder/index testy a regresia fixtures starých Local skupín. Overiť invalidáciu pri refetchi, neskorý discovery výsledok, dostupný Back, zakázaný sidebar bypass/save.
Závislosti: T2, T3, T5. Rozšíriť hook iba o potrebné error/refetch signály zo súčasných generated query options; nevytvárať ručné fetch hooky.

### Kontrolný bod B
Reálny Local create/edit funguje s pôvodnými voľbami; Metro topology a Source riadia správny inventory query. Typecheck odhalí draft fixtures naprieč feature. Neopravovať nesúvisiace moduly.

### T7 — Auxiliary priamo v drop riadku (M)
Opis: Prepojiť shared slot so skutočným source inventory a auxiliary mapou.
Súbory: RG/components/RecoveryGroupResourcesStep.tsx a .test.tsx; RG/components/RecoveryGroupBuilder.tsx a .test.tsx; nový RG/hooks/useRecoveryGroupRelatedVolumes.test.tsx.
Akceptácia: drop/add/remove/clear aktualizuje mapu a payload, duplicity sú ignorované; Local nemá auxiliary inputs, Metro vyžaduje hodnotu pre každý vybraný volume; funguje VM aj volume-only flow.
Overenie: explicitné tri test súbory; otestovať manuálny volume mimo discovered VM volumes, zmenu source, opätovný drop, zachovanie úprav pri refetchi. Mená sa neoverujú proti vzdialenému storage endpointu, ktorý kontrakt neposkytuje.
Závislosti: T4, T6.

### T8 — Lokalizácia a rozloženie v aplikácii (M)
Opis: Dokončiť produkčný text a výškové obmedzenia vo vnútri existujúceho app shellu.
Súbory: src/locales/en.json, sk.json, cs.json; RG/components/RecoveryGroupBuilder.tsx; nový src/locales/recoveryGroupTopologyTranslations.test.ts. Page súbory meniť iba ak meranie ukáže prerušený min-h-0 chain; potom samostatný drobný layout commit.
Akceptácia: žiadne mock texty/ovládanie; footer dostupný, žiadny horizontálny page overflow; scroll je vo volume zozname a inventory, dlhé texty nezväčšujú riadky bez interakcie.
Overenie: translation parity test; browser na 1920×1080, 1366×768, 1280×720, 768×1024, 390×844 a 200 % zoom; 0/1/100 volumes, dlhé mená, dark/light, otvorená chyba aj prázdne dáta. Na veľmi malej výške prípustný scroll obsahu, nie odrezané ovládanie. DOM test nie je dôkaz správneho layoutu.
Závislosti: T5, T7.

### T9 — Create/edit E2E kontrakt a finálne overenie (M)
Opis: Preukázať, že nové UI používa reálny kontrakt a zachováva staré skupiny.
Súbory: RG/pages/RecoveryGroupBuilderPage.test.tsx; RG/pages/RecoveryGroupEditorPage.test.tsx; RG/hooks/useRecoveryGroups.test.tsx; RG/helpers/mapRecoveryGroups.test.ts.
Akceptácia: save → reload → edit → save round-trip pre Local, Metro VM a Metro volume-only; legacy Local bez topology bez dátovej straty; server error zobrazený s nevymazaným draftom a bez falošného success.
Overenie: explicitné štyri test súbory, plus všetky zmenené focused testy z T1–T8; `npm.cmd exec tsc -- -p tsconfig.app.json --noEmit`; ESLint s explicitnými zmenenými cestami; `git diff --check`. Porovnať captured request s generated kontraktom, nie s mock payload viewerom.
Závislosti: T3, T7, T8.

### Kontrolný bod C — odovzdanie
Prešli focused testy, typecheck a vizuálne overenie v app shelli. Backend smoke test robiť iba na explicitne dostupnom dev/test prostredí, bez push_to_orchestrator; neodosielať do produkcie. Ak prostredie nie je dostupné, uviesť, že overený bol request/response kontrakt v testoch, nie živý backend.

Plný `npm.cmd run build` spúšťa aj celú suite a api:check. Podľa AGENTS.md ho nespúšťať automaticky; ak je potrebný samostatný bundling check, použiť `npm.cmd exec vite build` a uviesť presný rozsah. Generated súbory a backend sa ručne nemenia. Každý commit len v prototype worktree; merge/push do test nie je súčasťou plánu.

## Riziká a hranice

- Generated schéma je zdroj wire typov, nie dôkaz zapnutej podpory na nasadenom serveri. Reálny smoke test musí potvrdiť podporu topology/auxiliary a zachovanie polí pri GET.
- partnerProviderId sa môže medzi editáciami zmeniť. Načítať aktuálny provider, zobraziť odvodený Target a zablokovať neplatného partnera; historický Target nevymýšľať.
- Managed je v schéme, ale mimo rozsahu. Nedovoliť tichú degradáciu existujúceho záznamu.
- Návrh riadkov musí zostať shared; nový feature-specific drop engine, duplicitný API wrapper a ručné generated úpravy sú mimo rozsahu.
- Nepovažovať prázdny discovery výsledok pri chybe za úspešné načítanie; rozlišovať loading/error/empty a umožniť retry. Read-only source názov nemožno zameniť za editovateľný auxiliary názov.

## Otvorené externé podmienky

Pre napísanie kódu nie je potrebné meniť backend kontrakt. Pred živým smoke testom je potrebné identifikovať dev/test backend a existujúci pár FlashSystemov s Remote Copy skupinou. Kým nie sú dostupné, testovať generated request/response boundary bez tvrdenia o vykonanej replikácii či FlashCopy.
