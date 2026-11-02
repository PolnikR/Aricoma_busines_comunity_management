# Platform Providers: spoločné polia

## Rozsah a rozhodnutia

Implementovať zadanie používateľa na aktuálnej vetve. Plán a checklist majú používateľom schválené samostatné umiestnenie; pôvodný plán FlashCopy ostáva nedotknutý.

- Existujúca generated schéma OrchestrationProvider podporuje notificationEmail ako string/null a cacheRefreshSeconds ako integer/null, obe nepovinné. Prázdne hodnoty odosielať ako null, bez FE defaultu intervalu.
- Zachovať existujúce vetvenie podľa typu; presunúť len dve požadované polia do spoločnej časti. Použiť existujúce preklady a form controls.
- Nedotýkať sa rozpracovaných Clean Room súborov a locales ani generated API, BE a shared komponentov.

## Poradie

1. Kontrakt, inicializácia, zmena typu a mapper → presné payload testy, schéma a stav.
2. Create/Edit formulár a validácia → testy všetkých štyroch typov, zachovania hodnôt a hraníc.
3. DetailView → testy hodnôt/prázdnych hodnôt a presného poradia typových polí.
4. Cielená regresia, lint, kontrola diffu a atómový commit len vlastných zmien.

Podrobný checklist: [platform-providers-common-fields-todo.md](platform-providers-common-fields-todo.md).

## Riziká a overenie

Prázdny string sa nesmie konvertovať na 0. Email ani interval sa nesmú resetovať pri zmene typu. Presné payload a detail assertions zachovajú kontrolu filtrovania ostatných polí. Generated schéma neobmedzuje integer na kladné hodnoty; FE validácia musí odmietnuť 0, záporné a desatinné čísla.

Overenie: explicitné testové súbory v src/features/platform-administration/platform-providers, focused ESLint a git diff --check. Kompletná suite ani production build nie sú potrebné. Chrome DevTools MCP nie je dostupný; browser QA uviesť ako limit, ak sa nepodarí alternatíva.

## V?sledky

- Baseline: 50/50 testov; nov? kontraktov? a UI testy pred implement?ciou zlyhali na ch?baj?cich spolo?n?ch poliach.
- Fin?lna regresia: 82/82 testov v 7 s?boroch, exit 0.
- Focused ESLint: exit 0; git diff --check: exit 0.
- Chrome DevTools MCP nedostupn?; browser QA nevykonan?. Kompletn? suite, typecheck a production build nespusten?.
- Filtrovanie ostatn?ch pol? a ich poradie zachovan?, overen? presn?mi payload/detail assertions. Bez nezrovnalost? br?niacich API integr?cii; generated sch?ma povo?uje integer/null, kladn? rozsah kontroluje FE.
- Cudzie Clean Room a locale zmeny po?as pr?ce commitla in? rel?cia; t?to ?loha ich neupravovala.

Pr?kazy z?vere?n?ho overenia:

```powershell
node node_modules/vitest/vitest.mjs run src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx src/features/platform-administration/platform-providers/helpers/platformProviderSubmitMapper.test.ts src/features/platform-administration/platform-providers/model/platformProviderTypes.test.ts src/features/platform-administration/platform-providers/model/platformProvidersWire.test.tsx src/features/platform-administration/platform-providers/pages/PlatformProvidersPage.test.tsx --reporter=dot
node node_modules/eslint/bin/eslint.js src/features/platform-administration/platform-providers/components/PlatformProviderForm.tsx src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersModal.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx src/features/platform-administration/platform-providers/helpers/platformProviderSubmitMapper.ts src/features/platform-administration/platform-providers/helpers/platformProviderSubmitMapper.test.ts src/features/platform-administration/platform-providers/model/platformProviderForm.ts src/features/platform-administration/platform-providers/model/platformProviderTypes.ts src/features/platform-administration/platform-providers/model/platformProviderTypes.test.ts --max-warnings 0
git diff --check
```
