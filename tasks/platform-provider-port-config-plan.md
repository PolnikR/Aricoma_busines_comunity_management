# Implementačný plán: Konfigurovateľný port platform providera

## Prehľad

Formulár platform providera už obsahuje pole `port`, zobrazuje ho vedľa IP adresy, validuje rozsah `1–65535` a posiela ho do API ako číslo. Úprava preto nebude vytvárať druhé pole. Zavedie samostatný feature config podľa vzoru `discoveryInventoryConfig.ts`, odstráni roztrúsené číselné literály a pridá regresné testy pre predvolený port `22`, responzívny layout a API kontrakt.

## Rozsah

- vytvoriť `PLATFORM_PROVIDERS_CONFIG` v adresári platform-provider feature,
- nastaviť dočasný predvolený port na `22`,
- zachovať povolený celočíselný rozsah `1–65535`,
- použiť config pri vytvorení formulára, UI atribútoch a validácii,
- zachovať editáciu existujúceho portu bez prepísania defaultom,
- zachovať IP adresu a port v jednom riadku na `sm` a väčších viewportoch, s vertikálnym skladaním na úzkych obrazovkách,
- zachovať serializáciu portu do API ako `number`.

Mimo rozsahu je runtime konfigurácia zo servera, automatický výber portu podľa typu providera a zmena backendového API kontraktu.

## Architektonické rozhodnutia

- Config bude umiestnený v `src/features/platform-administration/platform-providers/config/platformProvidersConfig.ts`, pretože ide o politiku vlastnenú platform-provider feature, nie o globálne aplikačné nastavenie.
- Exportovaný objekt bude mať stabilnú štruktúru:

  ```ts
  export const PLATFORM_PROVIDERS_CONFIG = {
    connection: {
      defaultPort: 22,
      minPort: 1,
      maxPort: 65_535,
    },
  } as const
  ```

- Predvolená hodnota sa použije iba pri vytvorení nového providera. Editačný formulár vždy použije `provider.port` zo serverového záznamu.
- Formulár si ponechá port ako `string`, aby korektne reprezentoval aj dočasne prázdny input. Konverzia na `number` zostane na hranici submitu.
- Config určí hodnoty a validačné hranice, nie CSS. Responzívne rozloženie zostane zodpovednosťou komponentu.
- Nebude pridaná nová závislosť ani generická form/config abstrakcia.

## Tok závislostí

```text
PLATFORM_PROVIDERS_CONFIG
    ├── počiatočný stav create formulára (defaultPort = 22)
    ├── HTML input atribúty (min, max, step)
    ├── klientská submit validácia
    └── Zod API schéma
             └── API JSON payload s portom typu number
```

## Úlohy

### Úloha 1: Zaviesť feature config a jeho kontraktový test

**Popis:** Vytvoriť config súbor podľa existujúceho vzoru discovery inventory a test, ktorý explicitne dokumentuje dočasný default `22` a platný rozsah portov.

**Akceptačné kritériá:**

- `PLATFORM_PROVIDERS_CONFIG.connection.defaultPort` je `22`.
- Minimálny port je `1` a maximálny port je `65_535`.
- Config je readonly cez `as const` a neobsahuje UI/CSS hodnoty.

**Verifikácia:**

- `npm run test -- src/features/platform-administration/platform-providers/config/platformProvidersConfig.test.ts`
- `npm run typecheck`

**Závislosti:** Žiadne.

**Pravdepodobne dotknuté súbory:**

- `src/features/platform-administration/platform-providers/config/platformProvidersConfig.ts`
- `src/features/platform-administration/platform-providers/config/platformProvidersConfig.test.ts`

**Odhad:** S, 10–15 minút agenta.

### Úloha 2: Napojiť create/edit stav a validáciu na config

**Popis:** Nahradiť literál `'22'` v počiatočnom stave hodnotou z configu a rovnaké validačné hranice použiť v modale, inpute a Zod schéme. Doplniť `step={1}` pre celočíselný port. Editačný tok musí naďalej použiť uloženú hodnotu providera.

**Akceptačné kritériá:**

- Nový provider otvorí pole Port s hodnotou `22` získanou z configu.
- Editovaný provider zobrazí svoju uloženú hodnotu, aj keď nie je `22`.
- Prázdna, desatinná alebo mimo rozsahu ležiaca hodnota sa neodošle.
- Platný port sa v `PlatformProviderSubmitData` a JSON payloade odošle ako `number`.

**Verifikácia:**

- cielený modal test pre create default, edit hodnotu a neplatný port,
- existujúce API testy pre platný/neplatný port,
- `npm run typecheck`.

**Závislosti:** Úloha 1.

**Pravdepodobne dotknuté súbory:**

- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx` (nový)
- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.tsx`
- `src/features/platform-administration/platform-providers/api/schemas/platformProvidersSchema.ts`
- `src/features/platform-administration/platform-providers/api/platformProvidersApi.test.ts`

**Odhad:** M, 20–30 minút agenta.

### Checkpoint po úlohách 1–2

- config test, modal test a API testy prejdú,
- TypeScript prejde bez chýb,
- create a edit tok používajú rozdielne správne zdroje hodnoty portu.

### Úloha 3: Uzamknúť responzívny IP/port layout testom

**Popis:** Zachovať všetky ostatné polia vertikálne. IP adresa a port zostanú v jednom spoločnom grid riadku, kde IP využije dostupný priestor a port má kompaktnú šírku. Na úzkom viewporte sa obe polia zložia pod seba. Doplniť komponentový test pre labely, input atribúty a spoločný layout kontajner.

**Akceptačné kritériá:**

- IP address a Port sú súrodenci v rovnakom grid kontajneri.
- Layout je jeden stĺpec na úzkych obrazovkách a dva stĺpce od `sm` breakpointu.
- IP stĺpec je flexibilný a port stĺpec má približne `120px`.
- Obe polia majú správne label/input prepojenie a invalid stav zostáva dostupný cez `aria-invalid`.

**Verifikácia:**

- `npm run test -- src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx`
- manuálne: desktopový modal zobrazuje IP a Port vedľa seba,
- manuálne: pri úzkom viewporte nedochádza k horizontálnemu overflow a polia sa zoradia pod seba.

**Závislosti:** Úloha 2.

**Pravdepodobne dotknuté súbory:**

- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx` (nový)

**Odhad:** S, 10–15 minút agenta.

### Úloha 4: Finálne produkčné overenie

**Popis:** Spustiť cielené testy a celý projektový quality gate. V prehliadači skontrolovať create aj edit modal a sieťový request.

**Akceptačné kritériá:**

- cielené config/form/modal/API testy prejdú,
- celý lint, typecheck, test suite a Vite build prejdú,
- create request obsahuje `port: 22` ako číslo, pokiaľ používateľ hodnotu nezmení,
- zmena portu v UI sa premietne do requestu a edit modal zachová serverovú hodnotu.

**Verifikácia:**

- `npm run build`
- browser: otvoriť create modal, overiť layout a default `22`, odoslať a skontrolovať request payload,
- browser: otvoriť provider s iným portom a overiť, že sa neprepíše na `22`.

**Závislosti:** Úlohy 1–3.

**Pravdepodobne dotknuté súbory:** Žiadne ďalšie.

**Odhad:** S, 10–15 minút agenta vrátane behu build pipeline.

## Checkpoint dokončenia

- všetky akceptačné kritériá sú splnené,
- `npm run build` skončí s exit kódom `0`,
- browser verifikácia potvrdí responzívny layout a číselný API payload,
- staged diff obsahuje iba platform-provider port/config zmenu a súvisiace testy.

## Riziká a mitigácie

| Riziko | Dopad | Mitigácia |
|---|---:|---|
| Default `22` omylom prepíše port pri editácii | Vysoký | Oddeliť create počiatočný stav od `toPlatformProviderFormData` a testovať provider s portom odlišným od `22`. |
| UI, klientská validácia a Zod schéma použijú odlišné hranice | Stredný | Všetky tri miesta čítajú `minPort`/`maxPort` z jedného feature configu. |
| `type="number"` vráti string alebo dočasne prázdnu hodnotu | Stredný | Držať form state ako string a konvertovať až po úspešnej celočíselnej validácii. |
| Dvojstĺpcový riadok spôsobí overflow na mobile | Stredný | Mobile-first jeden stĺpec; dva stĺpce až od `sm`, plus flexibilný IP stĺpec. |
| Budúce typy providerov budú potrebovať iný default | Nízky | Teraz nepoužiť predčasnú mapu podľa typu; config možno neskôr rozšíriť bez zmeny formulárového kontraktu. |

## Paralelizácia

Neodporúča sa. Úlohy zdieľajú config a tie isté komponenty; sekvenčné vykonanie znižuje riziko konfliktov a každá úloha zostane samostatne overiteľná.

## Celkový odhad

Približne **50–75 minút práce Codex agenta**, vrátane cielených testov, celého buildu a browser verifikácie. Produkčný kód je už z veľkej časti pripravený; väčšinu práce tvorí centralizácia konfigurácie a regresné pokrytie.

## Otvorené otázky

Žiadne. Pre túto iteráciu je predvolený port explicitne `22`.
