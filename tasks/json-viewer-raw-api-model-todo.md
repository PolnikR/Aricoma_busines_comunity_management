# Task Checklist: Raw API model in JSON viewers

## Providers

- [ ] Pridať voliteľný validovaný `rawRecord` do provider list modelu.
- [ ] Uložiť GET provider record v mapperi pred UI normalizáciou.
- [ ] Pridať `toProviderJson` s raw-first správaním a fallbackom.
- [ ] Pripojiť helper do `ProvidersCatalogueTable` JSON modalu.
- [ ] Doplniť mapper test raw `null` verzus UI fallback.
- [ ] Doplniť component test raw JSON a fallbacku.
- [ ] Spustiť focused provider testy a typecheck.
- [ ] Po úspešných testoch commitnúť provider slice.

## Platform Providers

- [ ] Pridať voliteľný validovaný `rawRecord` do platform provider list modelu.
- [ ] Uložiť GET platform provider record v mapperi.
- [ ] Zachovať odlišný POST/DELETE write-record kontrakt.
- [ ] Pridať `toPlatformProviderJson` s raw-first správaním a fallbackom.
- [ ] Pripojiť helper do `PlatformProvidersTable` JSON modalu.
- [ ] Doplniť API a component testy nullable raw hodnôt.
- [ ] Spustiť focused platform-provider testy a typecheck.
- [ ] Po úspešných testoch commitnúť platform-provider slice.

## Checkpoint: provider tables

- [ ] Overiť rovnaké pomenovanie a správanie helperov.
- [ ] Overiť, že JSON tlačidlo nespúšťa nový request.
- [ ] Skontrolovať konflikt so súbežnou provider-role prácou.
- [ ] Skontrolovať, že v commitoch nie sú nesúvisiace zmeny.

## Recovery Applications

- [ ] Pridať voliteľný `RecoveryAppRecordOutput` ako `rawRecord` list itemu.
- [ ] Uložiť validovaný API record v `mapRecoveryApplications`.
- [ ] Presunúť JSON transformáciu z table komponentu do mapper/helper vrstvy.
- [ ] Implementovať raw-first správanie a kompatibilný fallback.
- [ ] Doplniť mapper test zachovania raw záznamu.
- [ ] Doplniť component test, ktorý odlíši raw a normalizované hodnoty.
- [ ] Spustiť focused recovery-application testy a typecheck.
- [ ] Po úspešných testoch commitnúť recovery-application slice.

## Final verification

- [ ] Spustiť explicitný zoznam focused testov pre všetky dotknuté moduly a Recovery Groups regresiu.
- [ ] Spustiť `npm run typecheck`.
- [ ] Spustiť ESLint nad zmenenými TS/TSX súbormi.
- [ ] Spustiť `git diff --check`.
- [ ] Manuálne porovnať JSON so zodpovedajúcimi GET odpoveďami v Network paneli.
- [ ] Potvrdiť, že sa nezobrazujú credential secrets.
- [ ] Potvrdiť, že full test suite nebola zbytočne spustená.
- [ ] Každú prípadnú finálnu opravu po úspešných testoch samostatne commitnúť.
