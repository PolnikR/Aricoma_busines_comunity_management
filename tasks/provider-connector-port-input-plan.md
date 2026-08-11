# Implementačný plán: Port v provider-connectors formulári

## Cieľ

Zosúladiť formulár providera v `src/features/providers-connectors` s platform-provider formulárom: IP adresa a port budú v jednom responzívnom riadku, nový provider dostane predvolený port `22`, port sa bude validovať ako celé číslo `1–65535` a do API odošle ako `number`.

## Rozsah

- rozšíriť `ProviderCreateFormData`, `ProviderRecord` a `ProviderSubmitData` o `port`,
- zobraziť číselný port input vedľa IP adresy; na mobile polia skladať pod seba,
- zachovať uložený port pri editácii a použiť `22` iba pre nový záznam,
- validovať prázdne, desatinné a hodnoty mimo rozsahu `1–65535`,
- overiť rovnaké hranice v Zod API schéme,
- aktualizovať regresné testy a testovacie fixture dáta.

Mimo rozsahu je zmena backend endpointov, port podľa typu providera a externá runtime konfigurácia.

## Akceptačné kritériá

1. Create modal zobrazí `Port` s hodnotou `22`.
2. Edit modal zobrazí port zo serverového záznamu a neprepíše ho defaultom.
3. IP a Port sú súrodenci v `grid`; od breakpointu `sm` sú vedľa seba, na užšom viewport-e pod sebou.
4. Port input má `type="number"`, `min={1}`, `max={65535}`, `step={1}`.
5. Neplatný port sa neodošle a zobrazí validačnú chybu.
6. Platný request obsahuje `port` ako JavaScript/JSON číslo.
7. API response schema akceptuje iba celočíselný port v rozsahu `1–65535`.

## Poradie práce a verifikácia

1. Pridať failing komponentový/modal test pre default, layout a číselný payload.
2. Implementovať model, form state, UI, validáciu a API schému.
3. Doplniť port do existujúcich provider fixture dát a API/hook testov.
4. Spustiť focused testy, lint, typecheck, celý test suite a Vite build.
5. Skontrolovať path-scoped diff a commitnúť iba súbory tejto zmeny.

## Riziká a mitigácie

| Riziko | Mitigácia |
|---|---|
| Default `22` prepíše editovaný port | Oddeliť create initial state od mapovania serverového záznamu a testovať hodnotu odlišnú od `22`. |
| String z HTML inputu sa odošle ako text | Konvertovať až po úspešnej validácii cez `Number(formData.port)`. |
| Nezhodné hranice UI a API | Použiť rovnaké `1–65535` v inpute, klientovi a Zod schéme. |
| Existujúce fixture dáta rozbijú typecheck | Aktualizovať všetky provider record/submit fixture objekty o port. |

## Odhad

Približne 45–70 minút práce Codex agenta vrátane plného buildu.
