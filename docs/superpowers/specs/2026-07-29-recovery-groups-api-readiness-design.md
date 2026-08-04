# Recovery Groups API readiness

## Goal

Opraviť nálezy code review a nahradiť synchronné prepojenie UI na localStorage
asynchrónnou API hranicou. LocalStorage zostane dočasným backendom, ale neskorší
prechod na HTTP bude vyžadovať najmä výmenu implementácie API funkcií.

## Domain model

Recovery Group používa iba jednu z platných konfigurácií:

- `backup_system_workload` + `vmware_virtual_machines` + `vm`
- `storage_system` + `ibm_flashsystem` + `volume`

ID, názov, opis a aspoň jeden unikátny resource sú povinné. `resourceCount` a
`status` sú odvodené hodnoty. Typ existujúcej skupiny je po vytvorení nemenný.

## API boundary

`recoveryGroupsApi.ts` poskytne asynchrónne CRUD funkcie. Dočasne použijú
localStorage adaptér; neskôr sa ich vnútro vymení za `apiFetch`.

UI bude pristupovať k dátam prostredníctvom React Query hookov. Jedna query cache
bude jediným zdrojom pravdy, čím sa odstráni dvojité pridávanie záznamov.

## LocalStorage behavior

- Starý formát sa migruje na kanonický model.
- Odvodené polia sa vždy prepočítajú.
- Jednotlivé neplatné položky sa izolujú a neukryjú platné skupiny.
- Neparsovateľný JSON vyvolá explicitnú chybu.
- Storage event invaliduje query cache a synchronizuje otvorené taby.

## UI behavior

- List, create a edit stránky zobrazia loading a error stavy.
- Create/update/delete operácie budú asynchrónne a zabránia opakovanému submitu.
- Typ skupiny bude pri editácii read-only.
- FlashSystem krok nebude načítavať VMware inventory.
- Chybové kódy dátovej vrstvy sa preložia v UI.

## Testing

Testy pokryjú model, localStorage migráciu a korupciu, hook cache bez duplicít,
CRUD chyby, builder validáciu a dirty stav, nemennosť typu a podmienené načítanie
VMware inventory.

