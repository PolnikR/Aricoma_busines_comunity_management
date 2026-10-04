# Plán: IBM Power DetailDrawer — Backing Storage Info

- Stav: revidovaný a schválený na implementáciu, 2026-10-04. Nič nie je implementované.
- Worktree: `Aricoma_busines_comunity_management-test`, vetva `test`, HEAD `722bece3`. Plán už zahŕňa VMware commity `42d7ed2e` a `c9019a01`.
- Úlohy sú v `tasks/ibm-power-backing-storage-todo.md`.
- Cesty sú relatívne k `src/features/discovery-inventory/resources`, ak nie je uvedené inak.

## 1. Východiskový stav (overený v kóde)

### 1.1 Čo už existuje (VMware)

- `components/vmware/BackingStorageInfo.tsx`:
  - kreslí volume-first zoznam: pod každým volume Backing provider, NAA, Capacity, Status, Pool, I/O group, Protocol a Type;
  - pod nimi blok „FlashCopy / Snapshots“ s počtami, s `No FlashCopy mappings` a so samostatnými tabuľkami source a target mappings;
  - stavy: skeleton (`role="status"`), `DataTableRequestState` s Retry, empty text;
  - props: `volumes`, `isLoading`, `isError`, `isFetching`, `onRetry`, `providers`. Meno providera sa berie zo zoznamu `providers`; ak ho tam nenájde, zobrazí iba raw ID.
- `components/vmware/VirtualMachineDetailPanel.tsx` volá `useVdisksByVm(vm.name, vm.providerId)` a obsah vkladá do `DetailDrawerSection` s titulkom `drawer.sections.backingStorageInfo` (predvolene zbalená). `providers` dostáva z `VmwareResourcesPage`.
- `helpers/mapVmStorageVolumes.ts`:
  - lokálna runtime hranica `StorageVolumeWire = StorageVolumePayload & Partial<Record<'storage_provider_id' | 'IO_group_name', unknown>>` s `toText()`;
  - mapuje `storageProviderId` a `ioGroupName`; kľúč z `vdisks` stále ukladá do `naaId`.
- `helpers/mapVmStorageVolumes.test.ts`: 3 testy (provider + I/O group, chýbajúce polia, source a target mappings). IBM Power payload v nich nie je.
- `components/vmware/VirtualMachineDetailPanel.test.tsx` má ~18 testov backing storage. `naaId` používa vo fixture a NAA overuje na volumes.
- Locale: `pages.virtualMachines.detail.backingStorage.*` (18 kľúčov v en/cs/sk) a VMware help `pages.virtualMachines.help.backing.*`.

### 1.2 Čo chýba pre IBM Power

- `StorageVolume.naaId` sa plní kľúčom z odpovede, takže pri Power v ňom skončí `ibm-flashsystem-02:2` a `BackingStorageInfo` ho **zobrazí ako NAA**. Zároveň ho používa ako React key.
- Mapper nečíta `volume_id`.
- `BackingStorageInfo` má VMware predpoklady:
  - je umiestnený v `components/vmware/`;
  - NAA zobrazuje vždy;
  - `prefix = 'pages.virtualMachines.detail.backingStorage'`;
  - empty text „…for this virtual machine.“ je napevno;
  - komentár hovorí o „VMware disks“;
  - responzívne triedy `@min-[80rem]/vm-detail:*` sa viažu na container `@container/vm-detail`, ktorý existuje iba vo VMware draweri.
- `IbmPowerDetailPanel.tsx`:
  - endpoint nevolá;
  - nemá `providers`;
  - sekcie renderuje cez `PartitionSection` (`defaultOpen`, skrýva prázdne riadky).
- `IbmPowerResourcesPage.tsx` má `providers`, ale do `PowerInventoryView` ich neposiela.
- `PowerInventoryView.test.tsx` renderuje drawer bez `QueryClientProvider`. Po pridaní `useQuery` do panelu treba hook mockovať.
- `IbmPowerDetailPanel.test.tsx` zatiaľ neexistuje.

### 1.3 Konzumenti `StorageVolume` / `naaId`

`naaId` číta iba `BackingStorageInfo.tsx` (zobrazenie a React key) a dva testy. Recovery hook `recovery-plans/recovery-groups/hooks/useRecoveryGroupRelatedVolumes.ts` číta iba `volume.name`, takže premenovanie ho neovplyvní.

## 2. Rozhodnutia (uzavreté)

- **Q1 – bez Orvalu.** Spec patch, OpenAPI, regenerácia ani `src/generated/**` sa nemenia. Lokálna hranica `StorageVolumeWire` sa rozšíri iba o `'volume_id'`.
- **Q2 – VMware ostáva volume-first.** Komponent sa iba presúva a refaktoruje, UX sa nemení.
- **Q3 – iba LPAR.** Pri VIOS dostane `useVdisksByVm` disabled argumenty, takže nevznikne žiadny `/vdisks_by_vm` request a sekcia sa nerenderuje.
- **Q4 – meno providera je v scope.** Použije sa už načítaný `providers`, bez nového requestu.

Ďalšie rozhodnutia tohto plánu:

1. **Model identity:** `naaId` sa nahradí poliami `key`, `naa` a `volumeId`. `vdiskUid`, `storageProviderId` a `ioGroupName` ostávajú.
   - `key`: surový kľúč z `vdisks`, iba pre React key, nikdy sa nerenderuje.
   - `naa`: rovné `key`, ak kľúč začína na `naa.` (bez ohľadu na veľkosť písmen), inak `null`.
   - `volumeId`: `toText(raw.volume_id) || raw.id`. Fallback na `id` je preto, že `id` je v typovanej schéme a v príklade Power odpovede má rovnakú hodnotu.
2. **Identita v UI podľa dát.** Pri `naa !== null` sa zobrazí riadok `NAA`. Inak sa zobrazia riadky `Volume ID` a `Volume UID` (z `vdiskUid`). Model nemá typ providera ani discriminated union.
3. **Shared umiestnenie:** `components/BackingStorageInfo.tsx`, vedľa ostatných zdieľaných komponentov Resources (`ResourceInventoryPanel`, `SourceInventoryToolbar`…). Súbor sa presunie cez `git mv`, aby história ostala čitateľná.
4. **Locale namespace:** `pages.virtualMachines.detail.backingStorage.*` sa presunie do **`resources.backingStorage.*`**.
   - Odporúčaný `details.backingStorage.*` nepoužijem, lebo `details.backingStorage` už existuje ako samostatný kľúč („Backing storage“, ktorý používa Recovery/forms). Lookup je síce plochý (`translations[key]`), takže technická kolízia nevznikne, ale bol by to mätúci „kľúč aj namespace“ naraz.
   - `resources.backingStorage` je prázdny a feature-scoped.
   - VMware help `pages.virtualMachines.help.backing.*` ostáva na mieste, je to VMware-špecifický text.
5. **Empty text cez prop:** `emptyText: string`. VMware posiela pôvodný text o virtual machine (presunutý do `pages.virtualMachines.detail.noBackingVolumes`). Power posiela text o logical partition.
6. **Vlastný container komponentu:** koreň `BackingStorageInfo` dostane `@container/backing-storage` a interné triedy `@min-[80rem]/vm-detail:*` sa zmenia na `@min-[80rem]/backing-storage:*`.
   - Sekcia je `flush` a v plnej šírke draweru, preto je prah pri VMware prakticky rovnaký.
   - Power funguje bez falošného `vm-detail` wrappera.
7. **Power sekcia:** samostatná `DetailDrawerSection` (nie `PartitionSection`, ktorá by sa pri prázdnych dátach skryla), `flush`, za Virtual I/O.
   - Titulok je výhradne existujúci `t('drawer.sections.backingStorageInfo')`, rovnaký ako vo VMware. Nový kľúč `resources.power.groups.backingStorage` **nevzniká**.
   - **Predvolene zbalená:** `DetailDrawerSection` má `defaultOpen = false` a Power sekcia `defaultOpen` **nedostane**, rovnako ako VMware Backing Storage Info.
   - Fetch beží pri otvorení draweru (hook je v paneli), rovnako ako vo VMware.
8. **VIOS:** `useVdisksByVm` sa volá vždy (pravidlá hookov), pri VIOS však s disabled argumentmi `useVdisksByVm('', undefined)`. Hook má `enabled: !!vmName && !!providerId`, takže query je disabled, nevznikne `/vdisks_by_vm` request a sekcia Backing Storage Info sa nerenderuje.
9. **Poradie voči plánu section accents** (`tasks/detail-drawer-section-accents-plan.md` / `-todo.md`):
   1. najprv dokončiť tento plán (IBM Power Backing Storage Info);
   2. až potom implementovať DetailDrawer section accents.

   Dôvody:
   - Backing Storage zmení IBM Power drawer z 5 na 6 sekcií (Summary, Processor & Memory, Network, Storage, Virtual I/O, Backing Storage Info) a accent plán dnes počíta s 5;
   - accent plán sa potom musí prispôsobiť výslednej štruktúre a pokryť aj sekciu Backing Storage Info vhodným accentom a ikonou;
   - `IbmPowerDetailPanel.test.tsx` vznikne v tomto pláne (T5) a accent plán ho musí rozšíriť, nie prepísať.

   Accent plán sa v tejto úlohe nemení; závislosť je zdokumentovaná iba tu.

## 3. Závislosti

```
T1 model + mapper (key/naa/volumeId)
 └─ T2 shared BackingStorageInfo (presun, identita, locale, container, emptyText)
     ├─ T3 VMware regresia na shared komponente
     └─ T4 IBM Power data flow + sekcia
         └─ T5 Power locale/help/testy + finálna validácia
```

T1 a T2 je vhodné spojiť do jedného commitu. Samotný T1 by bez T2 nekompiloval, lebo `BackingStorageInfo` číta `naaId`. Alternatíva: T1 dočasne upraví aj jeden riadok v `BackingStorageInfo` (`naaId` → `naa`/`key`), aby bol commit zelený. **Odporúčanie: T1 s minimálnou úpravou komponentu, aby každý commit bol zelený.**

## 4. Úlohy

Každá úloha: focused testy → eslint zmenených súborov → `git diff --check` → atomický commit iba vlastných súborov (CLAUDE.md §6).

### T1 — Provider-neutral identita + mapper (S)

**Súbory**
- `model/vmStorageVolumesTypes.ts`: `naaId` sa nahradí poliami `key: string`, `naa: string | null` a `volumeId: string`.
- `helpers/mapVmStorageVolumes.ts`:
  - `StorageVolumeWire` rozšíriť o `'volume_id'`;
  - `mapVolume(key, raw)` s `naa: /^naa\./i.test(key) ? key : null` a `volumeId: toText(raw.volume_id) || raw.id`;
  - aktualizovať komentár.
- `components/vmware/BackingStorageInfo.tsx`: iba kompilačná oprava (React key `volume.key`, NAA riadok `volume.naa`), bez zmeny UX.
- `helpers/mapVmStorageVolumes.test.ts`: existujúce testy prepnúť na `key`/`naa` a pridať reálny IBM Power payload zo zadania (2 volumes, bez mappings).
- `components/vmware/VirtualMachineDetailPanel.test.tsx`: iba fixture `naaId` → `key` + `naa`.

**Testy (nové v mapper teste)**
- VMware: `key = naa = 'naa.6005…'`.
- Power `ibm-flashsystem-02:2`:
  - `naa === null`, `volumeId === '2'`;
  - `vdiskUid === '600507638082007A48000000000000A1'`;
  - `storageProviderId === 'ibm-flashsystem-02'`, `ioGroupName === 'io_grp0'`;
  - nulové snapshots a prázdne source/target mappings.
- Bez `volume_id`: `volumeId` spadne na `id`.
- Source a target mappings bez regresie (existujúci test).

**Riziká**
- VMware kľúč bez prefixu `naa.` (napr. `eui.`) by sa zobrazil ako Volume ID/UID. Identita sa nestratí, len sa zobrazí inak. Prijateľné, zapísané v testoch ako zámer.
- Recovery hook číta iba `name`, takže je bez dopadu (overí regresný test).

**Závislosti:** žiadne.

### T2 — Refaktor `BackingStorageInfo` na shared komponent (M)

**Súbory**
- `git mv components/vmware/BackingStorageInfo.tsx components/BackingStorageInfo.tsx`, s úpravou importov (`../model/...`).
- V komponente:
  - `prefix = 'resources.backingStorage'`;
  - nový prop `emptyText`;
  - identita: `naa` → riadok `NAA`, inak riadky `Volume ID` + `Volume UID` (`font-mono`, `display()` fallback `-`);
  - container `@container/backing-storage` a triedy `@min-[80rem]/backing-storage:*`;
  - provider-neutral komentáre („storage volumes resolved for a compute resource“).
- `src/locales/en.json`, `cs.json`, `sk.json`:
  - presunúť 17 kľúčov z `pages.virtualMachines.detail.backingStorage.*` do `resources.backingStorage.*`;
  - pridať `resources.backingStorage.volumeId` a `.volumeUid`;
  - `…backingStorage.empty` presunúť na `pages.virtualMachines.detail.noBackingVolumes`, lebo text je VMware-špecifický;
  - po presune grepom overiť, že staré kľúče nemajú konzumenta.
- `components/vmware/VirtualMachineDetailPanel.tsx`: import z `../BackingStorageInfo` a `emptyText={t('pages.virtualMachines.detail.noBackingVolumes')}`.

**Akceptácia**
- Grep: v kóde ani v locale nie je `pages.virtualMachines.detail.backingStorage`.
- Composite key sa nikde nerenderuje, iba `key=`.
- VMware testy prejdú bez zmeny očakávaných textov (anglické texty ostávajú rovnaké).

**Riziká**
- Pri presune locale môže vypadnúť kľúč v jednom jazyku. Mitigácia: skript alebo diff porovnať množinu kľúčov en/cs/sk a JSON parse.
- Zmena container názvu môže posunúť prah 80rem. Mitigácia: sekcia je `flush` v plnej šírke, takže pri VMware rovnaká šírka; manuálne overenie pri resize v Checkpointe B.

**Závislosti:** T1.

### T3 — VMware regresia na shared komponente (S)

**Súbory**
- `components/vmware/VirtualMachineDetailPanel.test.tsx`: iba úpravy vyvolané T1/T2 (fixture, prípadne import typov). Nový explicitný test: VMware volume **nemá** riadky `Volume ID` ani `Volume UID`. Existujúci test na `vdisk_UID` ostáva.
- Žiadna zmena VMware UX.

**Overiť existujúcimi testami**
- NAA, provider (meno + raw ID, raw ID pri neznámom providerovi), detaily volume;
- zero snapshots, `No FlashCopy mappings`, source aj target mappings;
- viac volumes;
- loading skeleton, error + Retry, retrying, empty;
- help, resize.

**Riziko:** ak T2 zmení DOM štruktúru (container wrapper), testy viazané na `closest()` alebo `region` sa môžu rozbiť. Mitigácia: wrapper pridať ako koreň okolo `DataTableRequestState`, sekcie volumes nechať ako `region`.

**Závislosti:** T2.

### T4 — IBM Power integrácia (M)

**Súbory**
- `components/ibm-power/IbmPowerResourcesPage.tsx`: `<PowerInventoryView … providers={providers} />`.
- `components/ibm-power/PowerInventoryView.tsx`:
  - nový prop `providers: ProviderRecord[]` (predvolene `[]`, ako VMware panel), posiela sa do `IbmPowerDetailPanel`;
  - doplniť labely `sections.backingStorage: t('drawer.sections.backingStorageInfo')` (interný názov propu, hodnota je existujúci kľúč) a `emptyBackingStorage: t('resources.power.detail.noBackingVolumes')`.
- `components/ibm-power/IbmPowerDetailPanel.tsx`:
  - `const isLpar = partition?.partitionKind === 'LPAR'`;
  - `useVdisksByVm(isLpar ? partition.partitionName : '', isLpar ? partition.providerId : undefined)`. Pre VIOS hook dostane `('', undefined)`, query je disabled (`enabled: !!vmName && !!providerId`) a request nevznikne;
  - za Virtual I/O iba pre LPAR pridať `<DetailDrawerSection title={labels.sections.backingStorage} flush><BackingStorageInfo … emptyText={labels.emptyBackingStorage} providers={providers} /></DetailDrawerSection>`, **bez** `defaultOpen` (predvolene zbalená);
  - sekcia `Storage` ostáva nezmenená a samostatná;
  - `SectionKey` rozšíriť o `backingStorage`.
- Nový hook ani endpoint sa nevytvára.

**Akceptácia**
- Pre LPAR je poradie Summary → Processor & Memory → Network → Storage → Virtual I/O → Backing Storage Info.
- Titulok sekcie je `drawer.sections.backingStorageInfo` a sekcia je pred otvorením zbalená (`aria-expanded="false"`).
- VIOS: hook dostane `('', undefined)`, query je disabled, `/vdisks_by_vm` request nevznikne a sekcia sa nerenderuje.
- Sekcia `Storage` ostáva nezmenená a samostatná.

**Riziká**
- `PowerInventoryView.test.tsx` renderuje drawer bez QueryClient. Pridať `vi.mock('../../hooks/useVmStorageVolumes')` (vzor z VMware testu), inak test spadne na chýbajúcom `QueryClientProvider`.
- Zmena props `PowerInventoryView`: jediný volajúci je `IbmPowerResourcesPage`; `ResourcesRouteTransition.test.tsx` stránku mockuje.
- Prekryv s `tasks/detail-drawer-section-accents-*` (Task 4 mení `IbmPowerDetailPanel`/`PartitionSection` a plánuje nový `IbmPowerDetailPanel.test.tsx`). Platí poradie z §2 bod 9: najprv tento plán, potom accents. Accent pre novú sekciu rieši accent plán, nie tento.

**Závislosti:** T2 (T3 odporúčané pred T4, nie je však technicky nutné).

### T5 — IBM Power locale, help, testy + finálna validácia (M)

**Locale en/cs/sk**
- Titulok sekcie: **žiadny nový kľúč**. Použije sa existujúci `drawer.sections.backingStorageInfo` (už je v en/cs/sk). `resources.power.groups.backingStorage` sa nevytvára.
- `resources.power.detail.noBackingVolumes`: „No backing storage volume was resolved for this logical partition.“
- `resources.power.help.backing.title` a `.text` (LPAR → NPIV WWPN → FlashSystem host → backing volumes; FlashCopy per volume; odlíšenie od sekcie Storage z HMC).
- `IbmPowerDetailPanel`: help `sections={['processor', 'storage', 'virtualIo', 'backing']}`.

**Testy**
- Nový `components/ibm-power/IbmPowerDetailPanel.test.tsx` s mockom `useVdisksByVm` pokrýva body 1–15:
  1. hook dostane `partitionName` a `providerId`;
  2. `Storage` a `Backing Storage Info` sú dve samostatné sekcie;
  3. Power volume ukazuje názov, provider, Volume ID, Volume UID, capacity, status, pool, I/O group, protocol a type;
  4. `ibm-flashsystem-02:2` nie je v `textContent` draweru;
  5. dve volumes sú dva samostatné `region`;
  6. volume so zero snapshots sa zobrazí;
  7. zobrazí sa `No FlashCopy mappings`;
  8. source mappings;
  9. target mappings;
  10. loading skeleton;
  11. error + Retry (volá `refetch`);
  12. empty text pre logical partition;
  13. VIOS: `expect(useVdisksByVmMock).toHaveBeenCalledWith('', undefined)` a sekcia Backing Storage Info v draweri neexistuje. Test **neoveruje**, že hook nebol zavolaný;
  14. pred otvorením má tlačidlo sekcie `Backing Storage Info` `aria-expanded="false"`; Summary ostáva otvorené;
  15. titulok sekcie je text kľúča `drawer.sections.backingStorageInfo`.
- `PowerInventoryView.test.tsx`:
  - mock hooku;
  - data flow `providers` z view → drawer → meno + raw ID;
  - neznámy provider → iba raw ID;
  - existujúce testy sekcií ostávajú.
- `src/locales/detailDrawerHelpTranslations.test.ts`: kontrola parity help kľúčov (bez úpravy testu).

**Závislosti:** T4.

## 5. Checkpointy

- **A (po T1–T2):** mapper, VMware panel, query/hook a recovery regresné testy; typecheck.
- **B (po T3–T4):** VMware a Power testy, eslint, typecheck. Ak je k dispozícii prehliadač: VMware drawer pri resize (prah 80rem) a Power LPAR/VIOS.
- **C (po T5):** kompletná validácia nižšie a review.

## 6. Validačné príkazy

```powershell
$r = 'src/features/discovery-inventory/resources'
npm exec vitest run "$r/helpers/mapVmStorageVolumes.test.ts" "$r/model/inventoryQueries.test.ts" "$r/hooks/useVmStorageVolumes.test.tsx"
npm exec vitest run "$r/components/vmware/VirtualMachineDetailPanel.test.tsx" "$r/components/vmware/VmwareResourcesPage.test.tsx"
npm exec vitest run "$r/components/ibm-power/IbmPowerDetailPanel.test.tsx" "$r/components/ibm-power/PowerInventoryView.test.tsx" "$r/pages/ResourcesRouteTransition.test.tsx"
npm exec vitest run src/locales/detailDrawerHelpTranslations.test.ts
npm exec vitest run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupRelatedVolumes.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx
$changed = @(git diff --name-only HEAD -- '*.ts' '*.tsx') + @(git ls-files --others --exclude-standard -- '*.ts' '*.tsx')
npx eslint --max-warnings 0 $changed
npm run typecheck
git diff --check
```

Kontrola presunu locale (en/cs/sk musia mať rovnakú množinu kľúčov a nesmú zostať staré kľúče):

```powershell
node -e "const l=['en','cs','sk'].map(x=>Object.keys(require('./src/locales/'+x+'.json')).filter(k=>k.startsWith('resources.backingStorage.')||k.startsWith('pages.virtualMachines.detail.backingStorage')).sort().join());console.log(new Set(l).size===1?'OK':'MISMATCH',l[0])"
```

Orval ani spec-patch príkazy sa nespúšťajú (Orval sa nemení). Celý test suite ani production build sa podľa CLAUDE.md §5 nespúšťajú.

## 7. Riziká

| Riziko | Dopad | Mitigácia |
|---|---|---|
| NAA sa pri Power dnes zobrazí ako composite key | Vysoký (ak by sa Power napojil pred T1) | Poradie T1 → T4 je povinné; test bodu 4 |
| Vypadnutý alebo duplicitný locale kľúč po presune | Stredný | Node kontrola množín kľúčov, grep starého prefixu |
| Posun responzívneho prahu po zmene containera | Nízky | Container na koreni plnej šírky; manuálny resize |
| `PowerInventoryView.test` bez QueryClient | Stredný | Mock hooku v T4 |
| Kolízia s plánom accent sekcií na `IbmPowerDetailPanel` (+ test súbor) | Stredný | Poradie: najprv Backing Storage, potom accents; accent plán rozšíri `IbmPowerDetailPanel.test.tsx` a pokryje 6. sekciu. Ak by accent task vznikol skôr, Backing Storage musí rebasovať, zachovať jeho zmeny (accent/ikony sekcií, `bodyLayout`, test) a test iba rozšíriť |
| VMware kľúč bez `naa.` prefixu | Nízky | Fallback Volume ID/UID; zámer v teste |
| Power má po pridaní 6 sekcií (5 otvorených) | Nízky | Nová sekcia predvolene zbalená (bez `defaultOpen`), overené testom `aria-expanded="false"` |

## 8. Otvorené body

Žiadne. Potvrdené: namespace `resources.backingStorage.*`, titulok Power sekcie `drawer.sections.backingStorageInfo`, Power sekcia predvolene zbalená, VIOS s disabled query, poradie pred accent plánom.
