# Implementačný plán: Snapshot Policy FlashCopy copy rate

Dátum: 2026-10-22. Stav: schválené a vykonané inline; T1–T5 overené automatickými kontrolami. Browser QA nedostupné; limity a výsledky v todo.md.
Úlohy a checkpointy: [todo.md](todo.md).

## Cieľ a rozsah

Integrovať `flashcopy_copy_rate` do existujúceho Snapshot Policy CRUD. Najvyššia priorita: politika s hodnotou `50` pri zmene iba názvu odošle opäť `50`, nikdy implicitný default `0`. Nová politika odošle `0`; používateľ môže nastaviť celé číslo `0–150`. Zobraziť hodnotu v detaile aj Snapshot Policy facts Policy Set pickera.

Plán po analýze schválil používateľ pokynom executing-plans inline. Predchádzajúce tasks/plan.md a tasks/todo.md boli o dokončenom VMware Live Refresh a pri kontrole nemali nezaškrtnuté úlohy. Policy Catalog plánovacie dokumenty sa nemenia.

## Overený východiskový stav

- Vetva `spike/ant-design-shell`. Vstupné zmeny: `openapi/abco-api.json`, štyri generated Zod schémy a nesúvisiaci `useVmwareResourceInventory.test.tsx` (pri kontrole 86 pridaných a 1 odstránený riadok). Všetky zachovať.
- FE CodeGraph použitý pred čítaním zdrojov. Preverené form, modal, table, ich testy, picker facts a usePolicyCatalog.
- BE kontrakt prečítaný read-only zo susedného ../abco-be na commite `ca93414353df2a4629fbb6bb04ff432259ec65c7`. Model v policy/snapshot_policies.py: integer, default 0, ge=0, le=150. Router POST /submit_policy prijíma SnapshotPolicy a ukladá model_dump. Vynechané pole preto môže resetovať uloženú hodnotu na default.
- dag_handler.py používa policy.get('flashcopy_copy_rate', 0). IBM Recovery Group šablóna odovzdáva str(COPY_RATE) ako copyrate do mkfcmap. Hodnota sa vkladá pri renderovaní DAGu; úprava politiky sama negarantuje aktualizáciu existujúceho DAGu. Môže byť potrebný regenerate/push. Žiadne BE zmeny ani automatický push sa neplánujú.
- BE Git vyžadoval iba jednorazové `git -c safe.directory=C:/Users/polnikr/source/ABCO/abco-be -C ../abco-be show ...`; globálna konfigurácia sa nemenila. CodeGraph BE odmietol ako neindexovaný, preto bol použitý git show.
- OpenAPI diff pridáva pole do SnapshotPolicy aj SnapshotPolicyRecord, mimo required. Všetky štyri generated schémy snapshotPolicy/snapshotPolicyRecord/snapshotPoliciesResponse/submitPolicyBody majú zod.int().min(0).max(150).default(0). Input môže pole vynechať; output ho má povinné.
- FormData, EMPTY_FORM, toFormData, validate a handleSubmit zatiaľ pole neobsahujú. Modal test používa generated hook s mock fetch a presnú assertion serializovaného requestu.
- Table má osem stĺpcov a min-w-260; hodnotu doplniť len do DetailOverview. Picker už zobrazuje snapshot frequency/retention/status; nový fact patrí k nim bez zmeny catalog modelu.
- Preklady sú ploché JSON kľúče snapshotPolicies.*; zachovať konvenciu EN/SK/CS.

## Rozhodnutia

1. Zachovať shared Field/Input a modal layout. Form field `flashcopy_copy_rate: string`; nový default `'0'`; edit `String(policy.flashcopy_copy_rate)`; payload `Number(formData.flashcopy_copy_rate)`.
2. Pred konverziou odmietnuť prázdny/whitespace vstup cez trim, potom Number.isInteger a rozsah 0–150. Samotné Number('') vracia 0. HTML type=number, min=0, max=150, step=1 dopĺňa aplikačnú validáciu.
3. Nové kľúče: snapshotPolicies.form.flashcopyCopyRate, snapshotPolicies.form.flashcopyCopyRateHelp a snapshotPolicies.validation.flashcopyCopyRate. Label znovu použiť v oboch detailoch. Help vysvetlí 0 bez background copy, možný rast storage spotreby pri nenulovej hodnote a ignorovanie nastavenia Hitachi VSP.
4. Legacy wire response normalizuje Zod na 0; nevytvárať duplicitné API typy ani defaultovanie v catalog modeli. Overiť aj skutočnú response validačnú cestu.
5. Bez nového endpointu, query keys, API vrstvy, invalidácie, state managementu alebo form frameworku. Generated súbory neupravovať ani neregenerovať.
6. Pracovať inline. Pôvodný zákaz commitu používateľ po dokončení implementácie výslovne zmenil na požiadavku vytvoriť atómové commity vlastných zmien. Stage/commit sú teraz povolené iba pre vlastné súbory; bez resetu, stashu, zmeny vetvy, worktree alebo pushu. Vstupné OpenAPI/generated zmeny a súbežná VMware práca zostávajú mimo commitov.

## Závislosti a poradie

Existujúci BE/OpenAPI/Zod kontrakt → T1 (fixtures + kompatibilita) → T2 (preklady) → checkpoint A → T3 (create/edit/validácia) → T4 (detaily) → checkpoint B → T5 (regresie a report).

T1–T2 sú malé prípravné kroky; T3 a T4 sú overiteľné používateľské rezy. Najviac päť súborov na úlohu. V T3/T4 najprv failing behavior test, potom minimálna implementácia a green v tom istom kroku. Pracovať sekvenčne vzhľadom na zdieľané testy/preklady/workspace; paralelizácia nie je potrebná. Podrobný checklist je iba v todo.md.

## Skutočné overenie počas plánovania

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/snapshot
npm.cmd run typecheck
```

- Vitest: **19 passed, 0 failed, 4 súbory**, exit 0.
- Typecheck: exit 1, presne **3× TS2741**: SnapshotPoliciesTable.test.tsx:15 a :28; SnapshotPolicyModal.test.tsx:13. Chýba flashcopy_copy_rate v troch typovaných fixtures. Iné TS chyby aktuálny beh nehlásil. Exit 1 je aktuálny výsledok, podklad uvádzal exit 2.
- Nové acceptance testy sa nepridávali. Kompletná suite, production build, ESLint, browser QA a živý backend sa počas plánovania nespúšťali. Baseline 19 testov nepreukazuje novú funkcionalitu.

## Riziká a ošetrenie

| Riziko | Ošetrenie |
| --- | --- |
| Rename resetuje existujúcu hodnotu | Povinný HTTP payload test zachovania 50. |
| Prázdny vstup sa skonvertuje na 0 | Trim kontrola pred Number; test blokovania requestu. |
| Number input sanitizuje nečíselný text | Testovať reálny sanitizovaný prázdny stav a odmietnutie submitu, nevyrábať umelý DOM stav ani nový validator len pre test. |
| Mock hook obíde Zod default | Test schém aj validatingMutator; pre picker test 50 explicitná fixture. |
| Zod optional input vs required output | Opraviť typované fixtures; default testovať na wire dátach bez poľa. |
| Široké UI zmeny | Jeden DetailField a jeden picker fact, bez nového stĺpca alebo catalog refaktoru. |
| Starý DAG ostane nezmenený | Uviesť možný regenerate/push v reporte; bez automatickej operácie. |
| Súbežné zmeny | Status/diff pred každým krokom; cudzie súbory zachovať a regresie oddeliť dôkazmi. |

## Otvorené body

Plán schválený a vykonaný inline bez ďalšieho potvrdenia. Implementované existujúce picker facts aj detail bez rozšírenia tabuľky. Finálne regresie: 142 passed v 14 súboroch, typecheck a focused ESLint exit 0; posledný upravený modal test opätovne 17 passed. Browser inventory nemá dostupný prehliadač a Chrome DevTools MCP nie je nakonfigurovaný; vizuálne kontroly zostávajú neoverené. Produkčné aplikovanie hodnoty v IBM storage nie je preukázané FE testami.
