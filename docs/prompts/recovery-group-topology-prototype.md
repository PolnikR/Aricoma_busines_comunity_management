# Recovery Group topology — zadanie pre browser prototyp

## Použitie existujúcich komponentov

Pri realizácii nižšie uvedeného zadania používaj existujúce shared komponenty: `WizardSteps`, `SelectableCard`, `Field`, `Input`, `Select`, `Textarea` a `Button`. Pre príslušné stavy použi existujúce `EmptyState`, `ListSkeleton` a `FetchErrorAlert`. Zachovaj ich styling; nevytváraj ich duplicitné náhrady a neupravuj shared komponenty len kvôli prototypu.

Autoritatívny rozsah prototypu je Phase 1 nižšie. Phase 2 je oddelená a vyžaduje explicitné schválenie používateľa. Payloady sú referenčné príklady; prototyp ich neodosiela na backend.

## Pôvodné zadanie

Pracuj vo FE repozitári `aricoma_busines_comunity_management`.

Cieľom je navrhnúť nový UI flow pre Recovery Group wizard s podporou:
- Local topology
- Metro Mirror topology

DÔLEŽITÉ:
Momentálne paralelne prebieha migrácia API vrstvy z ručne vytvorených TanStack Query hookov na Orval-generated hooks.

Preto:

1. najskôr NEZASAHUJ do produkčnej implementácie Recovery Group wizardu,
2. nevytváraj ani neupravuj API hooky,
3. neupravuj generated Orval súbory,
4. nevstupuj do prebiehajúcej migrácie TanStack Query hookov,
5. najskôr vytvor iba samostatný vizuálny prototype/template,
6. po vytvorení prototypu ZASTAV a počkaj na moje schválenie,
7. až keď prototyp schválim, zapracujeme ho do reálneho wizardu.

==================================================
PHASE 1 – BROWSER PROTOTYPE
==================================================

Najskôr si prečítaj existujúci Recovery Group wizard a jeho styling.

Chcem, aby prototype vizuálne čo najviac zodpovedal existujúcej aplikácii:
- rovnaký layout wizardu,
- rovnaké formulárové prvky,
- rovnaký spacing,
- rovnaké cards/panely,
- rovnaká typografia,
- rovnaký štýl sidebar krokov.

Nepotrebuje komunikovať s backendom.
Použi mock dáta.

Prototype musí byť možné jednoducho spustiť a pozrieť v browseri.

Preferujem samostatný development-only prototype, ktorý nebude ovplyvňovať produkčný Recovery Group wizard.

Môže to byť napríklad:
- samostatná prototype page/route,
alebo
- izolovaný prototype komponent,
podľa toho, čo najlepšie zapadne do existujúceho projektu.

Nevytváraj úplne nový design systém.

==================================================
NAVRHOVANÝ WIZARD FLOW
==================================================

Zachovaj približne tento flow:

1. Details
2. Topology
3. Resource type
4. Compute provider
5. Virtual machines
6. Related storage
7. Policy Set
8. Orchestration

Ak existujúci wizard používa mierne iné pomenovania, zachovaj existujúci vizuálny štýl.

==================================================
STEP 1 – DETAILS
==================================================

Zachovaj existujúce polia:

- ID
- Name
- Description

Tu nie je potrebná zásadná zmena.

==================================================
STEP 2 – TOPOLOGY
==================================================

Toto je nový krok.

Používateľ vyberá:

[ Local ]
[ Metro Mirror ]

Použi vizuálne výrazné selectable cards/radio cards podobné existujúcim wizard voľbám.

--------------------------------
LOCAL
--------------------------------

Local znamená:

Source FlashSystem A
        ↓
source volumes
        ↓
FlashCopy
        ↓
point-in-time copies na A

Používateľ vyberie:

Source FlashSystem
[ IBM FlashSystem Production ▼ ]

Tento provider sa neskôr uloží ako:

provider_id_volume

Pri Local:
- partnerProviderId sa nepoužíva,
- Target FlashSystem nezobrazuj,
- Metro Mirror mode nezobrazuj,
- consistency_group_id nezobrazuj.

--------------------------------
METRO MIRROR
--------------------------------

Metro Mirror znamená:

Source FlashSystem A
        ↓
Metro Mirror
        ↓
Auxiliary volumes na B
        ↓
FlashCopy
        ↓
point-in-time copies na B

Používateľ vyberie iba:

Source FlashSystem
[ IBM FlashSystem Production ▼ ]

Target FlashSystem sa NEVYBERÁ.

Je odvodený z:

Source.provider.partnerProviderId

V prototype použi napr.:

Source FlashSystem
IBM FlashSystem Production

Target FlashSystem
IBM FlashSystem DR
Derived from partnerProviderId

Target zobraz ako read-only information/card.

Používateľ ho nesmie meniť selectom.

Ak source nemá partnerProviderId, prototype ukáž validačný stav:

"No Metro Mirror partner configured for this FlashSystem."

==================================================
METRO MIRROR MODE
==================================================

Pri Metro Mirror zobraz:

Metro Mirror mode

[ Existing ]
[ Managed ]

Existing:
- enabled
- momentálne podporovaný

Managed:
- disabled
- badge/text napr. "Coming soon" alebo "Not supported yet"

Dôvod:
Backend schema je už pripravená na:

mode: "existing" | "managed"

ale momentálne podporuje iba `existing`.

==================================================
EXISTING MODE
==================================================

Pri Existing mode musí používateľ vedieť zadať:

Remote Copy Consistency Group ID

napr.:

Consistency Group ID
[ 1 ]

Pridaj krátky helper text:

"Existing IBM Remote Copy consistency group containing the Metro Mirror relationships used by this recovery group."

Používateľ toto ID zadáva manuálne.

Nepomiešaj ho s FlashCopy consistency group vytváranou Airflowom.

Toto je IBM Remote Copy / Metro Mirror consistency group.

==================================================
STEP 3 – RESOURCE TYPE
==================================================

Zachovaj existujúcu funkcionalitu.

Nerob redesign, pokiaľ nie je potrebný.

==================================================
STEP 4 – COMPUTE PROVIDER
==================================================

Zachovaj existujúcu funkcionalitu.

Compute provider predstavuje napr.:

VMware vCenter

a mapuje sa na:

provider_id_vm

Príklad:

VMware vCenter Production
vmware-vcenter-01

Compute provider nie je storage provider.

==================================================
STEP 5 – VIRTUAL MACHINES
==================================================

Zachovaj existujúci výber VM.

Použi mock VM napr.:

APP01
APP02
DB01

Vybrané VM následne určujú Related Storage.

==================================================
STEP 6 – RELATED STORAGE
==================================================

Related Storage vždy začína source volumes na:

provider_id_volume

teda na Source FlashSysteme.

Príklad:

VM APP02
   ↓
source FlashSystem A
   ↓
V5000_VOLUME03
V5000_VOLUME04

--------------------------------
LOCAL UI
--------------------------------

Pri Local zobraz iba source volumes:

Related volumes

V5000_VOLUME03
V5000_VOLUME04

Výsledná logika:

V5000_VOLUME03
        ↓
FlashCopy na Source FlashSysteme A

--------------------------------
METRO MIRROR / EXISTING UI
--------------------------------

Pri Metro Mirror Existing zobraz tabuľku/pairs:

Source volume                Auxiliary volume
------------------------------------------------
V5000_VOLUME03       →       [ DR_V5000_VOLUME03 ]
V5000_VOLUME04       →       [ DR_V5000_VOLUME04 ]

Source volume:
- automaticky discovered podľa VM + Source FlashSystem,
- v prototype použi mock hodnoty,
- nemá byť editovateľný text input.

Auxiliary volume:
- používateľ zadáva manuálne,
- ide o existujúci Metro Mirror volume na partner FlashSysteme,
- NIE JE to FlashCopy snapshot.

Do payloadu sa to neskôr mapuje:

{
  "name": "V5000_VOLUME03",
  "auxiliary_name": "DR_V5000_VOLUME03"
}

Pri Metro Mirror Existing musí mať každý source volume auxiliary_name.

Pridaj vhodnú validáciu:
- empty auxiliary name = incomplete
- consistency_group_id required

==================================================
STEP 7 – POLICY SET
==================================================

Zachovaj existujúci Policy Set picker.

Žiadna zásadná zmena.

==================================================
STEP 8 – ORCHESTRATION
==================================================

Zachovaj existujúci Orchestration step.

Žiadna zásadná zmena.

==================================================
SUMMARY / REVIEW
==================================================

Ak sa v existujúcom wizarde hodí summary/review, zobraz minimálne:

Topology:
Metro Mirror

Source FlashSystem:
IBM FlashSystem Production

Target FlashSystem:
IBM FlashSystem DR

Mode:
Existing

Consistency Group:
1

Compute provider:
VMware vCenter Production

VMs:
APP02

Storage:
V5000_VOLUME03 → DR_V5000_VOLUME03
V5000_VOLUME04 → DR_V5000_VOLUME04

Policy:
...

==================================================
VÝSLEDNÉ PAYLOADY – REFERENCIA
==================================================

LOCAL:

{
  "id": "app01",
  "name": "APP01",
  "provider_id_vm": "vmware-vcenter-01",
  "provider_id_volume": "ibm-flashsystem-prod",
  "topology": "local",
  "policy_set_id": "test_1_hour_ps",
  "vms": [
    {
      "name": "APP01"
    }
  ],
  "volumes": [
    {
      "name": "V5000_VOLUME03"
    }
  ]
}

METRO MIRROR EXISTING:

{
  "id": "app02-mm",
  "name": "APP02 Metro Mirror",
  "provider_id_vm": "vmware-vcenter-01",
  "provider_id_volume": "ibm-flashsystem-prod",
  "topology": "metro_mirror",
  "metro_mirror": {
    "mode": "existing",
    "consistency_group_id": "1"
  },
  "policy_set_id": "test_1_hour_ps",
  "vms": [
    {
      "name": "APP02"
    }
  ],
  "volumes": [
    {
      "name": "V5000_VOLUME03",
      "auxiliary_name": "DR_V5000_VOLUME03"
    },
    {
      "name": "V5000_VOLUME04",
      "auxiliary_name": "DR_V5000_VOLUME04"
    }
  ]
}

==================================================
DÔLEŽITÝ DOMAIN MODEL
==================================================

LOCAL:

VM
↓
source volume na A
↓
FlashCopy
↓
point-in-time copy na A


METRO MIRROR EXISTING:

VM
↓
source volume na A
↓
existujúci Metro Mirror relationship
↓
auxiliary volume na B
↓
FlashCopy
↓
point-in-time copy na B


`auxiliary_name`:
- volume na B,
- existujúca Metro Mirror replika,
- NIE snapshot.

`consistency_group_id`:
- existujúca IBM Remote Copy consistency group,
- NIE FlashCopy consistency group vytvorená Airflowom.

`partnerProviderId`:
- určuje Target FlashSystem,
- používateľ Target ručne nevyberá.

==================================================
PROTOTYPE UX
==================================================

Chcem, aby bolo na prvý pohľad jasné:

LOCAL:

Source
  ↓
FlashCopy

METRO MIRROR:

Source
  ↓
Metro Mirror
  ↓
Target
  ↓
FlashCopy

Môžeš použiť jednoduchú vizuálnu flow indikáciu, ale zachovaj enterprise vzhľad existujúcej aplikácie.

Nechcem prehnane grafický redesign.

==================================================
PO DOKONČENÍ PHASE 1
==================================================

Keď prototype dokončíš:

1. spusti ho,
2. over, že sa dá otvoriť v browseri,
3. povedz mi presnú URL/path, kde ho môžem pozrieť,
4. stručne vypíš súbory, ktoré si vytvoril alebo zmenil,
5. NEIMPLEMENTUJ ho ešte do produkčného Recovery Group wizardu,
6. ZASTAV a počkaj na moje schválenie.

==================================================
PHASE 2 – AŽ PO MOJOM SCHVÁLENÍ
==================================================

Po mojom explicitnom schválení prototypu:

- prenes UI do reálneho Recovery Group wizardu,
- zachovaj existujúci design,
- používaj aktuálne Orval-generated typy,
- nevracaj projekt späť na ručné API hooky,
- rešpektuj prebiehajúcu migráciu na Orval-generated TanStack Query hooks,
- nevytváraj duplicitné API abstraction vrstvy,
- backend nemen,
- generated súbory ručne neupravuj,
- rob malé izolované zmeny,
- zachovaj backward compatibility pre existujúce Local Recovery Groups,
- starý záznam bez topology interpretuj ako local,
- pridaj relevantné testy,
- spusti TypeScript/test/build kontroly.

Pred Phase 2 mi najskôr povedz, ktoré konkrétne produkčné súbory plánuješ zmeniť.