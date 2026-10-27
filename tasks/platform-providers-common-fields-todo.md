# Platform Providers: checklist

## T1: Spoločný kontrakt a payload

Presunúť email a doplniť interval do existujúceho stavu a kontraktu.

- [x] Inicializácia edit a zmena typu zachovajú obe hodnoty, ostatné typové hodnoty sa resetujú.
- [x] Mapper pre všetky typy posiela email string/null a interval number/null; generated schéma payload prijíma.
- [x] Overenie: focused mapper/type-contract testy vrátane presných payload assertions.

Závislosti: existujúca generated schéma. Súbory: model/platformProviderForm.ts, model/platformProviderTypes.ts, model/platformProviderTypes.test.ts, helpers/platformProviderSubmitMapper.ts a jeho test (5).

## T2: Create/Edit

Pridať dve spoločné polia cez existujúce controls a validáciu v modale.

- [x] Každý typ má obe polia práve raz, email input a number input min=1/step=1; prázdne hodnoty platné.
- [x] Edit načíta hodnoty, zmena typu ich zachová; invalid email a interval 0/-1/1.5 blokujú submit pre každý typ.
- [x] Overenie: PlatformProviderForm.test.tsx a PlatformProvidersModal.test.tsx.

Závislosti: T1. Súbory: form/modal a ich testy (4).

## Checkpoint: Stav a submit

- [x] T1–T2 testy prešli; ostatné typové polia neunikajú do payloadu.

## T3: DetailView

Presunúť spoločné polia pred existujúce typové polia bez zmeny ich vzájomného poradia.

- [x] Email a interval sa zobrazujú raz pre všetky typy, aj pri nenastavenej hodnote.
- [x] Presné poradie a obsah ostatných typových polí ostávajú zachované.
- [x] Overenie: PlatformProvidersTable.test.tsx.

Závislosti: T1. Súbory: table a jeho test (2).

## Checkpoint: Dokončenie

- [x] Všetky focused Platform Providers testy prešli.
- [x] Focused ESLint a git diff --check prešli; výsledky a limity uvedené v pláne.
- [x] Diff skontrolovaný a vlastné súbory commitnuté bez cudzej práce.
