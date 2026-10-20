# Technický návrh Create/Edit: Recovery Groups a Recovery Apps

Návrh z 20. 10. 2026. Rozsah: konfiguračné formuláre, nie zoznamy ani detailové panely.
HTML šablóny sú návrhový artefakt na posúdenie vzhľadu a informačnej hierarchie.
Produkčný React kód sa nemení.

## Otvorenie šablón

- [Recovery Groups](groups.html)
- [Recovery Apps](apps.html)

Otvoriť priamo v prehliadači alebo cez existujúci Vite server:

- http://localhost:5173/prototypes/recovery-builders-technical/groups.html
- http://localhost:5173/prototypes/recovery-builders-technical/apps.html

Prepínač **Scenario** obsahuje Create, Edit a nasadenú konfiguráciu.
Prepnutie načíta nový vzorový formulár; pri zmenách žiada potvrdenie ich zahodenia.
Všetky dáta sú fiktívne. Šablóny neposielajú požiadavky, neukladajú dáta a nepoužívajú CDN.
Review zobrazuje lokálny súhrn, nie backend payload.

## Vizuálny smer

Odporúčaný smer: svetlé, kompaktné technické pracovné rozhranie nad existujúcou
modrou paletou. Zachováva čitateľnosť aplikácie a zviditeľňuje konfiguráciu.
Tmavá konzola by viac menila identitu produktu; plný jednostránkový formulár by
skomplikoval existujúce podmienené kroky. Preto zostáva sprievodca s kontextovým panelom.

| Oblasť | Návrh |
| --- | --- |
| Rozloženie | Navigácia 200 px, pružný formulár, súhrn 280 px |
| Formulár | Dva stĺpce pre súvisiace krátke hodnoty, popis cez celú šírku |
| Kroky | Číselné označenie 01–08, aktuálny krok s modrým pruhom |
| Kontext | Identita, workload/platforma, počet resources/tiers, policy set, push |
| Typografia | Bežný UI font pre názvy, monospace iba pre ID a technické hodnoty |
| Povrchy | Jemné deliace čiary, radius 4–6 px, bez dekoratívnych tieňov |
| Akcie | Jednotná päta Back / Continue / finálna akcia, stav rozpracovania |
| Farby | Existujúce page/surface/text/border hodnoty; tmavší modrý text pre kontrast |
| Uzamknutie | Viditeľný dôvod, readonly/disabled pole a zachovaná hodnota |

V produkcii sa zachová existujúci globálny shell a sidebar. Horný prepínač scenárov
a označenie prototypu sú iba ovládanie návrhu. Produkčná päta má navyše Cancel
napojený na existujúci `useUnsavedChangesGuard`.

## Recovery Groups

Zachovať poradie z `RecoveryGroupBuilder`:

1. Details — ID, názov, povinný popis.
2. Storage topology — Local / Metro Mirror, storage provider, odvodený partner,
   Existing / Managed režim a príslušné validačné hlásenia.
3. Resource type — kategória a workload; technická voľba s typom resource.
4. Provider — oprávnený provider a jeho discovery scope.
5. Resources — kompaktná tabuľka, filter, výber a počet vybraných položiek.
6. Related storage — iba pri VM; objavené volumes, výbery a auxiliary mappings.
7. Policy set — povinná referencia na policy set.
8. Orchestration — oprávnený Airflow provider a samostatný prepínač push.

Pri volume-only skupine sa Related storage vynechá; číslovanie musí vychádzať
z existujúceho `calculateRecoveryGroupStepIndices`.

Edit zachová uzamknuté ID a resource type. Existujúce pravidlá topológie zostávajú
autoritou: Metro Mirror mode sa pri editácii nemení; Managed zamyká aj topológiu
a zdroj storage. Nasadená group je read-only. Rovnako zostáva zamknutá Managed
group s provisioned identifikátormi po neúplnom rollbacku.

Prototyp interaktívne pokrýva VMware VM cestu, výber resources a Local/Metro Mirror.
Ďalšie workloady, skutočné discovery, consistency group override a auxiliary mapping
editory sú opísané v návrhu, nie implementované v HTML. Related storage je explicitne
statická ilustrácia; nepredstiera prepočet podľa výberu VM.

## Recovery Apps

Zachovať štyri kroky z `RecoveryAppBuilder`:

1. Details — file name, názov, popis, environment, platforma a source/target.
2. Recovery tiers — očíslované bloky, jednoznačné priradenie group, výber VM,
   vytvorenie/odstránenie tier a zmena poradia.
3. Policy set — referencia na existujúci policy set.
4. Orchestration — provider, push a finálna akcia.

Tiers majú pôsobiť ako konfigurácia poradia, nie ako už vykonaný runtime pipeline.
Zachovať `TierCanvas`, dostupné groups a jeho pravidlá; doplniť kompaktnú prezentáciu
a klávesnicové ovládanie poradia. Návrh nevyžaduje nový DAG editor.

V editácii sú file name, platforma, source a target uzamknuté. Chýbajúci alebo
neplatný uložený provider nesmie byť potichu nahradený. Pri nasadenej aplikácii
zostáva push zapnutý podľa `lockPushToOrchestrator`. Zmena source v Create musí
zachovať existujúce potvrdenie odpojenia groups z tiers.

HTML demonštruje priradenie groups a zmenu poradia troch vzorových tiers.
Pridávanie, odstraňovanie a per-VM výber sa prenesú z existujúceho buildera
v prípadnej následnej implementácii.

## Prenesenie do Reactu

| Súčasná časť | Navrhovaná úprava |
| --- | --- |
| `RecoveryGroupBuilder`, `RecoveryAppBuilder` | Layout s navigáciou, editorom a odvodeným súhrnom |
| `WizardSteps` | Kompaktný vzhľad, čísla, `aria-current="step"`; zachovať disabled pravidlá |
| `RecoveryGroupDetailsStep`, `AppMetadataForm` | Dvojstĺpcové polia a explicitné vysvetlenia zámkov |
| Resource a storage kroky | Jednotná hustota tabuliek, identifikátory monospace |
| `TierCanvas` a group selector | Kompaktné očíslované tiers, viditeľné priradenia a poradie |
| Existujúce form controls a tokeny | Znovu použiť; globálny radius ani témy nemení návrh automaticky |

Súhrn odvodzovať priamo z `draft` / `formState`; nevytvárať druhý stav formulára.
Bez zmeny DTO, query hooks, API endpointov, validátorov alebo generovaných schém.
Zdieľaný layout extrahovať až pri implementácii oboch builderov; validačné a doménové
rozhodnutia ponechať vo feature. Texty implementácie doplniť do cs/en/sk lokalizácie.

Pre produkčnú finálnu akciu použiť Create / Save changes a existujúce submit handlery.
HTML zámerne používa Review configuration, pretože nemá backend.
Úspešné uloženie, push a úspešný recovery run musia zostať rozdielne stavy.

## Responzivita, prístupnosť a stavy

- Nad 1150 px tri stĺpce; nižšie súhrn pod formulárom; pod 700 px horizontálne kroky
  a jednosĺpcové polia. Tabuľky majú vlastný horizontálny scroll.
- Label pre každé pole, viditeľný focus, semantické button/input/select prvky,
  nadpis kroku dostane focus po navigácii. Modálny review používa natívny dialog.
- Nezobrazovať farbu ako jediný nositeľ stavu. Technické identifikátory zalamovať.
- Produkčné loading/error/empty stavy zachovať: skeleton pri načítaní, Retry pri
  chybe providerov/inventory, prázdny zoznam bez falošných dát, blokovaná akcia
  s konkrétnym dôvodom. Pri odosielaní blokovať dvojité submitnutie.
- Ukážka má základnú kontrolu povinných polí a prázdneho VM výberu. Voľná navigácia
  medzi krokmi je určená na review návrhu; nenahrádza produkčnú validáciu.

## Overenie a hranice

Spustiť:

```sh
node --check prototypes/recovery-builders-technical/builder.js
node prototypes/recovery-builders-technical/verify.mjs
git diff --check -- prototypes/recovery-builders-technical
```

DOM kontrola pokrýva šesť scenárov, kroky, zámky, filter, výber, základnú validáciu,
priradenie a poradie tiers, aktualizáciu súhrnu a review. JSDOM nenahrádza render
prehliadača; natívny dialog je v kontrole simulovaný.

V tejto relácii nie je pripojený žiadny browser cez dostupné browser tools.
Vizuálna kontrola pri 320/768/1024/1440 px, skutočný keyboard/focus priechod,
natívny dialog a meranie kontrastu preto zostávajú neoverené.
Pred produkčnou implementáciou treba návrh vizuálne posúdiť. Kompletná test suite
ani produkčný build nie sú potrebné pre tento izolovaný návrhový artefakt.
