# Plán: kontextová nápoveda polí providera

Stav: implementované inline v aktuálnom checkoute na pokyn používateľa, 26. 10. 2026. Automatické kontroly a nezávislé review prešli; vizuálne overenie zostáva nedokončené pre blokovanie Computer Use. Bez pushu.

## Rozsah a overené podklady

- Obsah: lokálny `C:/Users/polnikr/Downloads/Provider parameters.html`, prečítaný 26. 10. 2026. Sekcie VMWARE, FLASHCOPY, HITACHI a IBM_POWER boli posúdené samostatne. HTML sa nekopíruje do repozitára.
- Presné množiny otáznikov určuje záväzná mapa používateľa v typových sekciách nižšie. Pri `id`, `name`, `description`, `type` a `ipAddress` nikdy nepridávať otáznik.
- Závislosť: [provider-fields-centralization-plan.md](provider-fields-centralization-plan.md) a jeho TODO. `src/features/providers-connectors/providers/model/providerFieldConfig.ts` už v checkoute existuje a formulár používa `getProviderFieldConfig`; centralizácia má aj rozpracované zmeny. Pred implementáciou znovu skontrolovať `git status`/diff a aktuálny formulár, identifikovať vlastníctvo zmien a nadviazať iba na stabilný integračný bod. Rozpracované úpravy `ProviderCreateForm.tsx` nesmú byť prepísané, resetované, zahrnuté do cudzieho commitu ani automaticky považované za dokončené. Pri kolízii zastaviť konkrétny zápis a zosúladiť ho s aktuálnym stavom, bez `checkout`/`reset`.
- Preskúmané: ProviderCreateForm, ProvidersCreateModal, ProvidersCatalogueTable, Field, KeyedHelpPopover, HelpPopover, existujúce testy a EN/SK slovníky.
- Interpretácia Display: otázniky pridávať výhradne k labelom v ProviderCreateForm, ktorý zdieľajú Create a Edit. Display v ProvidersCatalogueTable zostáva bez zásahu vrátane `providers.help` aj jeho prekladov. Táto interpretácia rešpektuje explicitné technické obmedzenia požiadavky.

## Technická integrácia

1. Znovu použiť `KeyedHelpPopover`, štandardnú šírku a `sections={[]}`. Bez ďalšieho celkového helpera, štyroch formulárov alebo nového systému nápovedy.
2. Shared `Field` má `label: string` a obaľuje obsah elementom label. Pre desať dotknutých miest iba v ProviderCreateForm použiť lokálny obal s riadkom: explicitný `label htmlFor` a súrodenecký KeyedHelpPopover, pod nimi pôvodný vstup, helpery a chyby. Zachovať ID, prístupné mená a vzhľad. Nevkladať tlačidlo do labelu, nepridávať duplicitný vizuálny label. Shared FormControls a ostatné Field zostávajú bez zmeny.
3. Špecifické otázniky renderovať priamo v existujúcich podmienených blokoch polí podľa `getProviderFieldConfig(data.type)`: vmPrefix, vmTags, partnerProviderId, backingStorageProviderIds, managedSystem. Žiadna druhá runtime mapa typ → polia.
4. Spoločné otázniky role, credentialId, url, notificationEmail, cacheRefreshSeconds pripojiť k ich labelom iba pri platnom infraštruktúrnom type podľa existujúceho `PROVIDER_TYPES`. Pri prázdnom/neznámom type žiadne otázniky. Dokumentačná mapa a nezávislé testové očakávania nie sú ďalší runtime resolver.
5. Ak integračný bod centralizácie nie je pripravený, dokončiť ho samostatne v jej schválenom rozsahu. Tento plán nepridáva vstupy, neresetuje draft a nemení API, validáciu, payload, query, dirty guard ani create/edit workflow. Existujúce inline helpery zostávajú.
6. Existujúci HelpPopover už rieši portál, hover, focus, klik, close a Escape v capture fáze. Použiť bez úprav; ochranu nadradeného modalu overiť integračne.

Úlohy: [provider-form-field-help-todo.md](provider-form-field-help-todo.md).

## VMware (VMWARE)

Zdroj: samostatná sekcia HTML `VMWARE`, stĺpce Effect a Default. Presná množina otáznikov (8): `role`, `credentialId`, `url`, `vmPrefix`, `vmTags`, `notificationEmail`, `cacheRefreshSeconds`, `backingStorageProviderIds`. Žiadne ďalšie polia.

| Parameter | Default v HTML | EN – úplný obsah | SK – úplný obsah |
| --- | --- | --- | --- |
| `role` | `source` | Choose the source (production) or target (recovery environment) side of a recovery. Documented default: source. | Vyberte zdrojovú stranu (produkcia) alebo cieľovú stranu (prostredie obnovy). Dokumentovaná predvolená hodnota: source. |
| `credentialId` | `none` | Stored credential used to sign in to this provider. Resolved for each request; its status can be OK, missing or not set. Default: not set. | Uložené prihlasovacie údaje na prihlásenie k poskytovateľovi. Vyhodnocujú sa pri každej požiadavke; ich stav môže byť v poriadku, chýbajúce alebo nenastavené. Predvolene: nenastavené. |
| `url` | `none` | Base URL of the provider’s web or REST endpoint. Default: not set. | Základná URL webového alebo REST rozhrania poskytovateľa. Predvolene: nenastavená. |
| `vmPrefix` | `none` | Optional default name-prefix filter for narrowing the selection of VMware Resources. Default: not set (no prefix filter). | Voliteľný predvolený filter podľa prefixu názvu na zúženie výberu VMware Resources. Predvolene: nenastavený (bez filtra podľa prefixu). |
| `vmTags` | `[]` | Optional default list of tag names used as a filter to narrow the selection of VMware Resources. Default: an empty list (no tag filter). | Voliteľný predvolený zoznam názvov tagov používaný ako filter na zúženie výberu VMware Resources. Predvolene: prázdny zoznam (bez filtra podľa tagov). |
| `notificationEmail` | `none` | Email address for notifications about failures of this provider. Enter a valid email address. A recovery group’s notification email takes precedence over its volume provider’s address. Default: not set. | Emailová adresa na oznámenia o zlyhaniach poskytovateľa. Zadajte platnú emailovú adresu. Notifikačný email skupiny obnovy má prednosť pred adresou jej poskytovateľa zväzkov. Predvolene: nenastavená. |
| `cacheRefreshSeconds` | `none → type-level default` | Discovery cache refresh interval for this provider, in seconds. Use a positive whole number. When not set, the default for this provider type from the cache configuration is used. | Interval obnovovania cache zisťovania zdrojov tohto poskytovateľa v sekundách. Použite kladné celé číslo. Ak nie je nastavený, použije sa predvolený interval pre daný typ poskytovateľa z konfigurácie cache. |
| `backingStorageProviderIds` | `[]` | Select the FLASHCOPY or HITACHI storage providers that back this compute environment. Each ID must refer to an existing storage provider and appear only once. Default: an empty list. | Vyberte poskytovateľov úložiska FLASHCOPY alebo HITACHI, ktorí zabezpečujú úložisko tohto výpočtového prostredia. Každé ID musí odkazovať na existujúceho poskytovateľa úložiska a môže byť uvedené iba raz. Predvolene: prázdny zoznam. |

Pre VMWARE overiť presnú množinu otáznikov v Create/Edit a EN/SK texty podľa tabuľky. Interakcie shared HelpPopover netestovať opakovane pre každý otáznik.

## FlashCopy (FLASHCOPY)

Zdroj: samostatná sekcia HTML `FLASHCOPY`, stĺpce Effect a Default. Presná množina otáznikov (6): `role`, `partnerProviderId`, `credentialId`, `url`, `notificationEmail`, `cacheRefreshSeconds`. Žiadne ďalšie polia.

| Parameter | Default v HTML | EN – úplný obsah | SK – úplný obsah |
| --- | --- | --- | --- |
| `role` | `source` | Choose the source (production) or target (recovery environment) side of a recovery. Documented default: source. | Vyberte zdrojovú stranu (produkcia) alebo cieľovú stranu (prostredie obnovy). Dokumentovaná predvolená hodnota: source. |
| `partnerProviderId` | `none` | Select the partner FlashSystem in a Metro Mirror system partnership. It must be an existing FLASHCOPY provider other than this provider. Default: not set. | Vyberte partnerský FlashSystem v systémovom partnerstve Metro Mirror. Musí ísť o existujúceho poskytovateľa FLASHCOPY odlišného od tohto poskytovateľa. Predvolene: nenastavený. |
| `credentialId` | `none` | Stored credential used to sign in to this provider. Resolved for each request; its status can be OK, missing or not set. Default: not set. | Uložené prihlasovacie údaje na prihlásenie k poskytovateľovi. Vyhodnocujú sa pri každej požiadavke; ich stav môže byť v poriadku, chýbajúce alebo nenastavené. Predvolene: nenastavené. |
| `url` | `none` | Base URL of the provider’s web or REST endpoint. Default: not set. | Základná URL webového alebo REST rozhrania poskytovateľa. Predvolene: nenastavená. |
| `notificationEmail` | `none` | Email address for notifications about failures of this provider. Enter a valid email address. A recovery group’s notification email takes precedence over its volume provider’s address. Default: not set. | Emailová adresa na oznámenia o zlyhaniach poskytovateľa. Zadajte platnú emailovú adresu. Notifikačný email skupiny obnovy má prednosť pred adresou jej poskytovateľa zväzkov. Predvolene: nenastavená. |
| `cacheRefreshSeconds` | `none → type-level default` | Discovery cache refresh interval for this provider, in seconds. Use a positive whole number. When not set, the default for this provider type from the cache configuration is used. | Interval obnovovania cache zisťovania zdrojov tohto poskytovateľa v sekundách. Použite kladné celé číslo. Ak nie je nastavený, použije sa predvolený interval pre daný typ poskytovateľa z konfigurácie cache. |

Pre FLASHCOPY overiť presnú množinu otáznikov v Create/Edit a EN/SK texty podľa tabuľky. Spoločné interakcie popoveru pokryť reprezentatívnymi integračnými testami.

## Hitachi (HITACHI)

Zdroj: samostatná sekcia HTML `HITACHI`, stĺpce Effect a Default. Presná množina otáznikov (5): `role`, `credentialId`, `url`, `notificationEmail`, `cacheRefreshSeconds`. Žiadne ďalšie polia.

| Parameter | Default v HTML | EN – úplný obsah | SK – úplný obsah |
| --- | --- | --- | --- |
| `role` | `source` | Choose the source (production) or target (recovery environment) side of a recovery. Documented default: source. | Vyberte zdrojovú stranu (produkcia) alebo cieľovú stranu (prostredie obnovy). Dokumentovaná predvolená hodnota: source. |
| `credentialId` | `none` | Stored credential used to sign in to this provider. Resolved for each request; its status can be OK, missing or not set. Default: not set. | Uložené prihlasovacie údaje na prihlásenie k poskytovateľovi. Vyhodnocujú sa pri každej požiadavke; ich stav môže byť v poriadku, chýbajúce alebo nenastavené. Predvolene: nenastavené. |
| `url` | `none` | Base URL of the provider’s web or REST endpoint. Default: not set. | Základná URL webového alebo REST rozhrania poskytovateľa. Predvolene: nenastavená. |
| `notificationEmail` | `none` | Email address for notifications about failures of this provider. Enter a valid email address. A recovery group’s notification email takes precedence over its volume provider’s address. Default: not set. | Emailová adresa na oznámenia o zlyhaniach poskytovateľa. Zadajte platnú emailovú adresu. Notifikačný email skupiny obnovy má prednosť pred adresou jej poskytovateľa zväzkov. Predvolene: nenastavená. |
| `cacheRefreshSeconds` | `none → type-level default` | Discovery cache refresh interval for this provider, in seconds. Use a positive whole number. When not set, the default for this provider type from the cache configuration is used. | Interval obnovovania cache zisťovania zdrojov tohto poskytovateľa v sekundách. Použite kladné celé číslo. Ak nie je nastavený, použije sa predvolený interval pre daný typ poskytovateľa z konfigurácie cache. |

Pre HITACHI overiť presnú množinu otáznikov v Create/Edit a EN/SK texty podľa tabuľky. Neduplicovať interakčné testy shared HelpPopover.

## IBM Power (IBM_POWER)

Zdroj: samostatná sekcia HTML `IBM_POWER`, stĺpce Effect a Default. Presná množina otáznikov (7): `role`, `credentialId`, `url`, `notificationEmail`, `cacheRefreshSeconds`, `backingStorageProviderIds`, `managedSystem`. Žiadne ďalšie polia.

| Parameter | Default v HTML | EN – úplný obsah | SK – úplný obsah |
| --- | --- | --- | --- |
| `role` | `source` | Choose the source (production) or target (recovery environment) side of a recovery. Documented default: source. | Vyberte zdrojovú stranu (produkcia) alebo cieľovú stranu (prostredie obnovy). Dokumentovaná predvolená hodnota: source. |
| `credentialId` | `none` | Stored credential used to sign in to this provider. Resolved for each request; its status can be OK, missing or not set. Default: not set. | Uložené prihlasovacie údaje na prihlásenie k poskytovateľovi. Vyhodnocujú sa pri každej požiadavke; ich stav môže byť v poriadku, chýbajúce alebo nenastavené. Predvolene: nenastavené. |
| `url` | `none` | Base URL of the provider’s web or REST endpoint. Default: not set. | Základná URL webového alebo REST rozhrania poskytovateľa. Predvolene: nenastavená. |
| `notificationEmail` | `none` | Email address for notifications about failures of this provider. Enter a valid email address. A recovery group’s notification email takes precedence over its volume provider’s address. Default: not set. | Emailová adresa na oznámenia o zlyhaniach poskytovateľa. Zadajte platnú emailovú adresu. Notifikačný email skupiny obnovy má prednosť pred adresou jej poskytovateľa zväzkov. Predvolene: nenastavená. |
| `cacheRefreshSeconds` | `none → type-level default` | Discovery cache refresh interval for this provider, in seconds. Use a positive whole number. When not set, the default for this provider type from the cache configuration is used. | Interval obnovovania cache zisťovania zdrojov tohto poskytovateľa v sekundách. Použite kladné celé číslo. Ak nie je nastavený, použije sa predvolený interval pre daný typ poskytovateľa z konfigurácie cache. |
| `backingStorageProviderIds` | `[]` | Select the FLASHCOPY or HITACHI storage providers that back this compute environment. Each ID must refer to an existing storage provider and appear only once. Default: an empty list. | Vyberte poskytovateľov úložiska FLASHCOPY alebo HITACHI, ktorí zabezpečujú úložisko tohto výpočtového prostredia. Každé ID musí odkazovať na existujúceho poskytovateľa úložiska a môže byť uvedené iba raz. Predvolene: prázdny zoznam. |
| `managedSystem` | `none` | SystemName of the managed system whose LPARs may be affected by Power rollback. Required when the HMC manages multiple systems. Default: not set. | SystemName spravovaného systému, ktorého LPAR môže ovplyvniť Power rollback. Je potrebný, ak HMC spravuje viac systémov. Predvolene: nenastavený. |

Pre IBM_POWER overiť presnú množinu otáznikov v Create/Edit a EN/SK texty podľa tabuľky. Interakcie modal/Escape overiť reprezentatívne.

## Prekladový kontrakt

Implementácia dopĺňa ploché kľúče do `src/locales/en.json` a `src/locales/sk.json`. Prefix `providers.fieldHelp.<parameter>` je helpKey. Suffix `.intro` obsahuje celý EN/SK text z typovej tabuľky vyššie. Suffixy `.title` a `.trigger` sú:

| Parameter | .title EN / SK | .trigger EN / SK |
| --- | --- | --- |
| `role` | Role / Rola | Help: Role / Nápoveda: Rola |
| `credentialId` | Credential / Prihlasovacie údaje | Help: Credential / Nápoveda: Prihlasovacie údaje |
| `url` | URL / URL | Help: URL / Nápoveda: URL |
| `vmPrefix` | VM name prefix / Prefix názvu VM | Help: VM name prefix / Nápoveda: Prefix názvu VM |
| `vmTags` | VM tags / Tagy VM | Help: VM tags / Nápoveda: Tagy VM |
| `notificationEmail` | Notification email / Notifikačný email | Help: Notification email / Nápoveda: Notifikačný email |
| `cacheRefreshSeconds` | Cache refresh interval / Interval obnovovania cache | Help: Cache refresh interval / Nápoveda: Interval obnovovania cache |
| `backingStorageProviderIds` | Backing storage providers / Poskytovatelia podkladového úložiska | Help: Backing storage providers / Nápoveda: Poskytovatelia podkladového úložiska |
| `partnerProviderId` | Partner provider / Partnerský poskytovateľ | Help: Partner provider / Nápoveda: Partnerský poskytovateľ |
| `managedSystem` | Managed system / Spravovaný systém | Help: Managed system / Nápoveda: Spravovaný systém |

Napríklad `providers.fieldHelp.vmTags.title`, `providers.fieldHelp.vmTags.trigger`, `providers.fieldHelp.vmTags.intro`. Spolu 10 prefixov × 3 = 30 nových kľúčov na jazyk. Znovu použiť existujúci `help.close`: EN „Close help“, SK „Zavrieť nápovedu“.

Spoločné parametre zdieľajú kľúče naprieč typmi, vrátane backingStorageProviderIds pre VMWARE/IBM_POWER. V štyroch HTML sekciách sa ich opisy/defaulty nelíšia. Pri budúcom odlišnom opise môže konkrétny label zvoliť prefix `providers.fieldHelp.<TYPE>.<parameter>` s rovnakými suffixmi; teraz nevytvárať nepoužité varianty ani ďalší resolver relevantnosti.

Default je údaj dokumentácie, nie zmena FE inicializácie: role sa automaticky nepredvyplní. Pri cache neuvádzať vymyslený číselný default. managedSystem vysvetľuje podmienku viacerých systémov na HMC bez novej required validácie. vmPrefix/vmTags opisujú filtre na zúženie výberu VMware Resources; neuvádzať interné poznámky ani tvrdenia o nefunkčnosti filtrovania. Nevymýšľať AND/OR sémantiku tagov.

## Poradie a závislosti

Schválenie → integračný bod centralizácie (1) → preklady (2) → spoločný formulár (3) → checkpoint → VMware/FlashCopy (4) → Hitachi/IBM Power (5) → checkpoint → regresie/vizuálna kontrola (6). Testové súbory upravovať sekvenčne. Úlohy s akceptáciou, overením a rozsahom sú v TODO.

## Riziká a rozhodnutia na kontrolu

| Riziko | Ošetrenie |
| --- | --- |
| Rozpracovaná centralizácia sa zmení | Pred implementáciou preveriť aktuálny resolver a bloky; nenahrádzať druhou mapou. |
| Tlačidlo v labeli zmení focus alebo meno vstupu | Súrodenecký label a trigger v lokálnom riadku a focused assertions prístupných mien. |
| Escape zatvorí nadradený modal | Jeden či dva reprezentatívne integračné testy s reálnym popoverom a nadradeným modalom (pristine/dirty); interné interakcie shared HelpPopover pokrývajú jeho existujúce testy. |
| Default sa zamení s inicializáciou FE | Default je iba obsah nápovedy; žiadna zmena hodnoty/validácie. |
| Display sa chápe ako nový rozsah | Iba ProviderCreateForm; ProvidersCatalogueTable a providers.help úplne nedotknuté. |

Používateľ následne zadal realizáciu cez executing-plans, inline v aktuálnom checkoute, a dodatočné preverenie polí podľa HTML. Implementácia zachováva schválené texty aj lokálny riadok labelu.

## Primeraná testovacia stratégia

- **Matica polí:** Pre každý typ providera explicitne overiť presnú množinu otáznikov (VMWARE 8, FLASHCOPY 6, HITACHI 5, IBM_POWER 7), neprítomnosť pri ID/Name/Description/Type/IP a správnu väzbu otázniku na label. Pokryť Create aj Edit. Očakávania v testoch neodvodzovať z produkčného resolvera.
- **Preklady:** Overiť všetkých 10 unikátnych textov a príslušné EN/SK title/trigger/intro z reálnych slovníkov podľa typových tabuliek plánu; paritu kľúčov, defaulty a absenciu nepreložených kľúčov. Netestovať rovnaký spoločný text znova pri každom type, ak používa ten istý kľúč.
- **Integrácia:** Na jednom alebo dvoch reprezentatívnych poliach otestovať reálny KeyedHelpPopover v Create/Edit modale: otvorenie, zatvorenie Escape iba na popoveri, zachovanie modalu aj rozpracovaných hodnôt (pristine/dirty), bez submitu a bez nového dirty stavu.
- **Typové prechody:** Jeden parametrizovaný Create scenár pre prepínanie VMWARE → FLASHCOPY → HITACHI → IBM_POWER a späť, vrátane prázdneho typu, správneho zmiznutia otáznikov a žiadnej zmeny existujúcej logiky resetu.
- **Regresia:** Existujúce testy HelpPopover/KeyedHelpPopover už pokrývajú hover, fokus, Tab/Shift+Tab, portál a klik mimo; neopakovať ich pre všetkých 26 výskytov. Skontrolovať zachovanie API/payloadu a existujúceho providers.help bez zásahu do ProvidersCatalogueTable.
- **Manuálny browser check:** Overiť po jednom príklade každého typu, Create/Edit, EN/SK, úzky viewport, scroll a správne umiestnenie panelu.

Rozšíriť existujúce `ProviderCreateForm.test.tsx` a `ProvidersCreateModal.test.tsx` iba o potrebné integračné regresie. Bez štyroch komponentov a bez nových testovacích frameworkov.

Plánované cielené overenie po implementácii:

~~~powershell
npm.cmd exec vitest run src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx
npm.cmd exec eslint -- src/features/providers-connectors/providers/components/ProviderCreateForm.tsx src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx --max-warnings 0
node -e "const fs=require('fs'); for(const l of ['en','sk']) JSON.parse(fs.readFileSync('src/locales/'+l+'.json','utf8')); console.log('Locale JSON OK')"
git diff --check -- src/features/providers-connectors/providers/components/ProviderCreateForm.tsx src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx src/locales/en.json src/locales/sk.json
~~~

Ručne v prehliadači: všetky typy Create/Edit, EN/SK, úzky viewport, scroll, neorezaný panel, focus a Display s pôvodným providers.help. Kompletnú suite ani produkčný build nespúšťať predvolene. Shared testy HelpPopover/KeyedHelpPopover pridať len pri odôvodnenom zásahu do ich správania, ktorý najprv vyhodnotiť ako rozšírenie rozsahu.

## Výsledok realizácie a kontrola HTML

Samostatne extrahované sekcie lokálneho `Provider parameters.html` boli porovnané s explicitnými množinami vstupov v testoch formulára, pre Create aj Edit. Spoločné jednoduché polia vo všetkých typoch: `id`, `name`, `description`, `type`, `ipAddress` (bez otáznikov). Ostatné polia zodpovedajú presne typovým zoznamom vyššie:

| Typ | Všetky polia | Otázniky | Výsledok množiny polí |
| --- | --- | --- | --- |
| VMWARE | 13 | 8 | Presná zhoda so sekciou VMWARE |
| FLASHCOPY | 11 | 6 | Presná zhoda so sekciou FLASHCOPY |
| HITACHI | 10 | 5 | Presná zhoda so sekciou HITACHI |
| IBM_POWER | 12 | 7 | Presná zhoda so sekciou IBM_POWER |

Kontrola relevantnosti polí neznamená zmenu ich povinnosti/defaultov: HTML uvádza `description`, `ipAddress` a `role` ako nepovinné, zatiaľ čo existujúci FE ich vyžaduje; rola sa vo FE automaticky nepredvyplní na `source`. Tento existujúci rozdiel zostáva podľa hraníc zadania zachovaný, rovnako aj podmienená povinnosť managedSystem nie je novo vynucovaná vo FE.

Vykonané overenie:

- Baseline: dva existujúce testové súbory, 89 testov prešlo.
- TDD: nové testy pred implementáciou zlyhali na chýbajúcich otáznikoch/prekladoch; po implementácii `npm.cmd exec -- vitest run src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx` — 128 testov prešlo (49 formulár, 79 modal).
- `npm.cmd exec -- eslint src/features/providers-connectors/providers/components/ProviderCreateForm.tsx src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx --max-warnings 0` — prešlo.
- `npm.cmd exec -- tsc --project .superpowers/sdd/provider-form-field-help-plan/tsconfig.json` — cielená kontrola troch zmenených TSX súborov a ich importov prešla. Dočasná git-ignored konfigurácia dedí `tsconfig.app.json`, dopĺňa existujúce ambientné `src/vite-env.d.ts` a testové typy; plný projektový typecheck sa nespúšťal.
- Node obsahové assertions: obe JSON lokalizácie platné; presne 30 nových kľúčov na jazyk, parita kľúčov; všetky pôvodné preklady vrátane `providers.help.*` nezmenené. Samostatné porovnanie štyroch HTML sekcií potvrdilo počty a presné množiny polí.
- `git diff --check` — bez chýb. Nezávislé review implementácie a testov bez nálezov; všetkých 60 nových prekladových hodnôt zodpovedá tomuto plánu.
- Kontrola diffu: ProvidersCatalogueTable, produkčný ProvidersCreateModal, providerFieldConfig a shared help komponenty sa nezmenili. Modal testy overujú Escape v pristine/dirty stave a identický JSON po interakcii s nápovedou pri všetkých štyroch typoch.

Vizuálny browser check sa nepodarilo dokončiť: nástroj Computer Use zastavil ďalšie akcie, pretože nevedel dostatočne spoľahlivo určiť aktuálnu URL vo Windows. Nepotvrdzuje sa teda EN/SK layout, úzky viewport ani scroll v reálnom prehliadači. Automatické DOM a integračné testy tieto vizuálne kontroly nenahrádzajú. Kompletná suite ani produkčný build neboli spustené.
