# Implementačný plán: IBM Power Recovery Application Inventory

Stav: implementované inline 2026-11-05; dôkazy overenia a podmienka nasadenia sú v TODO. Dátum: 2026-11-05. FE HEAD pri analýze: `e028935c`; BE HEAD: `0f419ec`.
Checklist: [power-recovery-app-inventory-todo.md](power-recovery-app-inventory-todo.md).

## Rozsah a dôkazy

Podporiť IBM Power v existujúcom Recovery Application Inventory pri zachovaní VMware, existujúceho GET hooku, cache, retry, invalidácie a technického JSON. Používateľ 2026-11-05 schválil vykonanie plánu inline. Žiadny push, merge, BE zásah ani ručná úprava generovaných súborov.

Rel.AI nástroj nie je v relácii dostupný. CodeGraph MCP skončil s `Transport closed`; FE bol analyzovaný cez fungujúce `codegraph.cmd explore` a cielené čítanie aktuálnych súborov. BE bol čítaný priamo v `C:/Users/polnikr/source/ABCO/abco-be`: jeho CodeGraph CLI oznámil, že index nie je dostupný, hoci adresár `.codegraph` existuje. Index sa nevytváral. Analýzu preto nevydávame za overenie cez Rel.AI.

Overené BE zdroje: `api/routers/recovery_apps.py` (endpoint, `_power_inventory`, `_power_target_provider`, `_power_hmc_session`), `ibm_power/inventory.py` (vrátane testovacích scenárov), `ibm_power/lpar_ops.py::parse_vfc_layout`, aktuálne FE generované Zod schémy. BE história obsahuje všetkých päť zadaných commitov `89f197c`, `42d0924`, `d9f6dc4`, `4f1573f`, `0f419ec`. Nasadenie BE nebolo overené.

Na začiatku boli necommitnuté: `openapi/abco-api.json`, `src/generated/query/zod/index.ts`, `recoveryAppInventoryResponse.gen.ts`, `recoveryAppInventoryTier.gen.ts`, `recoveryAppInventoryVm.gen.ts`; nové sú `powerLparInfo.gen.ts`, `recoveredHost.gen.ts`, `recoveredHostVolume.gen.ts` v rovnakom Zod adresári. Všetkých osem súborov zachovať bajtovo; ich hashe boli zaznamenané. Dokumentačný commit musí obsahovať iba plán a TODO, nie tieto používateľove zmeny.

## Aktuálna architektúra a dátový tok

Skratka `A` nižšie označuje `src/features/recovery-plans/recovery-applications/`; `G` označuje `src/features/recovery-plans/recovery-groups/`.

| Miesto | Overený stav / rozhodnutie |
| --- | --- |
| `A/components/RecoveryApplicationsTable.tsx` | Detail sekcia `inventory` renderuje `RecoveryApplicationInventory` s `selectedAirflowRunId`, `active` a vybranou aplikáciou. Má existujúci gutter wrapper a tier count. Produkčnú integráciu netreba meniť. |
| `A/components/RecoveryApplicationInventory.tsx` | Blokuje Power pred target resolverom aj cez `enabled: ... && !isPower`; vracia `powerUnsupported`. Obsahuje summary, datastore karty, tier disclosures, VM riadky a JSON pre každý tier. Sem patrí spoločný GET a stavový obal. |
| `A/hooks/useDeleteRecoveryApplication.ts::targetComputeProviderIdOf` | Číta výhradne `app.data.application.target_provider_id`, pri absencii vyhodí chybu. Už opisuje VMware aj Power. Zachovať, nepoužiť source provider ani prvého providera z katalógu. |
| `src/generated/query/recovery-apps/recovery-apps.gen.ts` | `useGetRecoveryAppInventory`, query key `['/get_recovery_app_inventory', params]`; parametre obsahujú run aj compute provider. Žiadny nový endpoint, hook ani vlastný query key. |
| `src/shared/api/validatingMutator.ts` a `A/model/selectRecoveryApplications.ts` | Mutator poskytuje validovaný Output; selector `selectRecoveryApplicationInventory` len spresňuje generovaný Input typ na Output. Nový kontrakt už zahŕňa Power. Netreba ďalšiu transformáciu odpovede. |
| `A/hooks/recoveryApplicationCache.ts` | `reconcileRecoveryApplications` ruší staré requesty, invaliduje a refetchuje inventár podľa application ID v dátach alebo run ID v kľúči; nie podľa platformy. Zachovať. |
| `A/hooks/useRollbackRecoveryApplication.ts` | Reconciliation po úspechu aj chybe. Existujúci hook test už parametrizuje VMware/Power a kontroluje invalidáciu inventára. Rozšíriť iba chýbajúci integračný dôkaz, nie produkčný hook. |
| `G/components/RecoveryGroupInventory.tsx` | Vzor: sekcie, kompaktné `details/summary`, Badge, ChevronDownIcon, focus ring, `@min-[600px]/detail-content`, inline chyby a `ResponseBodyViewer`. Prevziať vizuálne pravidlá, nie storage-specific refresh/replication logiku. |
| `G/components/RecoveryGroupInventorySummary.tsx` | Vzor summary nad dátami; netreba importovať jeho hook alebo vytvárať ďalší GET observer pre aplikácie. |

Tok: detail aplikácie → run ID + uložený target provider → existujúci GET → runtime Zod → existujúci selector → spoločný header/warnings → dispatch podľa `response.platform` → VMware alebo Power view. Rollback pokračuje cez existujúcu reconciliation. Request sa povolí iba pri `active && Boolean(runId) && Boolean(target.computeProviderId)` pre obe platformy.

## Overený kontrakt a význam polí

`RecoveryAppInventoryResponseOutput` obsahuje `recovery_app_id`, `recovery_app_name`, `run_id`, `compute_provider_id`, `platform` (string, default `vmware`), `tiers`, `recovered_datastores`, `recovered_hosts` (default `[]`) a `warnings` (default `[]`). BE vracia presne `ibm_power` alebo `vmware`. Hodnota v aplikácii používa aj veľké písmená; request už nesmie byť blokovaný jej casingom.

| Oblasť | Presné polia a význam |
| --- | --- |
| Tier | `tier_name`, `recovery_group_id`, `recovery_group_name`, `vms[]`. Zobrazovať všetky entries, neodfiltrovať `found:false`. |
| LPAR entry | `name` je source meno; `source_name`, `target_name`, `target_managed_system`, `target_hmc_provider_id`, `host` sú voliteľné/nullable. `host` je očakávané meno hosta aktuálneho runu, nie automaticky dokázaný vlastník. |
| Ownership | `run`, `foreign`, `unattached`, `unknown`; schéma je voľný nullable string, nie enum. `found:true` vytvára BE len pri `run`. Neodvodzovať vlastníctvo z prefixu, názvu alebo existencie LPAR. |
| LPAR detail | `lpar.uuid`, `state`, `rmc_state`, `managed_system`, `vfc`, `ethernet`; všetko nullable/optional. `lpar` existuje aj pri foreign/unknown/unattached. |
| vFC | BE `parse_vfc_layout` vracia `slot`, `wwpns` (zoznam stringov), `vios_name`, `vios_uuid`, `port_name`, `port_wwpn`. Žiadne vymyslené `server_slot` či `backing_device`. |
| Ethernet | BE `parse_ethernet_adapters`: `slot`, `vlan`, `mac`, `switch`. VLAN a slot sú čísla alebo null. |
| Recovered host | `host`, `storage_provider_id`, `exists` (default true), `active_ports` (počet, nie zoznam), `wwpns`, `volumes`. BE aktuálne pridáva iba existujúce hosty a zachová ich aj pri chybe následného čítania. |
| Volume | `vdisk_id` string, `vdisk_name`, `scsi_id` integer, `boot` boolean (BE určuje podľa SCSI ID 0), `capacity_bytes`, `pool`, `flashcopy`. Zobrazovať dodaný boot flag, nie prepočítavať ho. |
| FlashCopy | Voľný nullable record; overené kľúče `map`, `source_vdisk`, `consistency_group`. Nie nový graf alebo odvodzovanie storage väzieb. |

LPAR sa hľadá len na cieľovom managed systéme. BE validuje Power provider a `role=target` pred čítaním credentials; chybný target/prefix je 400, nenájdená app/group môže byť 404, HMC login chyba 502. Výpadky FlashSystem či jednotlivých detailov degradujú na HTTP 200 s warnings a čiastočnými dátami. Stará VMware-only dokumentácia parametra v route nie je dôvodom ďalej blokovať Power: rozhodujúca je aktuálna vetva `_power_inventory`.

## Navrhované UI a hranice komponentov

Použiť preferované tri komponenty, bez novej knižnice alebo generického renderer frameworku:

1. `RecoveryApplicationInventory.tsx`: resolver, jediný GET, no-run/loading/error/retry, zachovanie cached dát po chybe refetchu, spoločný header a summary, warnings sekcia, platform dispatch. Props zostanú nezmenené.
2. Nový `RecoveryApplicationVmwareInventory.tsx`: mechanicky presunúť existujúce recovered datastores a tiers/VM renderovanie s tier JSON; prijíma validované dáta. Žiadny hook ani vlastné načítanie.
3. Nový `RecoveryApplicationPowerInventory.tsx`: tiers → LPAR → detail/adaptéry; samostatne hosts → volumes → FlashCopy. File-local `LparDetails`/`HostDetails` sú prijateľné pre čitateľnosť, ale neexportovať univerzálne komponenty bez druhého použitia. Prijíma `RecoveryAppInventoryResponseOutput`.

Dispatch: explicitne spracovať `vmware` a `ibm_power` z validovanej odpovede; schema default ponechá staršie VMware odpovede kompatibilné. Neznámy platform string nezobrazovať ako VMware: ukázať lokalizovanú informáciu a technický JSON namiesto nesprávnej platformovej interpretácie. Nepridávať platformu do query key. Mock fixtures majú byť parsované cez schému, aby testy neobchádzali default `platform`.

### Summary

Spoločný header: názov/ID recovery app, run ID, cieľový compute provider ID z odpovede. Power metriky: počet tiers, LPAR entries (`sum(tier.vms.length)`), počet s `found:true`, počet vrátených hostov a počet mapovaných volume entries (`sum(host.volumes.length)`). Posledné dva počty popísať ako vrátené údaje; nepredstierať úplnosť pri warnings. Volume count znamená počet mapovaní, nie deduplikované fyzické disky naprieč hostmi. VMware metriky a label VM zachovať.

### Tiers a LPAR

- Použiť kompaktné disclosures s source a target menom, stavom členstva a textovým ownership badge. HMC provider a target managed system zobrazovať aj keď detail LPAR chýba; neskladať target meno vo FE z prefixu.
- `run`: „Patrí tomuto runu“ (success); `foreign`: „Patrí inému hostu“ (error); `unattached`: „WWPN bez hosta“ (warning); `unknown`: „Vlastníctvo neoverené“ (warning). Žiadny stav nesmie byť rozlíšený iba farbou.
- Pri `lpar != null` a `found:false` zobraziť existujúcu LPAR a detail s dôvodom podľa ownership; nepoužiť jednoduché „LPAR neexistuje“. Pri `lpar == null` použiť konzervatívne „LPAR nenájdená alebo nenačítaná“: rovnaký tvar BE vracia pri skutočnej absencii aj zlyhaní lookupu. Nevytvárať parser voľných warning textov na rozlíšenie príčiny.
- `other_hosts` s neprázdnym zoznamom viditeľne vypísať. Pri `run` + `other_hosts` zostáva `found:true`, ale aj na zbalenom LPAR riadku upozorniť na súbežné vlastníctvo WWPN; detail obsahuje lokalizované bezpečnostné vysvetlenie a mená hostov. Nesmie pôsobiť ako bezvýhradný úspech.
- UUID, LPAR state, RMC state a managed system v responzívnom zozname label/hodnota. Stavové labely lokalizovať; neznáme technické hodnoty zo servera zachovať, neskladať neoverený enum HMC stavov.
- vFC a Ethernet vo vlastných podsekciách. WWPN/MAC/UUID zalamovať a zachovať kopírovateľný text. `null`/absencia zoznamu = nedostupné údaje; `[]` = neboli vrátené adaptéry. Typovo neplatná hodnota vo voľnom recorde = „—“, nikdy `[object Object]` alebo vymyslená nula.

### FlashSystem hosty a volumes

- Sekcia mimo tier/LPAR filtra: iterovať priamo `recovered_hosts`. Zobraziť aj host bez LPAR a host s prázdnymi volumes po chybe. Neoznačovať chýbajúcu LPAR automaticky za dôkaz bezpečne odstrániteľného hosta; bez cleanup akcií.
- Host header: meno, storage provider, active ports, počet vrátených volumes; detail obsahuje WWPN a prípadný `exists:false` ako reportovaný stav. Neodvodzovať existenciu z aktívnych portov (`0` je platné).
- Volume: ID aj meno, SCSI ID vrátane `0`, badge boot iba podľa `boot`, kapacita v bajtoch s lokalizovaným formátovaním čísla a jednoznačnou jednotkou, pool; FlashCopy map/source vdisk/consistency group. Nepoužiť truthy fallback na čísla. Pri null kapacite neukazovať 0 B.
- `flashcopy:null` označiť ako nedostupnú/nevrátenú väzbu, nie istotu „disk nemá FlashCopy“: null vzniká aj pri neúspešnom lsfcmap a warningu.
- Zachovať tier JSON a doplniť JSON pre host/volume alebo celý Power inventory pomocou existujúceho `ResponseBodyViewer`, `defaultOpen={false}`. Neznáme record kľúče ostanú dostupné v JSON.

### Warnings, cache a úzke obrazovky

Samostatná pomenovaná warnings sekcia je viditeľná pred platformovými detailmi, aj ak tiers/hosts sú prázdne. Obsah `warnings[]` vykresliť ako text, nie HTML; backendové technické správy neprekladať. Lokalizovať nadpis a vysvetlenie čiastočného výsledku. HTTP 200 s warnings nemení query na error a neskrýva dostupné dáta. Chyba background GET ponechá staré údaje a samostatný `FetchErrorAlert` ako dnes.

Prevziať `min-w-0`, flex-wrap, tokeny border/surface/text a container breakpoint z Recovery Group Inventory. Pri 360/390 px obsah skladaný pod seba, dlhé identifikátory a warnings sa zalamujú, žiadny horizontálny scroll celého draweru; lokálny scroll JSON vieweru je prípustný. `summary` musí byť ovládateľné klávesnicou s focus ringom. Žiadny nový polling, storage refresh endpoint, topológia alebo HMC fetch vo FE.

## Úlohy, závislosti a akceptácia

### 1. Oddeliť VMware renderer bez zmeny správania

Rozsah M, 3 súbory: `A/components/RecoveryApplicationInventory.tsx`, nový `RecoveryApplicationVmwareInventory.tsx`, existujúci `RecoveryApplicationInventory.test.tsx`. Závislosti: žiadne.

- [x] Presunúť iba VMware datastore/tier JSX; spoločný obal a header ponechať v kontajneri.
- [x] Zachovať existujúce metriky, JSON, keying, loading/error/retry a cache isolation test.
- [x] Existujúce testy prejdú; mock odpovede používajú validovaný Output vrátane default platformy.

Overenie: inventory Vitest + cielený ESLint troch súborov. Žiadna produkčná zmena cache/hooks.

### 2. Pripraviť jazykový kontrakt

Rozsah M, 4 súbory: `src/locales/en.json`, `sk.json`, `cs.json`, nový `src/locales/powerRecoveryInventoryTranslations.test.ts`. Závislosti: 1.

- [x] Doplniť rovnaké neprázdne kľúče pod `recoveryInventory.power.*` pre summary, ownership, LPAR/adapter fields, hosts, volumes, FlashCopy, partial data a co-holding warning; spoločné warnings/unknown-platform labely pod `recoveryInventory.*`.
- [x] Lokalizovať stavové vysvetlenia a jednotky/placeholdery; MAC/WWPN/IP/UUID ponechať ako technické názvy. Neznámy ownership zobrazovať bezpečne s pôvodnou hodnotou, nie ako run.
- [x] Test overí paritu kľúčov a interpolation placeholderov v troch jazykoch. `powerUnsupported` odstrániť až v úlohe 3 spolu s odpojením jeho použitia, aby medzikrok zostal funkčný.

Overenie: nový locale Vitest a JSON parse. Kontrolný bod po 1–2: VMware bez regresie, texty pripravené.

### 3. Sprístupniť Power GET, summary a vlastníctvo

Rozsah M: kontajner, nový `A/components/RecoveryApplicationPowerInventory.tsx`, inventory test, nový `RecoveryApplicationPowerInventory.test.tsx` (4 TSX súbory). Odstránenie troch zastaraných locale kľúčov je samostatný malý cleanup krok po zelenom teste, bez ďalšej logiky. Závislosti: 1–2.

- [x] Odstrániť Power request gate a obsolete komentár; spoločný target resolver pre obe platformy, rovnaké enabled podmienky a reálny GET s uloženým target ID. No-run/inactive/missing-target nevykonajú sieťový request.
- [x] Summary a tier/LPAR zoznam rozlišujú fyzický detail od ownership; všetky štyri ownership stavy, chýbajúci detail a `run + other_hosts` sú pokryté.
- [x] Dispatch podľa response platformy vrátane legacy VMware defaultu a neznámej hodnoty; odstrániť pôvodný test očakávajúci blokovanie Power a všetky použitia `powerUnsupported`.

Overenie: oba inventory Vitest súbory; request test cez skutočný hook/mutator a fetch stub, nie iba mock `enabled`. Cielený ESLint a locale test po cleanup kroku.

### 4. Doplniť LPAR a sieťové adaptéry

Rozsah S, 2 súbory: Power komponent a jeho test. Závislosti: 3.

- [x] Zobraziť všetky overené LPAR, vFC a Ethernet polia vrátane VIOS/port údajov, source/target mená a HMC/managed system.
- [x] File-local typové kontroly čítajú string/finite number/string array z `Record<string, unknown>`; žiadne `as` tvrdenie predstierajúce pevný API typ, globálny normalizer alebo nové schémy v generated priečinku.
- [x] Testovať null, absent, prázdne aj nesprávne typované record hodnoty a platnú nulu; neznáme detaily ostanú v JSON.

Overenie: Power component test, cielený ESLint. Kontrolný bod po 3–4: GET → Power LPAR UI s korektnou bezpečnostnou interpretáciou.

### 5. Doplniť nezávislú host/volume sekciu

Rozsah S, 2 súbory: Power komponent a jeho test. Závislosti: 4.

- [x] Priamo z recovered_hosts zobraziť aj osirelé/čiastočne načítané hosty; count summary je konzistentný s vrátenými entries.
- [x] Volumes obsahujú SCSI 0, boot flag, capacity bytes, pool, všetky tri overené FlashCopy kľúče; rovnaký vdisk u viacerých hostov sa nestratí chybným dedupe/keyingom.
- [x] Prázdne/null údaje nepredstierajú úplnosť; host a tier majú prístup k technickému JSON.

Overenie: Power component test vrátane hosta bez LPAR a hosta s active_ports null, volumes [] a warningom; cielený ESLint.

### 6. Overiť čiastočné výsledky a lifecycle/cache

Rozsah M, najviac 3 testy plus kontajner: `RecoveryApplicationInventory.tsx`, jeho test, `RecoveryApplicationPowerInventory.test.tsx`, `A/hooks/useRollbackRecoveryApplication.test.tsx`. Závislosti: 3–5.

- [x] HTTP 200 warnings zobrazí dáta aj samostatnú warnings sekciu; initial error a cached refresh error majú odlišné správanie, retry funguje.
- [x] Reálny query test rozlíši run ID aj target provider pri prepnutí aplikácie; inactive/no-run/missing-target nevytvárajú fetch. Zachovať referenčný VMware cache test.
- [x] Existujúcu rollback invalidáciu overiť aj s Power inventory response a neovplyvneným iným runom; úspech aj chyba rollbacku obnovujú relevantný inventár. Produkčné cache/hooks meniť len pri preukázanej chybe, ktorá zatiaľ nebola zistená.

Overenie: inventory, Power a rollback testy; typecheck. Kontrolný bod po 5–6: čiastočné výsledky a lifecycle zachovávajú dostupné dáta.

### 7. Záverečná regresia a vizuálna kontrola

Rozsah S, bez plánovanej novej produkčnej logiky; aktualizovať iba tento plán/TODO s dôkazmi. Závislosti: 1–6.

- [x] Prejdú nižšie uvedené explicitné testy, typecheck, cielený ESLint, JSON validácia a diff check.
- [x] Reálny prehliadač: Power aj VMware, warnings/co-holding, keyboard disclosures a 360/390 px drawer; zaznamenať výsledok alebo presný environment blocker, nepredstierať vizuálne overenie cez jsdom.
- [x] Review potvrdí zachovanie Orval zmien, žiadne nové fallbacky providerov, závislosti ani zmeny BE; atomické commity iba autorizovaných súborov, bez push/merge v tejto úlohe.

## Testovacia matica a príkazy

| Požiadavka | Najmenší relevantný dôkaz |
| --- | --- |
| Power GET / target ID | inventory test: IBM_POWER aj ibm_power v app; skutočný request `run_id` + target, source sa nepoužije |
| VMware regresia | pôvodné summary, datastore/tier/VM a JSON assertions po extrakcii |
| run/found | Power test s found true, ownership run |
| foreign/unattached/unknown/absencia | parametrizované Power fixtures: detail sa zobrazuje aj pri found false, null LPAR má odlišné vysvetlenie |
| other_hosts | run ostáva found, zároveň viditeľný warning aj mená co-holders |
| Adaptéry | overené vFC/Ethernet polia, nulové aj chýbajúce hodnoty |
| Orphan hosts | recovered_hosts bez zodpovedajúcej LPAR stále viditeľné |
| Volume a FlashCopy | SCSI 0/boot, capacity 0/null, pool, map/source/CG, bez truthy strát |
| Čiastočné údaje | HTTP 200 warnings + neprázdne dáta; prázdne hosts/volumes neznamenajú garantovanú absenciu |
| Loading/error/retry/cache | real hook + QueryClient: initial fail, successful retry, background fail, zmena run/target |
| Rollback | relevantná Power cache invalidovaná/refetchovaná; iný run nedotknutý |
| Úzka obrazovka | browser 360/390 px a desktop, dlhé mená/WWPN, keyboard/focus |

Plánované príkazy z FE root; pri implementácii spúšťať najprv iba testy konkrétneho kroku, celý výber raz na záver:

```powershell
$feature = 'src/features/recovery-plans/recovery-applications'
npm.cmd exec -- vitest run "$feature/components/RecoveryApplicationInventory.test.tsx" "$feature/components/RecoveryApplicationPowerInventory.test.tsx" "$feature/hooks/useRollbackRecoveryApplication.test.tsx" src/locales/powerRecoveryInventoryTranslations.test.ts
npm.cmd run typecheck
npm.cmd exec -- eslint "$feature/components/RecoveryApplicationInventory.tsx" "$feature/components/RecoveryApplicationVmwareInventory.tsx" "$feature/components/RecoveryApplicationPowerInventory.tsx" "$feature/components/RecoveryApplicationInventory.test.tsx" "$feature/components/RecoveryApplicationPowerInventory.test.tsx" "$feature/hooks/useRollbackRecoveryApplication.test.tsx" src/locales/powerRecoveryInventoryTranslations.test.ts --max-warnings 0
node -e 'const fs=require("node:fs"); for(const lang of ["en","sk","cs"]) JSON.parse(fs.readFileSync("src/locales/"+lang+".json","utf8"))'
git diff --check
```

Ak implementácia predsa zmení Table integráciu, pridať jej priamo dotknutý `RecoveryApplicationsTable.test.tsx`; ak zmení target helper, pridať `useDeleteRecoveryApplication.test.ts`. Inak tieto produkčné moduly ponechať. Group Inventory sa používa ako UI vzor, preto sa jeho testy automaticky nespúšťajú. Nevolať `npm test`, `npm run build`, `npm run check`: build spúšťa kompletnú sadu. BE testy ani HMC/FlashSystem spojenia nie sú potrebné pre tvorbu plánu.

## Rozsah súborov

Plánovaná implementácia: 3 produkčné TSX (1 existujúci + 2 nové), 3 locale JSON, 3 komponentové/hook testy (2 existujúce + 1 nový) a 1 nový locale test = **10 súborov**, plus aktualizácia dvoch dokumentov. Generované schémy sú už používateľov vstup, nie ručne implementované zmeny. `selectRecoveryApplications.ts`, cache, target helper, rollback hook, Table a Group Inventory sú analyzované integračné body bez plánovanej produkčnej úpravy.

## Riziká a otvorené technické otázky

| Riziko / hranica kontraktu | Rozhodnutie |
| --- | --- |
| LPAR existuje, ale found false | Oddeliť lpar detail od členstva runu; žiadny filter podľa found |
| run + co-holders | Viditeľný varovný stav aj pri found true; údaje BE nemeníme |
| Null LPAR: skutočná absencia vs lookup chyba | Kontrakt nemá samostatný status; konzervatívny text + warnings, nie parsovanie správ |
| Voľné vFC/Ethernet/FlashCopy records | Čítať iba overené kľúče s malými file-local type guards, raw JSON zachovať |
| Neúplné host údaje vracajú [] / null | Počty sú vrátené entries, nie garancia; warnings zostávajú viditeľné |
| Orphan rozsah | Endpoint vracia očakávané hosty aktuálneho runu odvodené zo source entries, nie kompletný sken zvyškov všetkých starších runov. FE zobrazí všetko v odpovedi; širšie vyhľadávanie by bolo samostatné BE zadanie. |
| Default platform vmware na starších BE | Zachovať kompatibilitu VMware; Power nasadiť proti podporovanému BE, neodhadovať odpoveď podľa prázdnych polí |
| Zastaralý endpoint docstring | Implementácia už Power podporuje; dokumentačná oprava BE je mimo FE rozsahu |

Otvorené, neblokujúce plán: potvrdiť nasadenie BE `0f419ec` alebo novšieho na cieľovom prostredí. Ak produkt potrebuje presne odlíšiť „neexistuje“ od „lookup zlyhal“ alebo úplný zoznam všetkých orphan hostov, bude potrebný dodatočný BE kontrakt; súčasné FE to nesmie vymýšľať. Ak je vykonanie analýzy konkrétne cez Rel.AI podmienkou prijatia, treba sprístupniť jeho nástroj. Samotné navrhnuté zobrazenie je realizovateľné z overeného lokálneho kontraktu.
