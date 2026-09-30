# Plán: Responzívne písmo v shared DataTable

## Cieľ a rozsah

Rozšíriť responzívne písmo a odsadenie buniek z VMware tabuľky (Resources) na všetky tabuľky postavené na shared `DataTable`. Pri užšom dostupnom priestore zmenšiť text buniek z 13 na 12 px a vodorovné odsadenie na 8 px. Na širokej obrazovke zachovať súčasný vzhľad.

Rozsah je iba text v tabuľkách. Toolbary, nadpisy, filtre, sidebar ani globálne písmo sa nemenia. Checklist: [datatable-responsive-font-todo.md](datatable-responsive-font-todo.md).

## Overený východiskový stav

- `src/shared/components/data-table/DataTable.tsx` má pevné `text-[13px]` v bunkách, odsadenie `px-4` (scroll) alebo `px-3` (fit) a hlavičku 11 px. Na šírku nijako nereaguje.
- `DataTable` používa približne 30 obrazoviek: Resources (FlashSystem, IBM Power, stavy inventory), Recovery Plans, Recovery Actions, Identity & Access, Audit, Providers, Credentials a Discovery Settings.
- `VirtualMachinesTable.tsx` už má vlastný kontajner `@container/vm-table`: pod 80rem `text-[12px] px-2`, od 80rem `text-[13px] px-3`. Prah 80rem je nezmeraný odhad (pozri [vmware-table-responsive-plan.md](vmware-table-responsive-plan.md)).
- Default prebíjajú alebo obchádzajú:
  - `AccessLogsTable.tsx:169-170`: vlastné pevné `px-3` a `text-[13px]`.
  - `RecoveryApplicationsTable.tsx:97,102`: explicitné `text-[13px]` na obsahu buniek, ktoré by zdedenú veľkosť prebilo.
  - `VirtualMachineDetailPanel.tsx:68`: vlastná trieda `cell` pre tabuľky v detaile VM.

## Rozhodnutia

1. Reagovať na šírku kontajnera tabuľky (CSS container query), nie na viewport. Tabuľky v úzkych paneloch (Identity & Access, drawery, detail VM) budú mať 12 px aj na veľkom monitore. Používateľ to odsúhlasil (varianta A).
2. Kontajner `@container/data-table` dostane vonkajší wrapper `DataTable`. Ide o posúvaný prvok, takže dotaz sa riadi viditeľnou šírkou, nie `min-w` tabuľky.
3. Prah 80rem, rovnaký ako pri VMware. Pod prahom bunky `text-[12px] px-2` a hlavička `px-2`. Od prahu sa zachovajú dnešné hodnoty: `text-[13px]`, scroll `px-4`, fit `px-3`. Hlavička ostáva 11 px.
4. Bez nového propu a bez zmeny API `DataTable`. Tabuľky s vlastným `cellClassName` alebo `headerCellClassName` si správanie riadia samy.
5. VMware tabuľku nemeniť. Jej kontajner `vm-table` s rovnakými hodnotami funguje ďalej.
6. Nepridávať testy, ktoré iba porovnávajú reťazce CSS tried. jsdom nedokazuje rozloženie.

## Implementácia a zistenia

- **T1:** Konzumenti ležia v `DataTableSurface` (grid), `DataTableRequestState`, `IdentityContentPanel` a `IdentityResourceDetailPage` (flex stĺpce), prípadne v blokovom `div`. Všetky tieto kontexty roztiahnu `DataTable` na plnú šírku a `DataTable` má `w-full`. Kontext, ktorý by sa zmršťoval na obsah, sa nenašiel, takže žiadny rodič nepotrebuje úpravu. `RecoveryRunHistoryDrawer` `DataTable` nepoužíva.
- **Odchýlka v T3:** Trieda `cell` v `VirtualMachineDetailPanel` sa používa aj v ručne písanej tabuľke diskov mimo `DataTable`, kde by dotaz na `data-table` nikdy nesedel. `DetailDrawer` má nastaviteľnú šírku a dá sa roztiahnuť nad 80rem. Panel preto dostal vlastný kontajner `@container/vm-detail` na scroll oblasti. Tabuľka diskov, snapshot tabuľka aj text prázdneho stavu diskov sa riadia ním. Riadok 211 teraz používa spoločnú triedu `cell`.
- VMware tabuľka a jej kontajner `vm-table` ostali bez zmeny.

## Poradie implementácie

### T1: Preveriť konzumentov a kontexty rozloženia (S)

Opis: `container-type: inline-size` odpojí šírku wrappera od obsahu. Ak `DataTable` leží v kontexte, ktorý sa zmršťuje na obsah (flex položka bez šírky, `inline-block`, absolútne pozicovaný drawer bez šírky, `w-fit`), tabuľka sa môže zrútiť na nulovú alebo minimálnu šírku. Prejsť všetkých konzumentov a označiť rizikové miesta.

Akceptačné kritériá:
- Zoznam konzumentov s rodičovským kontextom zapísaný do tohto plánu.
- Rizikové miesta (hlavne `RecoveryRunHistoryDrawer`, `DetailDrawer`, `InventoryPanel`, detail VM) majú určené, či potrebujú úpravu rodiča.

Overenie: čítanie kódu. Ak je dostupný prehliadač, zmerať šírku kontajnera pri 1280/1440/1920 px. Súbory: iba tento plán.

Závislosti: žiadne.

### T2: Responzívny default v shared DataTable (S)

Opis: Pridať `@container/data-table` na vonkajší wrapper a upraviť default `headerCell` a `bodyCell` podľa rozhodnutia 3 pre oba layouty (scroll aj fit). Prípadné úpravy rodičov z T1 urobiť v tom istom kroku.

Akceptačné kritériá:
- Pod 80rem kontajnera majú bunky 12 px a odsadenie 8 px, od 80rem je vzhľad totožný s dnešným.
- Scroll layout sa ďalej posúva do strán, fit layout nepreteká.
- Loading, empty stav, výber riadku a ovládanie klávesnicou bez regresie.

Overenie: `DataTable.test.tsx`, cielený ESLint. Súbory: `DataTable.tsx`, prípadne rodičia z T1.

Závislosti: T1.

### T3: Zosúladiť tabuľky s vlastnými triedami (S)

Opis:
- `AccessLogsTable.tsx`: nahradiť pevné triedy rovnakým responzívnym vzorom s kontajnerom `data-table` (zachovať `px-3` od prahu a `align-top`).
- `RecoveryApplicationsTable.tsx`: odstrániť explicitné `text-[13px]`, aby sa veľkosť dedila z bunky.
- `VirtualMachineDetailPanel.tsx`: trieda `cell` na riadku 68 dostane responzívny vzor. Ručne písaná `TableCell` na riadku 211 a text prázdneho stavu na riadku 217 sa zosúladia iba vtedy, ak ležia v tej istej tabuľke alebo v tom istom kontajneri; inak ostávajú bez zmeny.

Akceptačné kritériá:
- Žiadna z troch tabuliek nemá v bunkách pevných 13 px nezávislých od šírky.
- Pri širokom kontajneri je vzhľad totožný s dnešným.

Overenie: `AccessLogsTable.test.tsx`, `RecoveryApplicationsTable.test.tsx`, `VirtualMachineDetailPanel.test.tsx`, cielený ESLint.

Závislosti: T2.

### Kontrolný bod po T3

Ak prehliadač nie je dostupný, overiť aspoň generované CSS cez lokálny Tailwind `compile` rovnako ako pri VMware (pomenovaný kontajner, podmienka `width >= 80rem`, veľkosti 12/13 px). Nie je to test rozloženia.

### T4: Overiť výsledok a commitnúť (S)

Akceptačné kritériá:
- Browser kontrola pri 1024, 1280, 1440 a 1920 px na Resources (VMware, FlashSystem, IBM Power), Recovery Groups, Identity & Access a Access Logs, v oboch hustotách. Na úzkych šírkach funguje scroll tabuľky bez pretečenia celej stránky.
- Výsledky zapísané v checkliste a atomický commit bez nesúvisiacich zmien.

Overenie z koreňa repozitára:

```powershell
npm exec vitest run src/shared/components/data-table/DataTable.test.tsx src/features/platform-administration/audit/components/AccessLogsTable.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.test.tsx src/features/discovery-inventory/resources/components/vmware/VirtualMachinesTable.test.tsx
npm exec eslint -- src/shared/components/data-table/DataTable.tsx src/features/platform-administration/audit/components/AccessLogsTable.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.tsx --max-warnings 0
git diff --check
```

Zmena shared komponentu je prierezová. Ak T1 odhalí úpravy rodičov, pridať ich testy do zoznamu. Kompletnú sadu, typecheck ani build predvolene nespúšťať. Nedostupný prehliadač zapísať ako neoverenú časť, nie ako úspech.

Závislosti: T3.

## Riziká a otvorené body

- Zrútenie šírky v kontextoch, ktoré sa zmršťujú na obsah (rieši T1).
- Tabuľky v úzkych paneloch budú mať 12 px vždy. Je to vedomé rozhodnutie (varianta A).
- Prah 80rem je odhad. Ak meranie ukáže iný vhodný prah, zmeniť ho v `DataTable` aj vo VMware tabuľke naraz, aby ostali konzistentné.
- Menšie písmo nezaručí, že sa všetky stĺpce zmestia. Pri nedostatku miesta ostáva vodorovné posúvanie.
