# ABCO Overview – špecifikácia dátových zdrojov a agregácie

**Dátum:** 2026-10-19
**Stav:** návrh na odsúhlasenie FE/BE kontraktu; **nie je implementovaný**
**Repozitár/vetva:** ABCO FE / `spike/ant-design-shell`
**Rozsah:** napojenie existujúceho Overview dashboardu na skutočné dáta; bez redizajnu UI a bez zmeny existujúcich API

## 1. Cieľ a aktuálny stav

Overview zobrazuje štyri horné KPI (providery, volumes so snapshotmi, Recovery Groups, Recovery Applications) a panely **Protection Overview**, **Recovery Overview**, **Infrastructure Overview** a **Deployment Coverage**.

Aktuálne `src/features/dashboard/pages/OverviewPage.tsx` číta výhradne `overallPreviewFixture` z `src/features/dashboard/mocks/overallPreviewFixtures.ts`. Hodnoty **13, 1 280/1 360, 24, 34, 16/8, 23/11, 18/23, 8/11, 20/25, 6/9** sú *ilustračné*. Nejde o overené produkčné metriky. Dátový model ukážky je v `src/features/dashboard/model/overallPreviewMetrics.ts`. Existujúci filter IBM FlashSystem/Hitachi mení iba **Protection Overview** a súvisiace volumes KPI; ostatné štatistiky sú globálne.

Cieľ: vymeniť fixture za jeden spoľahlivý zdroj agregovaných údajov, zachovať rozloženie, dnešné navigačné odkazy na skupiny a aplikácie, light/dark, lokalizáciu a viewport fit. Nemiešať *konfiguračný stav*, *pushed*, *dostupnosť providera* a *úspešnosť recovery runu*.

## 2. Overené existujúce endpointy

| Zdroj | Konkrétny kontrakt | Metriky a obmedzenia |
|---|---|---|
| `GET /get_providers?role=all` | `ProvidersResponse.providers[]`: `id`, `type`, `role`, `credentialStatus` atď.; Orval `useGetProviders` | Počty podľa infra typov `VMWARE`, `IBM_POWER`, `FLASHCOPY`, `HITACHI`. `credentialStatus` **nie je** online status ani výsledok aktuálneho Test Connection. Ostatné typy (`AIRFLOW`, `SMTP`, …) pre infra KPI nepočítať. |
| `GET /get_volume_tree?provider_id=...&view=flat` | `GetVolumeTreeParams` vyžaduje identifikáciu **IBM FlashSystem** providera; `VolumeTreeResponse` má `counts` a `views`. Volume detail v existujúcom FE parseri obsahuje `has_snapshots`, `is_snapshot_target`, `snapshot_count`, `resolved`, `role`. | Kandidát na IBM snapshot coverage. Volá sa **na konkrétneho providera**, nie raz za celý systém. `counts.volumes` je počet volumes, **nie** počet volumes so snapshotmi. Kontrakt nie je deklarovaný pre Hitachi. |
| `GET /get_recovery_groups` | `RecoveryGroupRecord[]`: `topology: 'local' \| 'metro_mirror'`, `orchestration?.pushed`, `provider_id_vm`, `provider_id_volume` | Počet skupín, rozdelenie `local` / `metro_mirror`, stav pushed. Nededukovať Metro Mirror z typu providera ani všeobecne z „remote“. |
| `GET /get_recovery_apps` | `RecoveryAppRecord[]`: `application.platform`, `application.environment` (voľný string), `orchestration?.pushed` | Počet aplikácií, VMware/IBM Power, Pushed/Not pushed, Production/Test **po schválení mapovania environment**. |

Odkazy na implementáciu: `src/generated/query/{providers,storage-volumes,recovery-groups,recovery-apps}/*.gen.ts`, `src/generated/query/zod/*.gen.ts`, `src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.ts`, `src/features/recovery-plans/recovery-applications/helpers/mapRecoveryApplications.ts`, `src/features/discovery-inventory/infrastructure/model/selectVolumeTree.ts` a `helpers/parseVolumeTreeNodes.ts`.

> **Dôležité:** samotné štyri API postačujú na počty konfigurácií a základné rozdelenia; **nepostačujú na všetky terajšie vizuálne metriky**. Všetko, čo FE z nich nevie spoľahlivo odvodiť, musí zostať „nedostupné/neznáme“, nie „0“, „OK“ ani vymyslené číslo.

## 3. Odvodenie údajov pre existujúce panely

| Sekcia / prvok | Výpočet / dáta | Stav |
|---|---|---|
| KPI Registered providers | Počet infra providerov podľa `type` (VMware, IBM Power, FlashSystem, Hitachi) | Dá sa odvodiť z `get_providers`; rozhodnúť, či zahrnúť `source` aj `target` (návrh: oba, deduplikovať podľa `id`). |
| KPI Volumes with snapshots | Počet relevantných zdrojových volumes s `has_snapshots=true` / všetky relevantné volumes; po výrobcovi | IBM je kandidát na odvodenie z volume nodes; **pred implementáciou odsúhlasiť** výber zdrojových volumes, vylúčenie snapshot targetov, `resolved=false`, deduplikáciu a správanie pri neúplných dátach. Hitachi: chýba zdroj. |
| KPI Recovery Groups | `recovery_groups.length` | Dostupné. |
| KPI Recovery Applications | `applications.length` | Dostupné. |
| Recovery Overview – groups | `topology='local'` vs `topology='metro_mirror'` (UI dnes používa Local/Remote) | Dostupné; text „Remote“ sa nesmie rozšíriť na iné technológie bez potvrdenia domény. |
| Recovery Overview – apps | `application.platform` normalizované na VMware/IBM Power | Dostupné po dohode enum/hodnôt; neznáme hodnoty evidovať zvlášť, nevynechávať potichu. |
| Deployment Coverage – VMware/Power | `orchestration?.pushed === true` v danej platforme / celkový počet aplikácií platformy | Dostupné. `false` je Not pushed; `null`/absent je **Unknown**, pokiaľ BE nedohodne inú sémantiku. |
| Deployment Coverage – Production/Test | Rovnaký `pushed` filter po normalizovanom `application.environment` | Podmienečne dostupné; `environment` má v kontrakte len `string`, treba schváliť hodnoty a pravidlá pre iné/nevyplnené prostredia. |
| Infrastructure Overview | Celkový počet providerov podľa `type`, plus dostupní/nedostupní/neznámi | Počet je dostupný; **stav dostupnosti nie**. `credentialStatus` ≠ health; bez nového zdroja neukazovať dostupnosť ako potvrdený fakt. |

**Poznámka k orchestration:** `pushed=true` je evidovaný stav odoslania DAG do orchestrátora, nie dôkaz úspešného Recovery runu ani živý health Airflow. Nie je potrebné získavať DAG run history na samotné počítanie `pushed`. Rovnaký stav existuje aj pri skupinách, ale terajší panel Deployment Coverage zobrazuje aplikácie; zmenu jeho účelu riešiť samostatne.

## 4. Dve nepokryté oblasti – rozhodnutia BE

### 4.1 Hitachi snapshot coverage

`get_volume_tree` má deklarované IBM FlashSystem provider ID a payload `provider_type` pre FlashSystem; nepovažovať ho za generický Hitachi inventár. BE musí určiť zdroj Hitachi volumes/snapshotov (existujúce Hitachi API, CCI inventár alebo nové agregované metriky) a **zjednotiť definíciu** „volume so snapshotmi“ pre oba systémy. Kým zdroj nie je hotový, Hitachi coverage aj globálny súčet označiť ako neúplné/neznáme, nie použiť demo 460/40.

### 4.2 Provider availability

`get_providers` neobsahuje spoľahlivý posledný úspešný výsledok Test Connection vrátane času merania. Ak má Dashboard zobrazovať **Available/Attention**, BE potrebuje read-only stav (napr. perzistovaný/cachovaný výsledok testu alebo health agregáciu) s `checked_at`, stavom `available|unavailable|unknown` a pravidlom zastarávania. Dashboard **nemá** pri každom otvorení spustiť `test_provider` pre všetky providery. Bez platného statusu zobrazovať Unknown a nie zelené „Available“.

## 5. Odporúčaný nový endpoint (návrh, dnes neexistuje)

**`GET /dashboard/summary`** – jeden ľahký read-only endpoint pripravený backendom, autentifikovaný ako ostatné ABCO API. FE nepotrebuje prenášať celé volume tree ani všetky konfigurácie iba kvôli štyrom agregátom. BE môže použiť existujúce services/cache a paralelne agregovať per-provider výsledky s obmedzením súbežnosti.

Nasledujúca podoba je **návrh dátového kontraktu**, nie existujúca OpenAPI definícia:

```ts
interface DashboardSummary {
  generated_at: string; // ISO 8601 UTC – čas vytvorenia agregátu, nie čas zdrojového merania

  providers: {
    total: number; // iba VMWARE, IBM_POWER, FLASHCOPY, HITACHI
    by_type: Record<'VMWARE' | 'IBM_POWER' | 'FLASHCOPY' | 'HITACHI', {
      total: number;
      available: number | null; // null = nemožno hodnoverne zistiť
      unavailable: number | null;
      unknown: number;
    }>;
  };

  protection: {
    by_vendor: {
      ibm: Coverage;
      hitachi: Coverage;
    };
  };

  recovery_groups: {
    total: number;
    local: number;
    metro_mirror: number;
    pushed: number;
    not_pushed: number;
    unknown_push: number;
  };

  recovery_applications: {
    total: number;
    by_platform: Record<'vmware' | 'ibm_power', PushDistribution>;
    by_environment: Record<'production' | 'test', PushDistribution>;
    other_platform: number;
    other_environment: number;
  };
}

interface Coverage {
  status: 'ready' | 'partial' | 'unavailable';
  with_snapshots: number | null;
  without_snapshots: number | null;
  total: number | null;
  observed_at: string | null; // čas/skutočná čerstvosť inventára, ak známy
}

interface PushDistribution {
  total: number;
  pushed: number;
  not_pushed: number;
  unknown_push: number;
}
```

**Sémantika kontraktu:**
- `null` znamená, že hodnotu nemožno spoľahlivo zistiť; `0` znamená skutočnú nulu. Nenahrádzať chybu dotazu nulou.
- `pushed` počíta iba explicitné `true`; absent/`null` sa nepočíta ako `false` bez dohody s BE. `pushed + not_pushed + unknown_push = total`.
- `coverage.with_snapshots + coverage.without_snapshots = coverage.total` platí len pri `status='ready'` a úplných číslach.
- `providers.available/unavailable` nevyvodzovať z `credentialStatus`; neznámy zdravotný stav zachovať.
- `other_platform` a `other_environment` zabránia tichému strate záznamov s nepodporovanými hodnotami. Normalizácia hodnôt musí byť explicitná.
- Pri čiastočnom výpadku zdroja má BE vrátiť dostupné sekcie a označiť chýbajúce či stale údaje; konkrétnu podobu `source_errors`/sekčných statusov doplniť do BE kontraktu ešte pred implementáciou.
- Pri potrebe cache uviesť TTL/freshness osobitne pre provider inventory, volume inventory a orchestrator metadata; `force_refresh=true` nie je vhodná predvolená dashboard politika.
- Podporovať rovnaké oprávnenia/izoláciu dát ako pôvodné endpointy; do summary neposielať credentials, tajomstvá, surové VM/volume stromy ani DAG definície.

### FE integrácia po odsúhlasení

1. BE publikuje OpenAPI schému pre `GET /dashboard/summary`; FE vygeneruje Orval hook (needitovať generované súbory ručne).
2. `OverviewPage` nahradí `overallPreviewFixture` query/mapping vrstvou; demo fixture zostane iba pre prototypy a testy.
3. Filter **All / IBM FlashSystem / Hitachi VSP** lokálne vyberie agregované `protection.by_vendor`; ostatné karty/panely sú nezávislé od filtra.
4. Loading, partial a error stavy nesmú zobrazovať simulované čísla ako reálne. Pre chýbajúce dáta zobraziť „Nedostupné“/„Neznáme“ alebo explicitný stav nedostupnej sekcie.
5. Zachovať dnešné nav odkazy, jazykové varianty, light/dark a fit. Prefetch Resource stránky je oddelená záležitosť; nezvyšovať počet zbytočných dashboard volaní.

## 6. Otvorené rozhodnutia pred BE implementáciou

1. Presný zdroj a ekvivalentná definícia snapshot coverage na **Hitachi**; zdrojové vs snapshot-target volumes, deduplikácia naprieč poskytovateľmi.
2. Dostupnosť providerov: odkiaľ bude stav Test Connection/health, kedy exspiruje a či „Attention“ má zahŕňať `unknown`.
3. Mapovanie `application.environment` na Production/Test a `application.platform` na VMware/Power; zaobchádzanie s inými hodnotami.
4. Rozsah počtu providerov: `source + target`, deduplikácia podľa ID, bez servisných providerov.
5. Ako vracať čiastočné chyby, unknown push, `observed_at` a fallback pri nedostupnom storage.
6. Či backend už má vhodnú agregovanú/cachovanú metódu; ak áno, **uprednostniť jej znovupoužitie** pred zavedením ďalšej vrstvy.

## 7. Akceptácia

- Skutočné štatistiky vznikajú z dostupných zdrojov podľa vyššie uvedených pravidiel, bez počítania z demo fixture.
- Preukázaný výpočet Local/Metro Mirror, VMware/Power, pushed/unknown a kategórií providerov vrátane nulových a neznámych prípadov.
- Testy pre `provider_id` per FlashSystem, viac providerov, výpadok jedného z nich a chýbajúci Hitachi zdroj (bez zavádzajúceho súčtu).
- Status Available/Attention sa nezobrazuje ako meraný fakt bez status zdroja a timestampu.
- FE využíva agregované dáta bez série ťažkých volume-tree requestov pri každom zobrazení; formálne uzavretý BE kontrakt a regresné testy.
- Žiadne zmeny layoutu dashboardu ani existujúcich API endpointov len kvôli tejto špecifikácii.

**Táto špecifikácia je podklad pre spoločné FE/BE rozhodnutie; neznamená schválenie nového endpointu ani hotovú implementáciu.**
