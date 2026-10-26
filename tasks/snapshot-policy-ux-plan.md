# Snapshot Policy – plán UX úprav

Stav: návrh na schválenie, implementácia nezačala. Dátum: 26. 10. 2026.
Úlohy: [snapshot-policy-ux-todo.md](snapshot-policy-ux-todo.md).

## Cieľ a hranice

Preusporiadať existujúce polia Snapshot Policy, zaviesť minútový krok 15 a pridať šesť kontextových otáznikov do Display/Create/Edit. Bez nových sekcií, kariet, akordeónov, formulárov alebo helper komponentov. API, generované typy, ostatné politiky a Retention validácia sa nemenia. Produkčný kód ani testy sa v tejto plánovacej úlohe neupravujú. Bez pushu a merge.

Podľa posledného pokynu používateľa nápoveda nebude uvádzať predvolené hodnoty. Platí to aj pre Level, Maximum snapshots, FlashCopy a Enabled. Vysvetlenie významu hodnoty 0 pri FlashCopy zostáva vecným opisom správania, nie informáciou o predvolenej hodnote. Úvodné nastavenie Create na 15 minutes je naďalej požadovaným správaním formulára.

## Zdroje a aktuálna implementácia

- `snapshot/components/SnapshotPolicyForm.tsx`: ID a Name sú vedľa seba, Description pod nimi. Ďalej Level → Maximum snapshots → Status; samostatný riadok Frequency → Retention a nakoniec FlashCopy. Frequency aj Retention majú `min=1`, `step=1`. Formulár odovzdáva Enter cez `onSubmit`.
- `snapshot/components/SnapshotPolicyModal.tsx`: `EMPTY_FORM` obsahuje Frequency 1 minute. `toFormData` zachováva hodnoty existujúceho záznamu. `validate` kontroluje iba kladnú celočíselnú frekvenciu. `handleSubmit` po validácii zostavuje celý payload. Dirty stav porovnáva formulár s `initialForm(policy)`; zatváranie používa `useUnsavedChangesGuard`.
- `snapshot/components/SnapshotPoliciesTable.tsx`: Display používa `DetailView` a `DetailOverview`. Obsahuje šesť požadovaných parametrov; Name je titulok, nie samostatné pole. Hlavička už používa `snapshotPolicies.help` so sekciami frequency/retention/usage. Tento výskyt aj všetky existujúce kľúče zostanú nezmenené.
- `snapshot/components/FlashCopyCopyRateField.tsx`: obsahuje label, slider, číselný vstup, značky 0/50/100/150, indikátor stavu a inline nápovedu. Zachovať ich aj prepojenie `aria-describedby` a chybového textu.
- `shared/components/form/FormControls.tsx`: `Field` renderuje vonkajší HTML `label` vrátane detí. Vloženie otázniku do jeho label prop alebo detí by vytvorilo interaktívne tlačidlo v labeli.
- `shared/components/detail-view/DetailField.tsx`: `label` je string, využíva sa aj pre copy tlačidlo. Má vetvy grid/overview/technical; aktuálne nemá slot na nápovedu.
- `KeyedHelpPopover` vyžaduje `helpKey` a `sections`; pre nové krátke texty použiť `sections={[]}`. Existujúci `HelpPopover` má tlačidlo `type="button"`, portál a obsluhu klávesnice/Escape. Jeho interný mechanizmus sa nemení.
- Existujú `SnapshotPolicyModal.test.tsx`, `SnapshotPoliciesTable.test.tsx`, `FlashCopyCopyRateField.test.tsx` a shared `DetailContent.test.tsx`. Modal testy už pokrývajú payload, edit prefill a FlashCopy. Ich helper nastavuje číslo Frequency pred jednotkou; pri novom prepínaní bude potrebné poradie vedome upraviť. Testy používajú `mockUseTranslation`.
- Locale súbory sú ploché JSON mapy s bodkovanými kľúčmi, nie vnorené objekty.

Feature cesty vyššie sú relatívne k `src/features/recovery-plans/recovery-policies/`; shared a locales k `src/`.

Autoritatívna referencia: [backend Policy parameters – SnapshotPolicy](https://pages.esas.autocont.sk/abco-be-507ccc/parameters/policies.html). Stránku sa pri plánovaní nepodarilo načítať; samostatný `Policy parameters.html` nie je v repozitári. Texty nižšie vychádzajú z definícií priložených používateľom, nie z nezávisle overeného HTML. Pred implementáciou texty porovnať s dostupnou sekciou SnapshotPolicy; prípadný rozpor vyriešiť pred ich zapísaním. Backendové minimum a FE požiadavka na násobky 15 sú rôzne pravidlá.

## Rozloženie

ID, Name a Description zostávajú na mieste. Existujúce vizuálne oddelenia zachovať bez pridávania ďalších sekcií.

| Riadok | Polia v poradí |
|---|---|
| 1 | Level · Policy Status / Enabled |
| 2 | Frequency (hodnota + jednotka) · Maximum snapshots · Retention (hodnota + jednotka) |
| 3 | Existujúci FlashCopy copy rate |

Použiť existujúci grid štýl: prvý riadok jedna kolóna, od `sm` dve; druhý jedna kolóna, od `sm` tri pružné kolóny s `minmax(0,1fr)`. Dvojice hodnota/jednotka zostanú spolu, s priestorom pre SK texty. Žiadne pevné minimálne šírky vyvolávajúce horizontálny scroll. DOM aj tab poradie kopírujú vizuálne poradie. Display nemení poradie polí, pretože požiadavka na preusporiadanie sa týka formulára.

## Frequency a bezpečné prepínanie

| Jednotka | Minimum | Krok | Validácia |
|---|---:|---:|---|
| minutes | 15 | 15 | konečné celé číslo ≥ 15 a deliteľné 15 |
| hours | 1 | 1 | konečné celé číslo ≥ 1 |
| days | 1 | 1 | konečné celé číslo ≥ 1 |

Create začína na `15 minutes`. Žiadne maximum 60 minút. Ručne zadanú chybnú hodnotu ponechať viditeľnú, označiť chybu a zablokovať API submit cez existujúcu validačnú bránu vrátane Enter. HTML atribúty samy nestačia. Retention sa nesmie normalizovať ani prevádzať.

Navrhované rozhodnutie na schválenie: pri vedomej zmene jednotky zachovať dĺžku intervalu, ak je presne vyjadriteľná; inak zaokrúhliť nahor na najbližší povolený krok cieľovej jednotky. Pre kladné konečné číslo: previesť zdroj na minúty, vydeliť dĺžkou cieľovej jednotky a použiť `max(minimum, ceil(hodnota / krok) × krok)`. Hodnotu a jednotku aktualizovať jednou funkčnou aktualizáciou stavu v modale, aby nemohli vzniknúť nesúladné medzistavy. Príklady: 1 hour → 60 minutes, 90 minutes → 2 hours, 1 day → 24 hours, 7 minutes → 1 hour. Pri zaokrúhlení bezprostredne zobraziť inline `role="status"` s výsledným intervalom a dôvodom. Ide o novú požadovanú FE interakciu, nie tvrdenie backendovej dokumentácie.

Ak je číslo prázdne, nečíselné alebo nekladné, prepnutie jednotky odmietnuť, ponechať celý pár a zobraziť lokalizovanú chybu. Používateľ najprv opraví číslo; nikdy sa nedopĺňa skrytá náhradná hodnota. Pri presnom prevode nevzniká zaokrúhľovacie oznámenie. Oznámenie o zaokrúhlení odstrániť pri ďalšej ručnej úprave Frequency alebo opätovnom otvorení modalu; nie je súčasťou payloadu ani dirty porovnania.

Historické Edit hodnoty (5, 7, 20 minút) načítať presne, bez efektu meniaceho dáta a bez dirty stavu pri otvorení. Až validácia pri uložení vyžaduje platnú novú Frequency; zablokuje aj uloženie iného poľa, kým používateľ frekvenciu vedome neopraví. Žiadna výnimka prepúšťajúca neplatný interval do celého submit payloadu. Zatvorenie bez úprav ostane bez dirty potvrdenia.

Nové texty mimo nápovedy (ploché locale kľúče):

| Kľúč pod `snapshotPolicies.` | EN | SK |
|---|---|---|
| `validation.frequencyMinutes` | Enter a whole number of minutes, at least 15 and a multiple of 15. | Zadajte celý počet minút, aspoň 15 a násobok 15. |
| `validation.frequencyBeforeUnitChange` | Enter a positive frequency before changing its unit. | Pred zmenou jednotky zadajte kladnú frekvenciu. |
| `form.frequencyRounded` | The interval was rounded up to {value} {unit} to use a valid whole step. | Interval sa zaokrúhlil nahor na {value} {unit}, aby zodpovedal povolenému celému kroku. |

Interpoláciu vykonať spôsobom používaným projektom (`t(...).replace(...)`); `{unit}` pochádza z existujúcich prekladov jednotiek. Pri chybách prevodu zachovať pôvodné jednotky aj číslo.

## Integrácia šiestich otáznikov

| Parameter / suffix pod `snapshotPolicies.fieldHelp` | Display | Create | Edit |
|---|---|---|---|
| ID, Name, Description | nie | nie | nie |
| Level / `level` | áno | áno | áno |
| Frequency / `frequency` | áno | áno | áno |
| Maximum snapshots / `maxSnapshots` | áno | áno | áno |
| Retention / `retention` | áno | áno | áno |
| FlashCopy copy rate / `flashcopyCopyRate` | áno | áno | áno |
| Enabled / Policy Status / `enabled` | áno | áno | áno |

Presne šesť **parametrových** otáznikov v každom pohľade. Display má navyše už existujúci hlavičkový otáznik, teda sedem celkovo; test nesmie požadovať odstránenie hlavičkového helpera.

Vo formulári pri Level, Frequency, Maximum snapshots a Retention nahradiť iba miestne použitie obalového `Field` bežným `div` s riadkom obsahujúcim samostatný `label htmlFor` a susedný `KeyedHelpPopover`. Zachovať existujúce triedy labelu, ID, chyby a ovládacie prvky. Polia jednotiek môžu ďalej používať pôvodný `Field`. Pri Status pridať otáznik vedľa existujúceho nadpisu mimo labelu `CheckboxField`. Pri FlashCopy vložiť priamo existujúci `KeyedHelpPopover` vedľa labelu v jeho komponente; slider, inline vysvetlenie a všetky súčasné preklady ponechať. Nový popover stručne dopĺňa plný význam; nekopíruje inline text do ďalších sekcií.

Display potrebuje úzky integračný bod existujúceho `DetailField`: voliteľný `labelHelp?: ReactNode`, renderovaný vedľa textového labelu v `dt`. Zachovať `label: string` aj copy accessible name. Aplikovať konzistentne v troch existujúcich vetvách; bez hodnoty slotu musí DOM aj vzhľad zostať pôvodný. Pri záverečnej kontrole worktree už súbežná práca doplnila presne tento slot a shared testy. Tieto cudzie zmeny nie sú súčasťou tohto dokumentačného commitu: pred implementáciou úlohy 4 znovu skontrolovať ich stav, znovu použiť existujúci slot a neduplikovať ho. Ide o minimálny integračný bod, nie nový shared helper alebo všeobecný refactoring. Overiť test utility `detailSectionsFields`: musí čítať text labelu bez prístupného mena otázniku.

Všetky tri pohľady používajú rovnaké kľúče a `sections={[]}`. Žiadny nový súhrnný modal ani tooltip systém. Otáznik nesmie spustiť Enter submit, zmeniť hodnoty/dirty stav ani zavrieť nadradený modal pri prvom Escape. Zachovať návrat focusu a tab navigáciu existujúceho popovera; overiť integračne, neupravovať shared mechanizmus preventívne.

## Kompletné návrhy EN/SK textov

Nasledujúce JSON bloky sú ploché dodatky do locale máp. Neobsahujú informácie o predvolených hodnotách. Číselný krok frekvencie je formulárové pravidlo uvedené vyššie; v nápovede ho nevydávame za backendový kontrakt.

### EN

```json
{
  "snapshotPolicies.fieldHelp.level.trigger": "Help for level",
  "snapshotPolicies.fieldHelp.level.title": "Level",
  "snapshotPolicies.fieldHelp.level.intro": "A freely defined criticality level, such as critical, high, medium or low.",
  "snapshotPolicies.fieldHelp.frequency.trigger": "Help for frequency",
  "snapshotPolicies.fieldHelp.frequency.title": "Frequency",
  "snapshotPolicies.fieldHelp.frequency.intro": "How often a snapshot is created. The value and unit define the schedule for running the recovery group DAG. Supported units are minutes, hours and days. The backend rejects intervals below its configured minimum.",
  "snapshotPolicies.fieldHelp.maxSnapshots.trigger": "Help for maximum snapshots",
  "snapshotPolicies.fieldHelp.maxSnapshots.title": "Maximum snapshots",
  "snapshotPolicies.fieldHelp.maxSnapshots.intro": "An explicit maximum number of snapshots to keep. When set, it takes precedence over the count calculated from retention and frequency.",
  "snapshotPolicies.fieldHelp.retention.trigger": "Help for retention",
  "snapshotPolicies.fieldHelp.retention.title": "Retention",
  "snapshotPolicies.fieldHelp.retention.intro": "How long a snapshot is kept. If maximum snapshots is not set, the number of snapshots to keep is retention divided by frequency, rounded up, with a minimum of one.",
  "snapshotPolicies.fieldHelp.flashcopyCopyRate.trigger": "Help for FlashCopy copy rate",
  "snapshotPolicies.fieldHelp.flashcopyCopyRate.title": "FlashCopy copy rate",
  "snapshotPolicies.fieldHelp.flashcopyCopyRate.intro": "The background copy rate for an IBM FlashCopy mapping, from 0 to 150. At 0, background copying is disabled and the snapshot remains dependent on the source storage. A value above 0 enables background copying until an independent target copy is created. Copying consumes actual storage capacity. This parameter is ignored for Hitachi VSP groups.",
  "snapshotPolicies.fieldHelp.enabled.trigger": "Help for policy status",
  "snapshotPolicies.fieldHelp.enabled.title": "Policy status",
  "snapshotPolicies.fieldHelp.enabled.intro": "Enables or disables the policy."
}
```

### SK

```json
{
  "snapshotPolicies.fieldHelp.level.trigger": "Nápoveda k úrovni",
  "snapshotPolicies.fieldHelp.level.title": "Úroveň",
  "snapshotPolicies.fieldHelp.level.intro": "Voľne definovaná úroveň kritickosti, napríklad critical, high, medium alebo low.",
  "snapshotPolicies.fieldHelp.frequency.trigger": "Nápoveda k frekvencii",
  "snapshotPolicies.fieldHelp.frequency.title": "Frekvencia",
  "snapshotPolicies.fieldHelp.frequency.intro": "Určuje, ako často sa vytvára snímka. Hodnota a jednotka určujú plán spúšťania DAG skupiny obnovy. Podporované jednotky sú minúty, hodiny a dni. Backend odmieta intervaly kratšie než jeho nakonfigurované minimum.",
  "snapshotPolicies.fieldHelp.maxSnapshots.trigger": "Nápoveda k maximálnemu počtu snímok",
  "snapshotPolicies.fieldHelp.maxSnapshots.title": "Maximálny počet snímok",
  "snapshotPolicies.fieldHelp.maxSnapshots.intro": "Explicitný maximálny počet uchovávaných snímok. Ak je nastavený, má prednosť pred počtom vypočítaným z uchovania a frekvencie.",
  "snapshotPolicies.fieldHelp.retention.trigger": "Nápoveda k uchovaniu",
  "snapshotPolicies.fieldHelp.retention.title": "Uchovanie",
  "snapshotPolicies.fieldHelp.retention.intro": "Určuje, ako dlho sa snímka uchováva. Ak nie je nastavený maximálny počet snímok, počet sa vypočíta ako uchovanie delené frekvenciou, zaokrúhlené nahor, minimálne na jednu snímku.",
  "snapshotPolicies.fieldHelp.flashcopyCopyRate.trigger": "Nápoveda k rýchlosti kopírovania FlashCopy",
  "snapshotPolicies.fieldHelp.flashcopyCopyRate.title": "Rýchlosť kopírovania FlashCopy",
  "snapshotPolicies.fieldHelp.flashcopyCopyRate.intro": "Rýchlosť kopírovania na pozadí pre mapovanie IBM FlashCopy v rozsahu 0 až 150. Pri hodnote 0 je kopírovanie na pozadí vypnuté a snímka zostáva závislá od zdrojového úložiska. Hodnota väčšia ako 0 zapne kopírovanie na pozadí až do vytvorenia nezávislej cieľovej kópie. Kopírovanie spotrebúva skutočnú kapacitu úložiska. Pri skupinách Hitachi VSP sa tento parameter ignoruje.",
  "snapshotPolicies.fieldHelp.enabled.trigger": "Nápoveda k stavu politiky",
  "snapshotPolicies.fieldHelp.enabled.title": "Stav politiky",
  "snapshotPolicies.fieldHelp.enabled.intro": "Zapína alebo vypína politiku."
}
```

## Poradie, riziká a overenie

1. Frequency správanie a cielené testy → najrizikovejšia zmena vstupných dát.
2. Preusporiadanie formulára → kontrola DOM poradia a vizuálna kontrola.
3. EN/SK texty a otázniky Create/Edit → integračná kontrola labelov a stavu.
4. Úzky slot DetailField → shared regresná kontrola.
5. Display otázniky → integračná kontrola všetkých pohľadov a finálna vizuálna kontrola.

| Riziko | Dopad | Opatrenie |
|---|---|---|
| Zaokrúhlenie pri prepnutí jednotky mení interval | vysoký | Schváliť pravidlo, viditeľné oznámenie, testy oboch smerov a bez horného limitu 60 |
| Staršiu politiku nemožno uložiť bez opravy Frequency | stredný | Bez zmeny pri načítaní; vysvetľujúca chyba až pri validácii, test žiadneho requestu |
| Neoverený backend HTML zdroj | stredný | Pred zapísaním prekladov porovnať s originálom; nepridávať ďalšie účinky |
| Shared DetailField ovplyvní iné detaily | stredný | Voliteľný slot bez zmeny string labelu a pôvodného DOM bez slotu; focused shared test |
| Popover koliduje s nadradeným modalom | stredný | Skutočná integrácia: focus, Enter, Escape, dirty guard a payload |
| SK texty zúžia formulár | stredný | Overiť EN/SK pri 320, 375 a 768 px aj desktop; žiadny horizontálny scroll |

Akceptácia zahŕňa: poradie a responzivitu, všetky hodnotové pravidlá, presne šesť parametrových triggerov, absenciu triggerov pre identitu, rovnaké EN/SK texty vo všetkých pohľadoch bez default informácií, nezmenený celkový helper a FlashCopy, bez regresie stavu/payloadu. Konkrétne testy a súbory sú v TODO. Pri počítaní otáznikov oddeliť hlavičkový trigger a tlačidlo zatvorenia otvoreného popovera.

Focused testy spúšťať po príslušnej úlohe, ESLint len na zmenených TS/TSX súboroch. EN/SK JSON validovať parserom a kontrolou zhodných nových kľúčov. Vizuálne overenie robiť v reálnom prehliadači; jsdom nedokazuje layout. Kompletnú sadu ani produkčný build nespúšťať automaticky. Po úspešnom overení každej implementačnej úlohy vytvoriť samostatný commit podľa AGENTS.md.

## Body na schválenie pred implementáciou

- Schváliť tento plán a TODO vrátane prevodu jednotiek so zaokrúhlením nahor a viditeľným oznámením.
- Potvrdiť navrhnutý postup pre historické neplatné frekvencie a minimálny slot `DetailField.labelHelp`.
- Získať dostupné originálne HTML na porovnanie významov; jeho nedostupnosť neblokuje odovzdanie návrhu plánu.

Implementácia čaká na následné schválenie používateľom podľa zadania.
