# Infrastructure Topology - implementacny plan

Datum: 2026-07-17

## Ciel

Implementovat prvy read-only vertical slice stranky **Discovery & Inventory / Infrastructure** pomocou React Flow a ELK.

Prva verzia zobrazi vztahy, ktore vieme spolahlivo odvodit zo sucasneho discovery fixture:

- `Cluster -> Host`
- `Host -> Virtual Machine`
- `Virtual Machine -> Datastore`

Nebudeme zatial vytvarat VM-to-VM aplikacne zavislosti, recovery poradie ani recovery tiers. Tieto informacie su domnou buduceho Recovery Planning API a aktualne fake data ich neobsahuju.

## Co funkcionalita obsluhuje

Pouzivatel ziska vizualny prehlad o tom:

- v ktorom clustri a na ktorom hoste VM bezi,
- ake datastory VM pouziva,
- v akom power a connection stave sa VM nachadza,
- ako rychlo najst a vyfiltrovat konkretnu cast infrastruktury,
- ako znovu automaticky usporiadat diagram bez rucneho posuvania uzlov.

## Architektonicke hranice

Datovy tok bude:

```text
fixture teraz / realne API neskor
  -> Discovery Inventory API (HTTP + Zod validacia)
  -> kanonicky discovery model
  -> Infrastructure topology mapper
  -> domenove topology nodes a edges
  -> ELK layout adapter
  -> React Flow view model
  -> Infrastructure Topology UI
```

Zasadne pravidla:

1. React komponenty nebudu importovat JSON fixture priamo.
2. React Flow typy nebudu kanonickym domenovym modelom.
3. ELK bude zodpovedat iba za vypocet pozicii.
4. Topology mapper nebude vymyslat vztahy, ktore zdrojove data neposkytuju.
5. VM tabulka si zachova vlastnu server-style paginaciu. Topologia potrebuje cely zvoleny dataset, preto nebude pouzivat paginovany hook tabulky.
6. Feature-local kod zostane v `features/discovery-inventory/infrastructure`. Do `shared` sa presunie az po vzniku druheho realneho konzumenta.

## Zavisnosti krokov

```text
1 Tooling
  -> 2 Discovery boundary
      -> 3 VM compatibility
      -> 4 Topology domain + mapper
          -> 5 Topology query
          -> 6 ELK layout
              -> 7 Custom nodes
                  -> 8 Canvas
                      -> 9 Workspace controls
                          -> 10 Page integration
                              -> 11 Final validation
```

---

## Krok 1 - Pripravit kniznice a testovaci zaklad

**Co sa urobi**

- Pridat `@xyflow/react` pre interaktivny diagram.
- Pridat `elkjs` pre automaticky vypocet rozlozenia uzlov.
- Pridat Vitest a DOM testovacie utility, ak ich projekt este nema.
- Doplnit jednotny `test` script a zakladnu konfiguraciu.

**Preco**

React Flow riesi rendering, zoom, pan, selection a ovladacie prvky diagramu. ELK riesi zlozity layered layout. Testovaci zaklad je potrebny skor, nez vznikne mapper a layout logika, pretoze tie musia byt overitelne bez browsera.

**Obsluhovana funkcionalita**

Technicky zaklad celej topologie a automatizovane overenie jej datovej logiky.

**Predpokladane subory**

- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `src/test/setup.ts`

**Akceptacne kriteria**

- Baliky su uzamknute v lockfile.
- `npm run test` sa spusti aj bez existujucich testov.
- Existujuce `lint`, TypeScript kontrola a build nie su pokazene.

**Overenie**

```powershell
npm run lint
npm run test
npm run build
```

**Zavislosti:** ziadne  
**Odhad:** S

## Krok 2 - Vytvorit spolocnu Discovery Inventory hranicu

**Co sa urobi**

- Presunut HTTP nacitanie a Zod validaciu fixture do nadradenej discovery vrstvy.
- Definovat kanonicky typ `DiscoveredVirtualMachine`.
- Zachovat aj informaciu o jednotlivych virtualnych diskoch a ich datastore, ktoru dnes VM summary model zahadzuje.
- Oddelit externy DTO tvar od interneho modelu.

**Preco**

VM tabulka aj topologia citaju rovnaky discovery zdroj. Jedna validacna a mapovacia hranica zabrani dvom rozdielnym interpretaciam tych istych dat. Pri prechode na realne API sa zmeni tato vrstva, nie UI komponenty.

**Obsluhovana funkcionalita**

Bezpecne a typovane nacitanie discovery inventara pre vsetky jeho prezentacne pohlady.

**Predpokladane subory**

- `src/features/discovery-inventory/api/discoveryInventoryApi.ts`
- `src/features/discovery-inventory/model/discoveryTypes.ts`
- `src/features/discovery-inventory/api/discoveryInventoryApi.test.ts`

**Akceptacne kriteria**

- Nevalidna odpoved skonci riadenou chybou zo Zod validacie.
- Kanonicky model obsahuje VM, cluster, host, folder a zoznam diskov s datastore.
- Fixture sa nacitava iba cez HTTP klienta, nie priamym importom.
- Mapovanie je pokryte testom na reprezentativnej vzorke.

**Overenie**

```powershell
npm run test -- discoveryInventoryApi
npm run lint
```

**Zavislosti:** krok 1  
**Odhad:** M

## Krok 3 - Zachovat spravanie existujucej VM tabulky

**Co sa urobi**

- Upravit `virtualMachinesApi.ts`, aby spotreboval kanonicky discovery model.
- Ponechat view-specific filtrovanie, triedenie a paginaciu vo VM feature.
- Zjednodusit alebo upravit existujuce VM typy tak, aby neduplikovali externy DTO.
- Overit, ze pocet zaznamov, filtre a strankovanie zostali rovnake.

**Preco**

Extrakcia spolocnej API vrstvy nesmie sposobit regresiu hotovej obrazovky Virtual Machines. Tento krok vedome oddeluje zdielane nacitanie od tabulkoveho view modelu.

**Obsluhovana funkcionalita**

Existujuca VM tabulka a jej server-style paginacia nad fake API datami.

**Predpokladane subory**

- `src/features/discovery-inventory/virtual-machines/api/virtualMachinesApi.ts`
- `src/features/discovery-inventory/virtual-machines/types.ts`
- `src/features/discovery-inventory/virtual-machines/api/virtualMachinesApi.test.ts`

**Akceptacne kriteria**

- VM stranka stale zobrazi 151 zaznamov v rovnakom paginovanom modeli.
- Search, filtre a zmena page size funguju rovnako ako pred refaktorom.
- VM feature uz nevaliduje povodny fixture druhykrat.

**Overenie**

```powershell
npm run test -- virtualMachinesApi
npm run build
```

**Zavislosti:** krok 2  
**Odhad:** M

### Kontrolny bod A

Pred pokracovanim sa skontroluje:

- ze VM obrazovka nema regresiu,
- ze kanonicky discovery model obsahuje vsetky data potrebne pre topologiu,
- ze ziadny komponent necita fixture priamo.

---

## Krok 4 - Definovat domenovy model a mapper topologie

**Co sa urobi**

- Definovat topology node kinds: `cluster`, `host`, `virtualMachine`, `datastore`.
- Definovat edge kinds: `contains`, `runs`, `uses`.
- Vytvorit cisty mapper z kanonickeho discovery modelu na domenovy graf.
- Deduplikovat cluster, host a datastore uzly.
- Generovat stabilne ID uzlov a hran.

**Preco**

Domenovy graf musi byt nezavisly od React Flow aj od ELK. Vdaka tomu sa da testovat, neskor obohatit o realne API vztahy a pouzit aj v inom zobrazeni.

**Obsluhovana funkcionalita**

Prevod plocheho zoznamu VM na strukturu infrastruktury, ktoru je mozne vizualizovat.

**Predpokladane subory**

- `src/features/discovery-inventory/infrastructure/model/topologyTypes.ts`
- `src/features/discovery-inventory/infrastructure/mappers/mapInventoryToTopology.ts`
- `src/features/discovery-inventory/infrastructure/mappers/mapInventoryToTopology.test.ts`

**Akceptacne kriteria**

- Kazdy logicky objekt ma prave jeden uzol.
- Kazda VM je spojena s hostom a pouzitymi datastore.
- Cluster-host vztah je vytvoreny iba zo zdrojovych dat.
- Mapper nevytvara VM-to-VM dependency edges.
- Rovnaky vstup vzdy vytvori rovnake ID a poradie.

**Overenie**

```powershell
npm run test -- mapInventoryToTopology
```

**Zavislosti:** krok 2  
**Odhad:** M

## Krok 5 - Vytvorit topology query vrstvu

**Co sa urobi**

- Vytvorit `fetchInfrastructureTopology`, ktory nacita cely discovery inventory a zavola mapper.
- Vytvorit TanStack Query hook so samostatnym query key.
- Zachovat loading, error a retry stav bez zavislosti od prezentacnych komponentov.

**Preco**

Topologia nemoze pouzit paginovany VM hook, pretoze jedna strana tabulky nevytvara konzistentny graf. Vlastny query adapter jasne vyjadruje, ze diagram potrebuje kompletny zvoleny rozsah dat.

**Obsluhovana funkcionalita**

Asynchronne nacitanie a cacheovanie dat pre Infrastructure Topology.

**Predpokladane subory**

- `src/features/discovery-inventory/infrastructure/api/infrastructureTopologyApi.ts`
- `src/features/discovery-inventory/infrastructure/api/useInfrastructureTopology.ts`
- `src/features/discovery-inventory/infrastructure/api/infrastructureTopologyApi.test.ts`

**Akceptacne kriteria**

- Hook nepouziva page/pageSize z VM tabulky.
- API funkcia vrati domenovy graf, nie React Flow objekty.
- Chyba validacie alebo HTTP chyba sa dostane do query error stavu.

**Overenie**

```powershell
npm run test -- infrastructureTopologyApi
```

**Zavislosti:** kroky 2 a 4  
**Odhad:** S

## Krok 6 - Implementovat ELK layout adapter

**Co sa urobi**

- Previest domenovy graf do ELK vstupu.
- Pouzit layered layout s konzistentnym smerom a rozostupmi.
- Previest ELK vysledok na pozicie vhodne pre React Flow.
- Zachovat domenove data bez mutacie.

**Preco**

Pri desiatkach az stovkach uzlov nie je rucne vypocitany grid citatelny. Samostatny adapter izoluje asynchronne ELK API a umozni neskor menit layout strategiu bez zasahu do mappera alebo komponentov.

**Obsluhovana funkcionalita**

Automaticke citatelne rozlozenie clusterov, hostov, VM a datastore na platne.

**Predpokladane subory**

- `src/features/discovery-inventory/infrastructure/layout/layoutInfrastructureTopology.ts`
- `src/features/discovery-inventory/infrastructure/layout/layoutInfrastructureTopology.test.ts`

**Akceptacne kriteria**

- Kazdy uzol dostane konecnu `x` a `y` poziciu.
- Layout funkcia nemutuje vstup.
- Prazdny graf a graf s jednym uzlom skoncia bez chyby.
- Testy overuju strukturalne vlastnosti, nie krehke presne pixely.

**Overenie**

```powershell
npm run test -- layoutInfrastructureTopology
```

**Zavislosti:** krok 4  
**Odhad:** M

### Kontrolny bod B

Pred tvorbou UI sa na fixture overi:

- pocet a typy vygenerovanych uzlov a hran,
- ze vsetky uzly maju platne pozicie,
- ze mapovanie ani layout nezavisia od React komponentov.

---

## Krok 7 - Vytvorit vlastne vizualne uzly

**Co sa urobi**

- Vytvorit spolocny kompaktny node shell.
- Vytvorit samostatny komponent pre Cluster, Host, Virtual Machine a Datastore.
- Zobrazit nazov, typ a relevantny stav textom aj farbou.
- Pouzit existujuci vizualny jazyk aplikacie a ikonovu sadu.

**Preco**

Rozdielne typy infrastruktury potrebuju odlisne informacie, ale spolocnu vizualnu kostru. Samostatne subory udrzia komponenty male a umoznia ich menit bez rastu jedneho monolitickeho suboru.

**Obsluhovana funkcionalita**

Citatenie a vizualne rozlisenie jednotlivych objektov infrastruktury.

**Predpokladane subory**

- `src/features/discovery-inventory/infrastructure/components/nodes/TopologyNodeShell.tsx`
- `src/features/discovery-inventory/infrastructure/components/nodes/ClusterNode.tsx`
- `src/features/discovery-inventory/infrastructure/components/nodes/HostNode.tsx`
- `src/features/discovery-inventory/infrastructure/components/nodes/VirtualMachineNode.tsx`
- `src/features/discovery-inventory/infrastructure/components/nodes/DatastoreNode.tsx`

**Akceptacne kriteria**

- Kazdy typ uzla ma vlastny komponent.
- Stav nie je vyjadreny iba farbou.
- Text sa pri dlhsich nazvoch neprekryva s ikonami ani handles.
- Uzly maju stabilne rozmery potrebne pre ELK.

**Overenie**

```powershell
npm run lint
npm run build
```

Plus vizualna kontrola reprezentativnych uzlov v browseri.

**Zavislosti:** kroky 4 a 6  
**Odhad:** M

## Krok 8 - Vytvorit read-only React Flow canvas

**Co sa urobi**

- Vytvorit canvas s `ReactFlowProvider`.
- Registrovat custom node types.
- Zobrazit ELK pozicie, hrany, zoom/pan a standardne controls.
- Zakazat vytvaranie novych spojeni a mazanie uzlov.
- Po prvom nacitani vykonat `fitView`.

**Preco**

Canvas je prezentacna hranica diagramu. Read-only rezim zodpoveda Discovery & Inventory: pouzivatel data skuma, ale nemeni zdrojovu infrastrukturu.

**Obsluhovana funkcionalita**

Interaktivne prezeranie topologie, zoom, pan, vyber uzla a prisposobenie obsahu viewportu.

**Predpokladane subory**

- `src/features/discovery-inventory/infrastructure/components/InfrastructureTopologyCanvas.tsx`
- `src/features/discovery-inventory/infrastructure/components/topologyNodeTypes.ts`
- `src/features/discovery-inventory/infrastructure/components/InfrastructureTopologyCanvas.test.tsx`

**Akceptacne kriteria**

- Diagram sa vykresli bez editacnych operacii.
- Zoom, pan, controls a fit view funguju.
- React Flow CSS je nacitane presne raz.
- Prazdny zoznam uzlov nesposobi runtime chybu.

**Overenie**

```powershell
npm run test -- InfrastructureTopologyCanvas
npm run build
```

**Zavislosti:** kroky 6 a 7  
**Odhad:** M

## Krok 9 - Doplnit toolbar, filtre, legendu a auto-layout

**Co sa urobi**

- Vytvorit toolbar pre search, power state a host filter.
- Pridat prepnutie datastore vztahov, aby husty graf zostal citatelny.
- Pridat prikazy `Auto layout` a `Fit view`.
- Vytvorit legendu typov a stavov.
- Komponovat stav a canvas v samostatnom workspace komponente.

**Preco**

Fixture obsahuje 151 VM. Bez filtrovania a moznosti skryt sekundarne datastore hrany by diagram bol zbytocne zahlteny. Auto-layout sa spusti na poziadanie, aby automaticky neprepisoval poziciu pri kazdej drobnej interakcii.

**Obsluhovana funkcionalita**

Vyhladavanie, zuzenie topologie, kontrola vizualnej hustoty a opatovne usporiadanie diagramu.

**Predpokladane subory**

- `src/features/discovery-inventory/infrastructure/components/InfrastructureTopologyToolbar.tsx`
- `src/features/discovery-inventory/infrastructure/components/InfrastructureTopologyLegend.tsx`
- `src/features/discovery-inventory/infrastructure/components/InfrastructureTopologyWorkspace.tsx`
- `src/features/discovery-inventory/infrastructure/model/filterInfrastructureTopology.ts`
- `src/features/discovery-inventory/infrastructure/model/filterInfrastructureTopology.test.ts`

**Akceptacne kriteria**

- Search filtruje podla nazvu VM, hosta, clustra a datastore.
- Filtre zachovaju len hrany, ktorych oba konce existuju.
- Prepinac datastore vztahov nemeni zdrojovy domenovy graf.
- `Auto layout` znovu zavola ELK; `Fit view` iba upravi viewport.
- Ovladacie prvky su pouzitelne klavesnicou.

**Overenie**

```powershell
npm run test -- filterInfrastructureTopology
npm run lint
```

Plus funkcna kontrola toolbaru v browseri.

**Zavislosti:** krok 8  
**Odhad:** M

### Kontrolny bod C

Pred zapojenim do routy sa skontroluje:

- zobrazenie celeho fixture aj filtrovanej podmnoziny,
- citatelnost primarnej host-VM hierarchie,
- vypnutie datastore hran,
- opakovane auto-layout a fit view,
- ovladanie mysou aj klavesnicou.

---

## Krok 10 - Zapojit topologiu do Infrastructure stranky

**Co sa urobi**

- Nahradit placeholder na `InfrastructurePage`.
- Zapojit topology query a workspace.
- Zobrazit loading, error a empty state.
- Zachovat existujuci page header a app shell.

**Preco**

Stranka ma byt tenka orchestracna vrstva. Nacitanie, mapovanie, layout a prezentacia zostanu v samostatnych moduloch, aby sa dali menit a testovat izolovane.

**Obsluhovana funkcionalita**

Koncovy pouzivatelsky vstup do Infrastructure Topology cez existujucu navigaciu a routu.

**Predpokladane subory**

- `src/features/discovery-inventory/infrastructure/pages/InfrastructurePage.tsx`
- `src/features/discovery-inventory/infrastructure/components/InfrastructureTopologySkeleton.tsx`

**Akceptacne kriteria**

- Existujuca ruta `/discovery-inventory/infrastructure` zobrazi topologiu.
- Loading, error a empty stav maju jednoznacny obsah a stabilny layout.
- Stranka neobsahuje mapovaciu ani ELK logiku.

**Overenie**

```powershell
npm run lint
npm run test
npm run build
```

**Zavislosti:** kroky 5 a 9  
**Odhad:** S

## Krok 11 - Responzivita, vykon a zaverecna kontrola

**Co sa urobi**

- Skontrolovat layout pri 320, 768, 1024 a 1440 px.
- Overit vykreslenie celeho aktualneho fixture.
- Skontrolovat, ze toolbar nepreteka a canvas ma stabilnu vysku.
- Zmerat mapper a ELK layout na aktualnych datach.
- Spustit kompletnu quality gate.
- Doplnit kratku technicku dokumentaciu k datovemu toku a obmedzeniam.

**Preco**

Diagram je vyrazne citlivejsi na rozmery viewportu a pocet uzlov ako tabulka. Zaverecna kontrola musi potvrdit pouzitelnost na mobile, tablete aj desktope a zaznamenat, kde bude potrebny samostatny performance spike.

**Obsluhovana funkcionalita**

Produkcna spolahlivost prveho vertical slice a zrozumitelny handover pre realne API.

**Predpokladane subory**

- `README.md`
- pripadne cielene upravy suborov z krokov 8-10 podla zistenych problemov

**Akceptacne kriteria**

- Ziadne prekryvanie alebo horizontalne pretekanie ovladacich prvkov.
- Canvas nie je prazdny ani odrezany na testovanych viewportoch.
- Aktualny fixture sa da nacitat, filtrovat a znovu usporiadat.
- `lint`, testy a build skoncia bez chyby.
- Dokumentacia jasne uvadza, ze VM-to-VM dependencies zatial nie su dostupne.

**Overenie**

```powershell
npm run lint
npm run test
npm run build
```

Vizualne overenie na 320, 768, 1024 a 1440 px.

**Zavislosti:** krok 10  
**Odhad:** M

### Kontrolny bod D - hotovy vertical slice

Vysledok je pripraveny na prijatie, ked:

- Infrastructure ruta zobrazuje read-only React Flow diagram,
- ELK automaticky usporiada aktualne discovery data,
- filtre a ovladanie diagramu funguju,
- VM tabulka nema regresiu,
- externy fixture je validovany iba na API hranici,
- buduca vymena fixture za realny endpoint nevyzaduje zmenu komponentov,
- vsetky quality gates prechadzaju.

## Co vedome nie je v prvom rozsahu

- rucne ukladanie pozicii uzlov,
- vytvaranie alebo editovanie vztahov,
- VM-to-VM aplikacne zavislosti,
- recovery tiers, poradie obnovy a RTO/RPO,
- detailny inspector s editaciou objektu,
- backendova paginacia topologickeho grafu,
- samostatny performance spike pre 250 a 1000 uzlov.

Tieto polozky budu riesene az po potvrdeni autoritativneho API kontraktu alebo po schvaleni samostatneho rozsahu.
