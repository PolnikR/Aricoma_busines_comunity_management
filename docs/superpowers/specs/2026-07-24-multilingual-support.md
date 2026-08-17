# Multilingual Support Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multilingual support (English, Slovak, Czech) to the app with a language switcher in the header user menu, auto-detect browser language, and persist user's language choice.

**Architecture:** Translation JSON files in `src/locales/` provide all UI strings. A React Context (`LanguageContext`) manages the current language state. A custom `useTranslation` hook provides access to translations throughout the app. On app startup, the language is auto-detected from the browser, but users can override it via a dropdown menu in the header. Their choice persists to localStorage.

**Tech Stack:** React 19, TypeScript, React Router, localStorage API, no external i18n library.

---

## Global Constraints

- Three languages: English (en), Slovak (sk), Czech (cs)
- Language files: `src/locales/{en,sk,cs}.json` with flat key-value structure
- Browser language detection: use `navigator.language` on first app load
- Persistence: localStorage key `app-language`, stores language code (en/sk/cs)
- Header user dropdown: convert existing user badge to clickable dropdown; add language options (ENG, SVK, CZ) and Settings + Logout buttons
- No logout functionality yet — button exists but has no onClick handler
- All existing UI strings must be extractable into translation keys (done incrementally as tasks add translation keys to the files)

---

## File Structure Overview

**New files:**
- `src/locales/en.json` — English translations (flat object)
- `src/locales/sk.json` — Slovak translations
- `src/locales/cs.json` — Czech translations
- `src/contexts/LanguageContext.tsx` — Language context + provider component
- `src/hooks/useTranslation.ts` — Hook to access translations and current language
- `src/app/header/UserMenu.tsx` — New dropdown menu component (extracted from existing badge)

**Modified files:**
- `src/main.tsx` — wrap app in LanguageProvider
- `src/app/header/Header.tsx` (or wherever the user badge is) — replace badge with UserMenu component

---

## Task 1: Create Translation Files

**Description:** Create comprehensive JSON translation files for English, Slovak, and Czech with all UI strings from the app. These files serve as the single source of truth for all visible text.

**Files:**
- Create: `src/locales/en.json`
- Create: `src/locales/sk.json`
- Create: `src/locales/cs.json`

**Interfaces:**
- Produces: Translation object shape `{ [key: string]: string }` (flat structure with dot-notation keys)
- Keys organized by module: nav.*, pages.*, tables.*, buttons.*, forms.*, errors.*, empty.*, modals.*, status.*, validation.*, common.*

**Steps:**

- [ ] **Step 1: Create English translations file**

Create `src/locales/en.json` with complete content:
```json
{
  "language.en": "English",
  "language.sk": "Slovak",
  "language.cs": "Czech",
  
  "header.language": "Language",
  "header.userMenu.settings": "Settings",
  "header.userMenu.logout": "Logout",
  "header.search": "Search or type a command...",
  "header.searchHint": "Ctrl K",
  "header.appName": "Aricoma",
  "header.tagline": "Business continuity management",
  "header.sidebarTagline": "Business continuity",
  "header.userRole": "ABCO operator",
  "header.userRoleType": "Administrator",
  "header.toggleSidebar": "Toggle sidebar",
  "header.appHome": "Aricoma home",
  
  "nav.administration": "Platform Administration",
  "nav.administration.overview": "Overview",
  "nav.administration.configuration": "Configuration",
  "nav.administration.identity": "Identity & Access",
  "nav.administration.secrets": "Secrets",
  "nav.administration.certificates": "Certificates",
  "nav.administration.diagnostics": "Diagnostics",
  "nav.administration.audit": "Audit & Retention",
  "nav.providers": "Providers & Connectors",
  "nav.providers.providers": "Providers",
  "nav.providers.connections": "Connection Profiles",
  "nav.providers.credentials": "Credentials",
  "nav.providers.capability": "Capability Matrix",
  "nav.providers.discovery": "Discovery Settings",
  "nav.providers.health": "Health & Diagnostics",
  "nav.discovery": "Discovery & Inventory",
  "nav.discovery.vms": "Virtual Machines",
  "nav.discovery.infrastructure": "Infrastructure Topology",
  "nav.discovery.jobs": "Discovery Jobs",
  "nav.discovery.search": "Inventory Search",
  "nav.discovery.import": "File Import",
  "nav.discovery.validation": "Validation & Commit",
  "nav.discovery.snapshots": "Snapshots & History",
  "nav.discovery.agents": "Discovery Agents",
  "nav.storage": "Storage Orchestration",
  "nav.vmware": "VMware Orchestration",
  "nav.ibm": "IBM PowerVM Orchestration",
  "nav.recovery": "Recovery Plans",
  "nav.recovery.applications": "Recovery Applications",
  "nav.recovery.runs": "Recovery Runs",
  "nav.execution": "Execution Engine",
  "nav.monitoring": "Monitoring & Audit",
  "nav.apis": "Internal Component APIs",
  "nav.menu": "Menu",
  
  "pages.virtualMachines.title": "Virtual machines",
  "pages.virtualMachines.description": "VMware inventory, health and placement overview.",
  "pages.virtualMachines.eyebrow": "Discovery & Inventory",
  "pages.virtualMachines.error.title": "Virtual machines could not be loaded",
  "pages.virtualMachines.error.unknown": "Unknown discovery error.",
  "pages.virtualMachines.error.retryButton": "Retry loading",
  "pages.virtualMachines.error.latestFailed": "Latest request failed",
  "pages.virtualMachines.error.showingPrevious": "Showing the previous successful page.",
  "pages.virtualMachines.empty.title": "No virtual machines found",
  "pages.virtualMachines.empty.description": "No inventory records match the current search and filters.",
  "pages.virtualMachines.empty.clearFilters": "Clear filters",
  
  "pages.infrastructure.title": "Infrastructure",
  "pages.infrastructure.description": "Explore discovered cluster, host, virtual machine, and datastore relationships.",
  "pages.infrastructure.eyebrow": "Discovery & Inventory",
  "pages.infrastructure.error.title": "Infrastructure topology could not be loaded",
  "pages.infrastructure.error.retryButton": "Retry loading",
  "pages.infrastructure.error.latestFailed": "Latest request failed",
  "pages.infrastructure.error.showingPrevious": "Showing the previous successful topology.",
  "pages.infrastructure.empty.title": "No infrastructure discovered",
  "pages.infrastructure.empty.description": "The discovery response does not contain infrastructure records.",
  "pages.infrastructure.empty.refreshButton": "Refresh inventory",
  "pages.infrastructure.empty.refreshing": "Refreshing",
  
  "pages.providers.title": "Providers",
  "pages.providers.description": "Registered providers discovered from the backend.",
  "pages.providers.eyebrow": "Providers & Connectors",
  "pages.providers.addButton": "Add Provider",
  
  "pages.recovery.title": "Recovery Applications",
  "pages.recovery.description": "Manage disaster recovery application definitions and test recovery workflows.",
  "pages.recovery.eyebrow": "Recovery Plans",
  "pages.recovery.createButton": "Create Application",
  "pages.recovery.loading": "Loading recovery applications...",
  "pages.recovery.error.title": "Recovery applications could not be loaded",
  "pages.recovery.error.unknown": "Unknown error",
  "pages.recovery.error.retryButton": "Retry loading",
  "pages.recovery.empty.title": "No recovery applications defined yet",
  "pages.recovery.empty.description": "Create your first recovery application to start managing disaster recovery workflows.",
  "pages.recovery.empty.createButton": "Create Your First Application",
  
  "pages.recoveryBuilder.title": "Create Recovery Application",
  "pages.recoveryBuilder.description": "Define a new disaster recovery application with tiered VM organization",
  "pages.recoveryBuilder.eyebrow": "Recovery Plans",
  "pages.recoveryBuilder.backButton": "Back",
  
  "pages.recoveryEditor.title": "Edit Recovery Application",
  "pages.recoveryEditor.description": "Modify disaster recovery application configuration",
  "pages.recoveryEditor.eyebrow": "Recovery Plans",
  "pages.recoveryEditor.backButton": "Back",
  "pages.recoveryEditor.error.notFound": "Application ID not found",
  "pages.recoveryEditor.error.loading": "Loading application...",
  "pages.recoveryEditor.error.failed": "Failed to load application.",
  
  "pages.recoveryRuns.title": "Recovery Runs",
  "pages.recoveryRuns.description": "Execution history and status of recovery runs.",
  
  "metrics.discoveredVMs": "Discovered VMs",
  "metrics.discoveredVMs.helper": "Validated inventory",
  "metrics.poweredOn": "Powered on",
  "metrics.clusters": "Clusters",
  "metrics.clusters.helper": "Active placements",
  "metrics.memory": "Allocated memory",
  "metrics.memory.helper": "total vCPU",
  
  "tables.vm.name": "Virtual machine",
  "tables.vm.os": "Operating system",
  "tables.vm.placement": "Placement",
  "tables.vm.provider": "Provider",
  "tables.vm.tags": "Tags",
  "tables.vm.compute": "Compute",
  "tables.vm.connection": "Connection",
  "tables.vm.power": "Power",
  "tables.vm.snapshots": "Snapshots",
  "tables.vm.powerOn": "On",
  "tables.vm.powerOff": "Off",
  "tables.vm.connected": "Connected",
  "tables.vm.unknown": "Unknown",
  
  "tables.provider.name": "Provider",
  "tables.provider.description": "Description",
  "tables.provider.type": "Type",
  "tables.provider.ip": "IP address",
  
  "tables.recovery.application": "Application",
  "tables.recovery.environment": "Environment",
  "tables.recovery.platform": "Platform",
  "tables.recovery.tiers": "Tiers",
  "tables.recovery.status": "Status",
  "tables.recovery.submission": "Submission",
  "tables.recovery.json": "JSON",
  "tables.recovery.viewJson": "View",
  "tables.recovery.active": "Active",
  "tables.recovery.draft": "Draft",
  "tables.recovery.vmware": "VMware",
  "tables.recovery.ibm": "IBM PowerVM",
  
  "toolbar.vmSearch": "Search virtual machines",
  "toolbar.vmSearchPlaceholder": "Search name, hostname or IP",
  "toolbar.infrastructureSearch": "Search infrastructure topology",
  "toolbar.infrastructureSearchPlaceholder": "Search VM, host, cluster or datastore",
  "toolbar.providerSearch": "Search by provider name",
  "toolbar.applicationSearch": "Search by application name",
  "toolbar.filtersButton": "Filters",
  "toolbar.filterDialogTitle": "Filter Virtual Machines",
  "toolbar.connection": "Connection",
  "toolbar.allConnections": "All connections",
  "toolbar.cluster": "Cluster",
  "toolbar.allClusters": "All clusters",
  "toolbar.provider": "Provider",
  "toolbar.allProviders": "All providers",
  "toolbar.tag": "Tag",
  "toolbar.allTags": "All tags",
  "toolbar.untaggedOnly": "Show only VMs without tags",
  "toolbar.cancelButton": "Cancel",
  "toolbar.clearButton": "Clear all",
  "toolbar.applyButton": "Apply",
  "toolbar.infrastructureHosts": "All hosts",
  "toolbar.powerFilter": "Power state filter",
  "toolbar.powerFilterAll": "All",
  "toolbar.powerFilterOn": "Powered on",
  "toolbar.powerFilterOff": "Powered off",
  "toolbar.datastoresCheckbox": "Datastores",
  "toolbar.autoLayoutButton": "Auto layout",
  "toolbar.autoLayoutLoading": "Layouting",
  "toolbar.resetPositions": "Reset positions",
  "toolbar.fitView": "Fit view",
  "toolbar.refreshButton": "Refresh",
  "toolbar.refreshLoading": "Updating",
  
  "buttons.cancel": "Cancel",
  "buttons.delete": "Delete",
  "buttons.edit": "Edit",
  "buttons.save": "Save",
  "buttons.saveApplication": "Save Application",
  "buttons.createApplication": "Create application",
  "buttons.editApplication": "Edit provider",
  "buttons.creating": "Creating…",
  "buttons.saving": "Saving…",
  "buttons.deleting": "Deleting...",
  "buttons.confirm": "Confirm",
  "buttons.close": "Close",
  "buttons.retry": "Retry",
  "buttons.retrying": "Retrying",
  
  "forms.id": "ID",
  "forms.idExample": "e.g., vmware-vcenter-01",
  "forms.idRequired": "ID is required",
  "forms.name": "Provider name",
  "forms.nameRequired": "Provider name is required",
  "forms.nameExample": "e.g., Production vCenter",
  "forms.description": "Description",
  "forms.descriptionRequired": "Description is required",
  "forms.descriptionExample": "Brief description of the provider",
  "forms.type": "Type",
  "forms.typeRequired": "Type is required",
  "forms.typeSelect": "Select a type",
  "forms.ip": "IP address",
  "forms.ipRequired": "IP address is required",
  "forms.ipExample": "e.g., 10.99.99.40",
  "forms.credentials": "Credentials",
  "forms.credentialsSelect": "Select credentials",
  "forms.applicationName": "Application Name *",
  "forms.applicationNameExample": "e.g., SampleAppRecovery2",
  "forms.applicationDescription": "Description *",
  "forms.applicationDescriptionExample": "e.g., Recovery of FinanceTBApp2",
  "forms.environment": "Environment *",
  "forms.environmentDev": "dev",
  "forms.environmentStaging": "staging",
  "forms.environmentProd": "prod",
  "forms.tierId": "ID",
  "forms.tierIdExample": "tier_id",
  "forms.tierIdError": "ID already in use or invalid",
  "forms.tierName": "Name",
  "forms.tierNameRequired": "Name is required",
  "forms.tierNameExample": "Tier name",
  "forms.tierNameLabel": "Name *",
  "forms.tierDescription": "Description",
  "forms.tierDescriptionExample": "Optional description",
  "forms.tierOrder": "Order: {order}",
  "forms.vmDragPlaceholder": "Drag VMs here",
  "forms.removeVm": "Remove VM",
  "forms.editTier": "Edit",
  "forms.deleteTier": "Delete",
  "forms.cannotDeleteLastTier": "Cannot delete the last tier",
  "forms.deleteThisTier": "Delete this tier",
  
  "details.os": "Operating system",
  "details.cluster": "Cluster",
  "details.datastore": "Datastore",
  "details.folder": "Folder",
  "details.vmPath": "VM Path",
  "details.vcpu": "vCPU",
  "details.memory": "Memory",
  "details.tags": "Tags",
  "details.label": "Label",
  "details.capacity": "Capacity",
  "details.file": "File",
  "details.thinProv": "Thin Prov.",
  "details.diskUnit": "GB",
  "details.thinProvYes": "Yes",
  "details.thinProvNo": "No",
  "details.noDiskAvailable": "No disks available",
  "details.loadingSnapshots": "Loading snapshots...",
  "details.sourceMappings": "source mappings",
  "details.targetMappings": "target mappings",
  "details.snapshotSource": "Source",
  "details.snapshotTarget": "Target",
  "details.snapshotStatus": "Status",
  "details.snapshotProgress": "Progress",
  "details.snapshotCreated": "Created",
  "details.snapshotProgressUnit": "%",
  "details.noSnapshotData": "No snapshot data available",
  
  "dialogs.deleteProvider": "Delete provider",
  "dialogs.deleteProviderMessage": "Are you sure you want to delete {name}? This action cannot be undone.",
  "dialogs.deleteApplication": "Delete Application",
  "dialogs.deleteApplicationMessage": "Are you sure you want to delete {itemName}? This action cannot be undone.",
  "dialogs.applicationJson": "Application JSON",
  
  "drawer.selectedVm": "Selected virtual machine",
  "drawer.selectedProvider": "Selected provider",
  "drawer.selectedApplication": "Recovery Application",
  "drawer.vmDetail": "Virtual machine detail",
  "drawer.providerDetail": "Provider detail",
  "drawer.applicationDetail": "Application detail",
  "drawer.closeVm": "Close detail",
  "drawer.closeProvider": "Close provider",
  "drawer.closeApplication": "Close application",
  "drawer.tabs.overview": "Overview",
  "drawer.tabs.disks": "Disks",
  "drawer.tabs.snapshots": "Snapshots",
  
  "pagination.showing": "Showing {start}-{end} of {total}",
  "pagination.rows": "Rows",
  "pagination.rowsPerPage": "Rows per page",
  "pagination.previousPage": "Previous page",
  "pagination.nextPage": "Next page",
  "pagination.pageOf": "Page {page} of {pageCount}",
  "pagination.page": "Page {number}",
  "pagination.ellipsis": "...",
  "pagination.option10": "10",
  "pagination.option25": "25",
  "pagination.option50": "50",
  
  "legend.cluster": "Cluster",
  "legend.host": "Host",
  "legend.vm": "Virtual machine",
  "legend.datastore": "Datastore",
  "legend.datastoreRelation": "Datastore relation",
  "legend.statistics": "nodes / relations",
  "legend.ariaLabel": "Topology legend",
  
  "alerts.pleaseEnterName": "Please enter an application name",
  "alerts.pleaseEnterDescription": "Please enter a description",
  
  "errors.failed": "Failed to {action}",
  "errors.failedWithDetail": "Failed to {action}: {detail}",
  "errors.loadFailed": "Failed to load",
  "errors.unknown": "Unknown error occurred",
  
  "status.updating": "Updating",
  "status.working": "Working…",
  "status.loading": "Loading module",
  
  "density.comfortable": "comfortable",
  "density.compact": "compact",
  "density.rowDensity": "Row density",
  
  "common.search": "Search",
  "common.filters": "Filters",
  "common.refresh": "Refresh",
  "common.loading": "Loading...",
  "common.error": "Error",
  "common.noResults": "No results found",
  "common.settings": "Settings",
  "common.logout": "Logout"
}
```

- [ ] **Step 2: Create Slovak translations file**

Create `src/locales/sk.json`:
```json
{
  "language.en": "Angličtina",
  "language.sk": "Slovenčina",
  "language.cs": "Čeština",
  
  "header.language": "Jazyk",
  "header.userMenu.settings": "Nastavenia",
  "header.userMenu.logout": "Odhlásiť",
  "header.search": "Hľadaj alebo zadaj príkaz...",
  "header.searchHint": "Ctrl K",
  "header.appName": "Aricoma",
  "header.tagline": "Správa kontinuity podnikania",
  "header.sidebarTagline": "Kontinuita podnikania",
  "header.userRole": "Operátor ABCO",
  "header.userRoleType": "Správca",
  "header.toggleSidebar": "Prepnúť postranný panel",
  "header.appHome": "Domov Aricomy",
  
  "nav.administration": "Administrácia platformy",
  "nav.administration.overview": "Prehľad",
  "nav.administration.configuration": "Konfigurácia",
  "nav.administration.identity": "Identita a prístup",
  "nav.administration.secrets": "Tajomstvá",
  "nav.administration.certificates": "Certifikáty",
  "nav.administration.diagnostics": "Diagnostika",
  "nav.administration.audit": "Audit a uchovávanie",
  "nav.providers": "Poskytovatelia a konektory",
  "nav.providers.providers": "Poskytovatelia",
  "nav.providers.connections": "Profily pripojenia",
  "nav.providers.credentials": "Poverenia",
  "nav.providers.capability": "Matica schopností",
  "nav.providers.discovery": "Nastavenia objavovania",
  "nav.providers.health": "Zdravie a diagnostika",
  "nav.discovery": "Objavovanie a inventár",
  "nav.discovery.vms": "Virtuálne stroje",
  "nav.discovery.infrastructure": "Topológia infraštruktúry",
  "nav.discovery.jobs": "Úlohy objavovania",
  "nav.discovery.search": "Vyhľadávanie inventára",
  "nav.discovery.import": "Import súborov",
  "nav.discovery.validation": "Validácia a potvrdenie",
  "nav.discovery.snapshots": "Snímky a história",
  "nav.discovery.agents": "Agenti objavovania",
  "nav.storage": "Orchester úložiska",
  "nav.vmware": "Orchester VMware",
  "nav.ibm": "Orchester IBM PowerVM",
  "nav.recovery": "Plány obnovy",
  "nav.recovery.applications": "Aplikácie obnovy",
  "nav.recovery.runs": "Spustenia obnovy",
  "nav.execution": "Výkonný stroj",
  "nav.monitoring": "Monitoring a audit",
  "nav.apis": "Vnútorné API komponentov",
  "nav.menu": "Menu",
  
  "pages.virtualMachines.title": "Virtuálne stroje",
  "pages.virtualMachines.description": "Prehľad inventára, zdravia a umiestnenia VMware.",
  "pages.virtualMachines.eyebrow": "Objavovanie a inventár",
  "pages.virtualMachines.error.title": "Virtuálne stroje sa nepodarilo načítať",
  "pages.virtualMachines.error.unknown": "Neznáma chyba objavovania.",
  "pages.virtualMachines.error.retryButton": "Skúsiť znova",
  "pages.virtualMachines.error.latestFailed": "Posledný požiadavok zlyhal",
  "pages.virtualMachines.error.showingPrevious": "Zobrazujem predchádzajúcu úspešnú stránku.",
  "pages.virtualMachines.empty.title": "Nenašli sa virtuálne stroje",
  "pages.virtualMachines.empty.description": "Žiadne záznamy inventára nezodpovedajú aktuálnemu vyhľadávaniu a filtrom.",
  "pages.virtualMachines.empty.clearFilters": "Vyčistiť filtre",
  
  "pages.infrastructure.title": "Infraštruktúra",
  "pages.infrastructure.description": "Preskúmajte vzťahy medzi objavenými klastermi, hostiteľmi, virtuálnymi strojmi a úložiskami.",
  "pages.infrastructure.eyebrow": "Objavovanie a inventár",
  "pages.infrastructure.error.title": "Topológiu infraštruktúry sa nepodarilo načítať",
  "pages.infrastructure.error.retryButton": "Skúsiť znova",
  "pages.infrastructure.error.latestFailed": "Posledný požiadavok zlyhal",
  "pages.infrastructure.error.showingPrevious": "Zobrazujem predchádzajúcu úspešnú topológiu.",
  "pages.infrastructure.empty.title": "Nebola objavená žiadna infraštruktúra",
  "pages.infrastructure.empty.description": "Odpoveď objavovania neobsahuje záznamy infraštruktúry.",
  "pages.infrastructure.empty.refreshButton": "Obnoviť inventár",
  "pages.infrastructure.empty.refreshing": "Obnovujem",
  
  "pages.providers.title": "Poskytovatelia",
  "pages.providers.description": "Registrovaní poskytovatelia objavení z backendov.",
  "pages.providers.eyebrow": "Poskytovatelia a konektory",
  "pages.providers.addButton": "Pridať poskytovateľa",
  
  "pages.recovery.title": "Aplikácie obnovy",
  "pages.recovery.description": "Spravujte definície aplikácií na obnovu po havárii a testujte pracovné postupy obnovy.",
  "pages.recovery.eyebrow": "Plány obnovy",
  "pages.recovery.createButton": "Vytvoriť aplikáciu",
  "pages.recovery.loading": "Načítavam aplikácie obnovy...",
  "pages.recovery.error.title": "Aplikácie obnovy sa nepodarilo načítať",
  "pages.recovery.error.unknown": "Neznáma chyba",
  "pages.recovery.error.retryButton": "Skúsiť znova",
  "pages.recovery.empty.title": "Zatiaľ nie sú definované žiadne aplikácie obnovy",
  "pages.recovery.empty.description": "Vytvorte svoju prvú aplikáciu obnovy, aby ste mohli spravovať pracovné postupy obnovy po havárii.",
  "pages.recovery.empty.createButton": "Vytvoriť prvú aplikáciu",
  
  "pages.recoveryBuilder.title": "Vytvoriť aplikáciu obnovy",
  "pages.recoveryBuilder.description": "Definujte novú aplikáciu obnovy po havárii s organizáciou virtuálnych strojov podľa úrovní",
  "pages.recoveryBuilder.eyebrow": "Plány obnovy",
  "pages.recoveryBuilder.backButton": "Späť",
  
  "pages.recoveryEditor.title": "Upraviť aplikáciu obnovy",
  "pages.recoveryEditor.description": "Upravte konfiguráciu aplikácie obnovy po havárii",
  "pages.recoveryEditor.eyebrow": "Plány obnovy",
  "pages.recoveryEditor.backButton": "Späť",
  "pages.recoveryEditor.error.notFound": "ID aplikácie sa nenašlo",
  "pages.recoveryEditor.error.loading": "Načítavam aplikáciu...",
  "pages.recoveryEditor.error.failed": "Aplikáciu sa nepodarilo načítať.",
  
  "pages.recoveryRuns.title": "Spustenia obnovy",
  "pages.recoveryRuns.description": "História a stav spustení obnovy.",
  
  "metrics.discoveredVMs": "Objavené virtuálne stroje",
  "metrics.discoveredVMs.helper": "Validovaný inventár",
  "metrics.poweredOn": "Zapnuté",
  "metrics.clusters": "Klastery",
  "metrics.clusters.helper": "Aktívne umiestnenia",
  "metrics.memory": "Pridelená pamäť",
  "metrics.memory.helper": "celkový vCPU",
  
  "tables.vm.name": "Virtuálny stroj",
  "tables.vm.os": "Operačný systém",
  "tables.vm.placement": "Umiestnenie",
  "tables.vm.provider": "Poskytovateľ",
  "tables.vm.tags": "Značky",
  "tables.vm.compute": "Výpočty",
  "tables.vm.connection": "Pripojenie",
  "tables.vm.power": "Napájanie",
  "tables.vm.snapshots": "Snímky",
  "tables.vm.powerOn": "Zapnúť",
  "tables.vm.powerOff": "Vypnúť",
  "tables.vm.connected": "Pripojené",
  "tables.vm.unknown": "Neznámy",
  
  "tables.provider.name": "Poskytovateľ",
  "tables.provider.description": "Popis",
  "tables.provider.type": "Typ",
  "tables.provider.ip": "IP adresa",
  
  "tables.recovery.application": "Aplikácia",
  "tables.recovery.environment": "Prostredie",
  "tables.recovery.platform": "Platforma",
  "tables.recovery.tiers": "Úrovne",
  "tables.recovery.status": "Stav",
  "tables.recovery.submission": "Odoslanie",
  "tables.recovery.json": "JSON",
  "tables.recovery.viewJson": "Zobraziť",
  "tables.recovery.active": "Aktívny",
  "tables.recovery.draft": "Návrh",
  "tables.recovery.vmware": "VMware",
  "tables.recovery.ibm": "IBM PowerVM",
  
  "toolbar.vmSearch": "Hľadať virtuálne stroje",
  "toolbar.vmSearchPlaceholder": "Hľadať meno, názov hostitele alebo IP",
  "toolbar.infrastructureSearch": "Hľadať v topológii infraštruktúry",
  "toolbar.infrastructureSearchPlaceholder": "Hľadať virtuálny stroj, hostitele, klaster alebo úložisko",
  "toolbar.providerSearch": "Hľadať podľa mena poskytovateľa",
  "toolbar.applicationSearch": "Hľadať podľa mena aplikácie",
  "toolbar.filtersButton": "Filtre",
  "toolbar.filterDialogTitle": "Filtrovať virtuálne stroje",
  "toolbar.connection": "Pripojenie",
  "toolbar.allConnections": "Všetky pripojenia",
  "toolbar.cluster": "Klaster",
  "toolbar.allClusters": "Všetky klastery",
  "toolbar.provider": "Poskytovateľ",
  "toolbar.allProviders": "Všetci poskytovatelia",
  "toolbar.tag": "Značka",
  "toolbar.allTags": "Všetky značky",
  "toolbar.untaggedOnly": "Zobraziť iba virtuálne stroje bez značiek",
  "toolbar.cancelButton": "Zrušiť",
  "toolbar.clearButton": "Vyčistiť všetko",
  "toolbar.applyButton": "Použiť",
  "toolbar.infrastructureHosts": "Všetci hostiteľ",
  "toolbar.powerFilter": "Filter stavu napájania",
  "toolbar.powerFilterAll": "Všetci",
  "toolbar.powerFilterOn": "Zapnuté",
  "toolbar.powerFilterOff": "Vypnuté",
  "toolbar.datastoresCheckbox": "Úložiská",
  "toolbar.autoLayoutButton": "Automatické rozloženie",
  "toolbar.autoLayoutLoading": "Rozloženie",
  "toolbar.resetPositions": "Obnoviť polohy",
  "toolbar.fitView": "Prispôsobiť pohľad",
  "toolbar.refreshButton": "Obnoviť",
  "toolbar.refreshLoading": "Obnovujem",
  
  "buttons.cancel": "Zrušiť",
  "buttons.delete": "Odstrániť",
  "buttons.edit": "Upraviť",
  "buttons.save": "Uložiť",
  "buttons.saveApplication": "Uložiť aplikáciu",
  "buttons.createApplication": "Vytvoriť aplikáciu",
  "buttons.editApplication": "Upraviť poskytovateľa",
  "buttons.creating": "Vytváram…",
  "buttons.saving": "Ukladám…",
  "buttons.deleting": "Mažem...",
  "buttons.confirm": "Potvrdiť",
  "buttons.close": "Zatvoriť",
  "buttons.retry": "Skúsiť znova",
  "buttons.retrying": "Skúšam znova",
  
  "forms.id": "ID",
  "forms.idExample": "napr. vmware-vcenter-01",
  "forms.idRequired": "ID je povinné",
  "forms.name": "Meno poskytovateľa",
  "forms.nameRequired": "Meno poskytovateľa je povinné",
  "forms.nameExample": "napr. Produkčný vCenter",
  "forms.description": "Popis",
  "forms.descriptionRequired": "Popis je povinný",
  "forms.descriptionExample": "Stručný popis poskytovateľa",
  "forms.type": "Typ",
  "forms.typeRequired": "Typ je povinný",
  "forms.typeSelect": "Vyberte typ",
  "forms.ip": "IP adresa",
  "forms.ipRequired": "IP adresa je povinná",
  "forms.ipExample": "napr. 10.99.99.40",
  "forms.credentials": "Poverenia",
  "forms.credentialsSelect": "Vyberte poverenia",
  "forms.applicationName": "Meno aplikácie *",
  "forms.applicationNameExample": "napr. SampleAppRecovery2",
  "forms.applicationDescription": "Popis *",
  "forms.applicationDescriptionExample": "napr. Obnova FinanceTBApp2",
  "forms.environment": "Prostredie *",
  "forms.environmentDev": "vývoj",
  "forms.environmentStaging": "pracovné prostredie",
  "forms.environmentProd": "produkcia",
  "forms.tierId": "ID",
  "forms.tierIdExample": "tier_id",
  "forms.tierIdError": "ID je už použité alebo je neplatné",
  "forms.tierName": "Meno",
  "forms.tierNameRequired": "Meno je povinné",
  "forms.tierNameExample": "Meno úrovne",
  "forms.tierNameLabel": "Meno *",
  "forms.tierDescription": "Popis",
  "forms.tierDescriptionExample": "Voliteľný popis",
  "forms.tierOrder": "Poradie: {order}",
  "forms.vmDragPlaceholder": "Presuňte virtuálne stroje sem",
  "forms.removeVm": "Odstrániť virtuálny stroj",
  "forms.editTier": "Upraviť",
  "forms.deleteTier": "Odstrániť",
  "forms.cannotDeleteLastTier": "Poslednú úroveň nie je možné odstrániť",
  "forms.deleteThisTier": "Odstrániť túto úroveň",
  
  "details.os": "Operačný systém",
  "details.cluster": "Klaster",
  "details.datastore": "Úložisko",
  "details.folder": "Priečinok",
  "details.vmPath": "Cesta virtuálneho stroja",
  "details.vcpu": "vCPU",
  "details.memory": "Pamäť",
  "details.tags": "Značky",
  "details.label": "Označenie",
  "details.capacity": "Kapacita",
  "details.file": "Súbor",
  "details.thinProv": "Tenký prov.",
  "details.diskUnit": "GB",
  "details.thinProvYes": "Áno",
  "details.thinProvNo": "Nie",
  "details.noDiskAvailable": "Nie sú k dispozícii žiadne disky",
  "details.loadingSnapshots": "Načítavam snímky...",
  "details.sourceMappings": "mapování zdrojov",
  "details.targetMappings": "mapovanie cieľov",
  "details.snapshotSource": "Zdroj",
  "details.snapshotTarget": "Cieľ",
  "details.snapshotStatus": "Stav",
  "details.snapshotProgress": "Postup",
  "details.snapshotCreated": "Vytvorené",
  "details.snapshotProgressUnit": "%",
  "details.noSnapshotData": "Nie sú dostupné údaje o snímkach",
  
  "dialogs.deleteProvider": "Odstrániť poskytovateľa",
  "dialogs.deleteProviderMessage": "Ste si istí, že chcete odstrániť {name}? Túto akciu nie je možné vrátiť.",
  "dialogs.deleteApplication": "Odstrániť aplikáciu",
  "dialogs.deleteApplicationMessage": "Ste si istí, že chcete odstrániť {itemName}? Túto akciu nie je možné vrátiť.",
  "dialogs.applicationJson": "JSON aplikácie",
  
  "drawer.selectedVm": "Vybraný virtuálny stroj",
  "drawer.selectedProvider": "Vybraný poskytovateľ",
  "drawer.selectedApplication": "Aplikácia obnovy",
  "drawer.vmDetail": "Podrobnosti virtuálneho stroja",
  "drawer.providerDetail": "Podrobnosti poskytovateľa",
  "drawer.applicationDetail": "Podrobnosti aplikácie",
  "drawer.closeVm": "Zatvoriť podrobnosti",
  "drawer.closeProvider": "Zatvoriť poskytovateľa",
  "drawer.closeApplication": "Zatvoriť aplikáciu",
  "drawer.tabs.overview": "Prehľad",
  "drawer.tabs.disks": "Disky",
  "drawer.tabs.snapshots": "Snímky",
  
  "pagination.showing": "Zobrazujem {start}-{end} z {total}",
  "pagination.rows": "Riadky",
  "pagination.rowsPerPage": "Riadkov na stránku",
  "pagination.previousPage": "Predchádzajúca stránka",
  "pagination.nextPage": "Ďalšia stránka",
  "pagination.pageOf": "Stránka {page} z {pageCount}",
  "pagination.page": "Stránka {number}",
  "pagination.ellipsis": "...",
  "pagination.option10": "10",
  "pagination.option25": "25",
  "pagination.option50": "50",
  
  "legend.cluster": "Klaster",
  "legend.host": "Hostiteľ",
  "legend.vm": "Virtuálny stroj",
  "legend.datastore": "Úložisko",
  "legend.datastoreRelation": "Vzťah úložiska",
  "legend.statistics": "uzlov / vzťahov",
  "legend.ariaLabel": "Legenda topológie",
  
  "alerts.pleaseEnterName": "Prosím, zadajte meno aplikácie",
  "alerts.pleaseEnterDescription": "Prosím, zadajte popis",
  
  "errors.failed": "Nepodarilo sa {action}",
  "errors.failedWithDetail": "Nepodarilo sa {action}: {detail}",
  "errors.loadFailed": "Nepodarilo sa načítať",
  "errors.unknown": "Vyskytla sa neznáma chyba",
  
  "status.updating": "Aktualizujem",
  "status.working": "Pracujem…",
  "status.loading": "Načítavam modul",
  
  "density.comfortable": "komfortný",
  "density.compact": "kompaktný",
  "density.rowDensity": "Hustota riadkov",
  
  "common.search": "Hľadať",
  "common.filters": "Filtre",
  "common.refresh": "Obnoviť",
  "common.loading": "Načítavam...",
  "common.error": "Chyba",
  "common.noResults": "Nenašli sa žiadne výsledky",
  "common.settings": "Nastavenia",
  "common.logout": "Odhlásiť"
}
```

- [ ] **Step 3: Create Czech translations file**

Create `src/locales/cs.json`:
```json
{
  "language.en": "Angličtina",
  "language.sk": "Slovenština",
  "language.cs": "Čeština",
  
  "header.language": "Jazyk",
  "header.userMenu.settings": "Nastavení",
  "header.userMenu.logout": "Odhlásit se",
  "header.search": "Hledat nebo zadej příkaz...",
  "header.searchHint": "Ctrl K",
  "header.appName": "Aricoma",
  "header.tagline": "Správa kontinuity provozu",
  "header.sidebarTagline": "Kontinuita provozu",
  "header.userRole": "Operátor ABCO",
  "header.userRoleType": "Správce",
  "header.toggleSidebar": "Přepnout postranní panel",
  "header.appHome": "Domov Aricome",
  
  "nav.administration": "Správa platformy",
  "nav.administration.overview": "Přehled",
  "nav.administration.configuration": "Konfigurace",
  "nav.administration.identity": "Identita a přístup",
  "nav.administration.secrets": "Tajemství",
  "nav.administration.certificates": "Certifikáty",
  "nav.administration.diagnostics": "Diagnostika",
  "nav.administration.audit": "Audit a uchování",
  "nav.providers": "Poskytovatelé a konektory",
  "nav.providers.providers": "Poskytovatelé",
  "nav.providers.connections": "Profily připojení",
  "nav.providers.credentials": "Přihlašovací údaje",
  "nav.providers.capability": "Matice schopností",
  "nav.providers.discovery": "Nastavení zjišťování",
  "nav.providers.health": "Zdraví a diagnostika",
  "nav.discovery": "Zjišťování a inventář",
  "nav.discovery.vms": "Virtuální stroje",
  "nav.discovery.infrastructure": "Topologie infrastruktury",
  "nav.discovery.jobs": "Úlohy zjišťování",
  "nav.discovery.search": "Vyhledávání inventáře",
  "nav.discovery.import": "Import souborů",
  "nav.discovery.validation": "Ověřování a potvrzení",
  "nav.discovery.snapshots": "Snímky a historie",
  "nav.discovery.agents": "Agenti zjišťování",
  "nav.storage": "Orchestrace úložiště",
  "nav.vmware": "Orchestrace VMware",
  "nav.ibm": "Orchestrace IBM PowerVM",
  "nav.recovery": "Plány obnovy",
  "nav.recovery.applications": "Aplikace obnovy",
  "nav.recovery.runs": "Spuštění obnovy",
  "nav.execution": "Spouštěcí engine",
  "nav.monitoring": "Monitorování a audit",
  "nav.apis": "Vnitřní API komponent",
  "nav.menu": "Menu",
  
  "pages.virtualMachines.title": "Virtuální stroje",
  "pages.virtualMachines.description": "Přehled inventáře, stavu a umístění VMware.",
  "pages.virtualMachines.eyebrow": "Zjišťování a inventář",
  "pages.virtualMachines.error.title": "Virtuální stroje se nepodařilo načíst",
  "pages.virtualMachines.error.unknown": "Neznámá chyba zjišťování.",
  "pages.virtualMachines.error.retryButton": "Zkusit znovu",
  "pages.virtualMachines.error.latestFailed": "Poslední požadavek selhал",
  "pages.virtualMachines.error.showingPrevious": "Zobrazuji předchozí úspěšnou stránku.",
  "pages.virtualMachines.empty.title": "Nenalezeny žádné virtuální stroje",
  "pages.virtualMachines.empty.description": "Žádné záznamy inventáře se neshodují s aktuálním hledáním a filtry.",
  "pages.virtualMachines.empty.clearFilters": "Vymazat filtry",
  
  "pages.infrastructure.title": "Infrastruktura",
  "pages.infrastructure.description": "Prozkoumejte vztahy mezi zjištěnými clustery, hostiteli, virtuálními stroji a úložišti.",
  "pages.infrastructure.eyebrow": "Zjišťování a inventář",
  "pages.infrastructure.error.title": "Topologii infrastruktury se nepodařilo načíst",
  "pages.infrastructure.error.retryButton": "Zkusit znovu",
  "pages.infrastructure.error.latestFailed": "Poslední požadavek selhал",
  "pages.infrastructure.error.showingPrevious": "Zobrazuji předchozí úspěšnou topologii.",
  "pages.infrastructure.empty.title": "Nebyla zjištěna žádná infrastruktura",
  "pages.infrastructure.empty.description": "Odpověď zjišťování neobsahuje záznamy infrastruktury.",
  "pages.infrastructure.empty.refreshButton": "Obnovit inventář",
  "pages.infrastructure.empty.refreshing": "Obnovuji",
  
  "pages.providers.title": "Poskytovatelé",
  "pages.providers.description": "Zaregistrovaní poskytovatelé zjištění z backendu.",
  "pages.providers.eyebrow": "Poskytovatelé a konektory",
  "pages.providers.addButton": "Přidat poskytovatele",
  
  "pages.recovery.title": "Aplikace obnovy",
  "pages.recovery.description": "Spravujte definice aplikací zotavení po havárii a testujte pracovní postupy obnovy.",
  "pages.recovery.eyebrow": "Plány obnovy",
  "pages.recovery.createButton": "Vytvořit aplikaci",
  "pages.recovery.loading": "Načítám aplikace obnovy...",
  "pages.recovery.error.title": "Aplikace obnovy se nepodařilo načíst",
  "pages.recovery.error.unknown": "Neznámá chyba",
  "pages.recovery.error.retryButton": "Zkusit znovu",
  "pages.recovery.empty.title": "Zatím nejsou definovány žádné aplikace obnovy",
  "pages.recovery.empty.description": "Vytvořte svou první aplikaci obnovy a začněte spravovat pracovní postupy zotavení po havárii.",
  "pages.recovery.empty.createButton": "Vytvořit první aplikaci",
  
  "pages.recoveryBuilder.title": "Vytvořit aplikaci obnovy",
  "pages.recoveryBuilder.description": "Definujte novou aplikaci zotavení po havárii s organizací virtuálních strojů podle vrstev",
  "pages.recoveryBuilder.eyebrow": "Plány obnovy",
  "pages.recoveryBuilder.backButton": "Zpět",
  
  "pages.recoveryEditor.title": "Upravit aplikaci obnovy",
  "pages.recoveryEditor.description": "Upravte konfiguraci aplikace zotavení po havárii",
  "pages.recoveryEditor.eyebrow": "Plány obnovy",
  "pages.recoveryEditor.backButton": "Zpět",
  "pages.recoveryEditor.error.notFound": "ID aplikace nenalezeno",
  "pages.recoveryEditor.error.loading": "Načítám aplikaci...",
  "pages.recoveryEditor.error.failed": "Aplikaci se nepodařilo načíst.",
  
  "pages.recoveryRuns.title": "Spuštění obnovy",
  "pages.recoveryRuns.description": "Historie provádění a stav spuštění obnovy.",
  
  "metrics.discoveredVMs": "Zjištěné virtuální stroje",
  "metrics.discoveredVMs.helper": "Ověřený inventář",
  "metrics.poweredOn": "Zapnuto",
  "metrics.clusters": "Clustery",
  "metrics.clusters.helper": "Aktivní umístění",
  "metrics.memory": "Přidělená paměť",
  "metrics.memory.helper": "celkový vCPU",
  
  "tables.vm.name": "Virtuální stroj",
  "tables.vm.os": "Operační systém",
  "tables.vm.placement": "Umístění",
  "tables.vm.provider": "Poskytovatel",
  "tables.vm.tags": "Značky",
  "tables.vm.compute": "Výpočty",
  "tables.vm.connection": "Připojení",
  "tables.vm.power": "Napájení",
  "tables.vm.snapshots": "Snímky",
  "tables.vm.powerOn": "Zapnuto",
  "tables.vm.powerOff": "Vypnuto",
  "tables.vm.connected": "Připojeno",
  "tables.vm.unknown": "Neznámý",
  
  "tables.provider.name": "Poskytovatel",
  "tables.provider.description": "Popis",
  "tables.provider.type": "Typ",
  "tables.provider.ip": "IP adresa",
  
  "tables.recovery.application": "Aplikace",
  "tables.recovery.environment": "Prostředí",
  "tables.recovery.platform": "Platforma",
  "tables.recovery.tiers": "Vrstvy",
  "tables.recovery.status": "Stav",
  "tables.recovery.submission": "Odeslání",
  "tables.recovery.json": "JSON",
  "tables.recovery.viewJson": "Zobrazit",
  "tables.recovery.active": "Aktivní",
  "tables.recovery.draft": "Návrh",
  "tables.recovery.vmware": "VMware",
  "tables.recovery.ibm": "IBM PowerVM",
  
  "toolbar.vmSearch": "Hledat virtuální stroje",
  "toolbar.vmSearchPlaceholder": "Hledat název, jméno hostitele nebo IP",
  "toolbar.infrastructureSearch": "Hledat v topologii infrastruktury",
  "toolbar.infrastructureSearchPlaceholder": "Hledat virtuální stroj, hostitele, cluster nebo úložiště",
  "toolbar.providerSearch": "Hledat podle jména poskytovatele",
  "toolbar.applicationSearch": "Hledat podle jména aplikace",
  "toolbar.filtersButton": "Filtry",
  "toolbar.filterDialogTitle": "Filtrovat virtuální stroje",
  "toolbar.connection": "Připojení",
  "toolbar.allConnections": "Všechna připojení",
  "toolbar.cluster": "Cluster",
  "toolbar.allClusters": "Všechny clustery",
  "toolbar.provider": "Poskytovatel",
  "toolbar.allProviders": "Všichni poskytovatelé",
  "toolbar.tag": "Značka",
  "toolbar.allTags": "Všechny značky",
  "toolbar.untaggedOnly": "Zobrazit pouze virtuální stroje bez značek",
  "toolbar.cancelButton": "Zrušit",
  "toolbar.clearButton": "Vymazat vše",
  "toolbar.applyButton": "Použít",
  "toolbar.infrastructureHosts": "Všichni hostitelé",
  "toolbar.powerFilter": "Filtr stavu napájení",
  "toolbar.powerFilterAll": "Všichni",
  "toolbar.powerFilterOn": "Zapnuto",
  "toolbar.powerFilterOff": "Vypnuto",
  "toolbar.datastoresCheckbox": "Úložiště",
  "toolbar.autoLayoutButton": "Automatické rozložení",
  "toolbar.autoLayoutLoading": "Rozložení",
  "toolbar.resetPositions": "Obnovit pozice",
  "toolbar.fitView": "Přizpůsobit zobrazení",
  "toolbar.refreshButton": "Obnovit",
  "toolbar.refreshLoading": "Obnovuji",
  
  "buttons.cancel": "Zrušit",
  "buttons.delete": "Smazat",
  "buttons.edit": "Upravit",
  "buttons.save": "Uložit",
  "buttons.saveApplication": "Uložit aplikaci",
  "buttons.createApplication": "Vytvořit aplikaci",
  "buttons.editApplication": "Upravit poskytovatele",
  "buttons.creating": "Vytvářím…",
  "buttons.saving": "Ukládám…",
  "buttons.deleting": "Mažu...",
  "buttons.confirm": "Potvrdit",
  "buttons.close": "Zavřít",
  "buttons.retry": "Zkusit znovu",
  "buttons.retrying": "Zkouším znovu",
  
  "forms.id": "ID",
  "forms.idExample": "např. vmware-vcenter-01",
  "forms.idRequired": "ID je povinné",
  "forms.name": "Jméno poskytovatele",
  "forms.nameRequired": "Jméno poskytovatele je povinné",
  "forms.nameExample": "např. Produkční vCenter",
  "forms.description": "Popis",
  "forms.descriptionRequired": "Popis je povinný",
  "forms.descriptionExample": "Stručný popis poskytovatele",
  "forms.type": "Typ",
  "forms.typeRequired": "Typ je povinný",
  "forms.typeSelect": "Vyberte typ",
  "forms.ip": "IP adresa",
  "forms.ipRequired": "IP adresa je povinná",
  "forms.ipExample": "např. 10.99.99.40",
  "forms.credentials": "Přihlašovací údaje",
  "forms.credentialsSelect": "Vyberte přihlašovací údaje",
  "forms.applicationName": "Jméno aplikace *",
  "forms.applicationNameExample": "např. SampleAppRecovery2",
  "forms.applicationDescription": "Popis *",
  "forms.applicationDescriptionExample": "např. Obnovení FinanceTBApp2",
  "forms.environment": "Prostředí *",
  "forms.environmentDev": "vývoj",
  "forms.environmentStaging": "testovací prostředí",
  "forms.environmentProd": "produkce",
  "forms.tierId": "ID",
  "forms.tierIdExample": "tier_id",
  "forms.tierIdError": "ID je již používáno nebo je neplatné",
  "forms.tierName": "Jméno",
  "forms.tierNameRequired": "Jméno je povinné",
  "forms.tierNameExample": "Jméno vrstvy",
  "forms.tierNameLabel": "Jméno *",
  "forms.tierDescription": "Popis",
  "forms.tierDescriptionExample": "Volitelný popis",
  "forms.tierOrder": "Pořadí: {order}",
  "forms.vmDragPlaceholder": "Přetáhněte virtuální stroje zde",
  "forms.removeVm": "Odebrat virtuální stroj",
  "forms.editTier": "Upravit",
  "forms.deleteTier": "Smazat",
  "forms.cannotDeleteLastTier": "Poslední vrstvu nelze smazat",
  "forms.deleteThisTier": "Smazat tuto vrstvu",
  
  "details.os": "Operační systém",
  "details.cluster": "Cluster",
  "details.datastore": "Úložiště",
  "details.folder": "Složka",
  "details.vmPath": "Cesta virtuálního stroje",
  "details.vcpu": "vCPU",
  "details.memory": "Paměť",
  "details.tags": "Značky",
  "details.label": "Popisek",
  "details.capacity": "Kapacita",
  "details.file": "Soubor",
  "details.thinProv": "Tenký prov.",
  "details.diskUnit": "GB",
  "details.thinProvYes": "Ano",
  "details.thinProvNo": "Ne",
  "details.noDiskAvailable": "Nejsou dostupné žádné disky",
  "details.loadingSnapshots": "Načítám snímky...",
  "details.sourceMappings": "mapování zdrojů",
  "details.targetMappings": "mapování cílů",
  "details.snapshotSource": "Zdroj",
  "details.snapshotTarget": "Cíl",
  "details.snapshotStatus": "Stav",
  "details.snapshotProgress": "Pokrok",
  "details.snapshotCreated": "Vytvořeno",
  "details.snapshotProgressUnit": "%",
  "details.noSnapshotData": "Nejsou dostupná data snímků",
  
  "dialogs.deleteProvider": "Smazat poskytovatele",
  "dialogs.deleteProviderMessage": "Jste si jistí, že chcete smazat {name}? Tuto akci nelze vrátit zpět.",
  "dialogs.deleteApplication": "Smazat aplikaci",
  "dialogs.deleteApplicationMessage": "Jste si jistí, že chcete smazat {itemName}? Tuto akci nelze vrátit zpět.",
  "dialogs.applicationJson": "JSON aplikace",
  
  "drawer.selectedVm": "Vybraný virtuální stroj",
  "drawer.selectedProvider": "Vybraný poskytovatel",
  "drawer.selectedApplication": "Aplikace obnovy",
  "drawer.vmDetail": "Podrobnosti virtuálního stroje",
  "drawer.providerDetail": "Podrobnosti poskytovatele",
  "drawer.applicationDetail": "Podrobnosti aplikace",
  "drawer.closeVm": "Zavřít podrobnosti",
  "drawer.closeProvider": "Zavřít poskytovatele",
  "drawer.closeApplication": "Zavřít aplikaci",
  "drawer.tabs.overview": "Přehled",
  "drawer.tabs.disks": "Disky",
  "drawer.tabs.snapshots": "Snímky",
  
  "pagination.showing": "Zobrazuji {start}-{end} z {total}",
  "pagination.rows": "Řádky",
  "pagination.rowsPerPage": "Řádků na stránku",
  "pagination.previousPage": "Předchozí stránka",
  "pagination.nextPage": "Další stránka",
  "pagination.pageOf": "Stránka {page} z {pageCount}",
  "pagination.page": "Stránka {number}",
  "pagination.ellipsis": "...",
  "pagination.option10": "10",
  "pagination.option25": "25",
  "pagination.option50": "50",
  
  "legend.cluster": "Cluster",
  "legend.host": "Hostitel",
  "legend.vm": "Virtuální stroj",
  "legend.datastore": "Úložiště",
  "legend.datastoreRelation": "Vztah úložiště",
  "legend.statistics": "uzlů / vztahů",
  "legend.ariaLabel": "Legenda topologie",
  
  "alerts.pleaseEnterName": "Prosím, zadejte jméno aplikace",
  "alerts.pleaseEnterDescription": "Prosím, zadejte popis",
  
  "errors.failed": "Nepodařilo se {action}",
  "errors.failedWithDetail": "Nepodařilo se {action}: {detail}",
  "errors.loadFailed": "Nepodařilo se načíst",
  "errors.unknown": "Došlo k neznámé chybě",
  
  "status.updating": "Aktualizuji",
  "status.working": "Pracuji…",
  "status.loading": "Načítám modul",
  
  "density.comfortable": "pohodlný",
  "density.compact": "kompaktní",
  "density.rowDensity": "Hustota řádků",
  
  "common.search": "Hledat",
  "common.filters": "Filtry",
  "common.refresh": "Obnovit",
  "common.loading": "Načítám...",
  "common.error": "Chyba",
  "common.noResults": "Nebyly nalezeny žádné výsledky",
  "common.settings": "Nastavení",
  "common.logout": "Odhlásit se"
}
```

- [ ] **Step 4: Verify all three files have identical key structure**

Run: `npm run typecheck`

Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/locales/
git commit -m "feat: add comprehensive translation files for en, sk, cs with 300+ UI strings"
```

**Acceptance Criteria:**
- [ ] All three translation files exist with valid JSON
- [ ] All three files have identical key structure (same keys, only values differ)
- [ ] Keys follow consistent dot-notation hierarchy
- [ ] Every hardcoded English UI string has a corresponding translation key in all three files
- [ ] Total keys: 300+

**Verification:**
- [ ] `npm run lint` — no errors
- [ ] Files parse as valid JSON
- [ ] Key count is consistent across all three files

**Dependencies:** None

**Estimated scope:** S (3 new files, comprehensive content)

---

## Task 2: Create Language Context and Provider

**Description:** Build a React Context that manages the current language state and provides methods to change it. The provider detects the browser language on first load, checks localStorage for a saved preference, and exposes the current language and translation getter to the entire app.

**Files:**
- Create: `src/contexts/LanguageContext.tsx`

**Interfaces:**
- Produces: `LanguageContext` (React.Context), `LanguageProvider` (component), exported language type `type Language = 'en' | 'sk' | 'cs'`

**Steps:**

- [ ] **Step 1: Create the Language Context with types**

Create `src/contexts/LanguageContext.tsx`:
```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Language = 'en' | 'sk' | 'cs'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  translations: Record<string, string>
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const SUPPORTED_LANGUAGES: Language[] = ['en', 'sk', 'cs']
const STORAGE_KEY = 'app-language'

function getBrowserLanguage(): Language {
  const browserLang = navigator.language.split('-')[0]
  if (SUPPORTED_LANGUAGES.includes(browserLang as Language)) {
    return browserLang as Language
  }
  return 'en'
}

function loadTranslations(lang: Language): Record<string, string> {
  const translations: Record<Language, Record<string, string>> = {
    en: {},
    sk: {},
    cs: {},
  }
  // Will be populated after modules are imported
  return translations[lang] || {}
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null
    if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
      return saved
    }
    return getBrowserLanguage()
  })

  const [translations, setTranslations] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadLangModule = async () => {
      try {
        const module = await import(`../locales/${language}.json`)
        setTranslations(module.default || module)
      } catch (error) {
        console.error(`Failed to load language: ${language}`, error)
        setTranslations({})
      }
    }
    loadLangModule()
  }, [language])

  const setLanguage = (lang: Language) => {
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      setLanguageState(lang)
      localStorage.setItem(STORAGE_KEY, lang)
    }
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguageContext() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguageContext must be used within LanguageProvider')
  }
  return context
}
```

- [ ] **Step 2: Verify the context exports and structure**

Check that the file has no syntax errors:

Run: `npm run typecheck`

Expected: No TypeScript errors in this file.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/LanguageContext.tsx
git commit -m "feat: create language context with browser detection and persistence"
```

**Acceptance Criteria:**
- [ ] Context exports `LanguageProvider` component and `useLanguageContext` hook
- [ ] Provider loads translations from JSON files dynamically
- [ ] Browser language is auto-detected on first load
- [ ] localStorage is checked for saved preference before browser language
- [ ] `setLanguage` saves to localStorage

**Verification:**
- [ ] `npm run typecheck` — no errors
- [ ] `npm run lint` — no errors

**Dependencies:** Task 1 (translation files must exist)

**Estimated scope:** S (1 file, ~80 lines)

---

## Task 3: Create useTranslation Hook

**Description:** Build a custom hook that simplifies access to translations throughout the app. It provides the current language and a function to retrieve translation strings by key, with a fallback for missing keys.

**Files:**
- Create: `src/hooks/useTranslation.ts`

**Interfaces:**
- Consumes: `useLanguageContext()` from LanguageContext
- Produces: `useTranslation()` hook that returns `{ t(key: string): string, language: Language }`

**Steps:**

- [ ] **Step 1: Create the useTranslation hook**

Create `src/hooks/useTranslation.ts`:
```typescript
import { useLanguageContext } from '@/contexts/LanguageContext'

export function useTranslation() {
  const { language, translations } = useLanguageContext()

  const t = (key: string): string => {
    return translations[key] || key
  }

  return { t, language }
}
```

- [ ] **Step 2: Verify the hook**

Run: `npm run typecheck`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTranslation.ts
git commit -m "feat: add useTranslation hook for accessing translations"
```

**Acceptance Criteria:**
- [ ] Hook exports `useTranslation` function
- [ ] Returns object with `t` function and `language`
- [ ] `t` function accepts a key and returns the translated string or the key itself as fallback

**Verification:**
- [ ] `npm run typecheck` — no errors
- [ ] `npm run lint` — no errors

**Dependencies:** Task 2 (LanguageContext must exist)

**Estimated scope:** XS (1 file, ~20 lines)

---

## Task 4: Wrap App in LanguageProvider

**Description:** Integrate the LanguageProvider into the app's root so that all components have access to the language context.

**Files:**
- Modify: `src/main.tsx`

**Steps:**

- [ ] **Step 1: Read current main.tsx to see app structure**

Read: `src/main.tsx`

- [ ] **Step 2: Import LanguageProvider and wrap app**

Modify `src/main.tsx` to import and use LanguageProvider:
```typescript
import { LanguageProvider } from '@/contexts/LanguageContext'

// Inside ReactDOM.createRoot(...):
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
)
```

- [ ] **Step 3: Verify app builds and runs**

Run: `npm run build`

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx
git commit -m "feat: wrap app in LanguageProvider"
```

**Acceptance Criteria:**
- [ ] LanguageProvider wraps the entire app
- [ ] App builds without errors

**Verification:**
- [ ] `npm run build` — succeeds
- [ ] `npm run typecheck` — no errors

**Dependencies:** Task 2 (LanguageProvider must exist)

**Estimated scope:** XS (1 file, minimal change)

---

## Task 5: Create UserMenu Dropdown Component

**Description:** Build a dropdown menu component for the header that displays the current user, language options (ENG, SVK, CZ), Settings, and Logout buttons. This replaces the static user badge.

**Files:**
- Create: `src/app/header/UserMenu.tsx`

**Interfaces:**
- Consumes: `useTranslation()` from hooks
- Produces: `UserMenu` component (no props required; reads user from context if available)

**Steps:**

- [ ] **Step 1: Create the UserMenu component with dropdown structure**

Create `src/app/header/UserMenu.tsx`:
```typescript
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '@/hooks/useTranslation'

interface UserMenuProps {
  userName?: string
  userTitle?: string
  userInitials?: string
}

export function UserMenu({ userName = 'ABCO operator', userTitle = 'Administrator', userInitials = 'AB' }: UserMenuProps) {
  const { t, language } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold">
          {userInitials}
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-gray-900">{userName}</div>
          <div className="text-xs text-gray-500">{userTitle}</div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-700">{t('header.language')}</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => {
                  // Language change will be wired up in next task
                  setIsOpen(false)
                }}
                className={`px-3 py-1 text-xs rounded ${language === 'en' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {t('language.en')}
              </button>
              <button
                onClick={() => {
                  // Language change will be wired up in next task
                  setIsOpen(false)
                }}
                className={`px-3 py-1 text-xs rounded ${language === 'sk' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {t('language.sk')}
              </button>
              <button
                onClick={() => {
                  // Language change will be wired up in next task
                  setIsOpen(false)
                }}
                className={`px-3 py-1 text-xs rounded ${language === 'cs' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {t('language.cs')}
              </button>
            </div>
          </div>
          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-200">
            {t('header.userMenu.settings')}
          </button>
          <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
            {t('header.userMenu.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify component with typecheck**

Run: `npm run typecheck`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/header/UserMenu.tsx
git commit -m "feat: create UserMenu dropdown component with language switcher"
```

**Acceptance Criteria:**
- [ ] Component renders as a button with user initials and name
- [ ] Clicking button toggles dropdown menu
- [ ] Dropdown shows language options, Settings, and Logout
- [ ] Current language is visually highlighted in the language buttons
- [ ] Clicking outside closes dropdown

**Verification:**
- [ ] `npm run typecheck` — no errors
- [ ] `npm run lint` — no errors

**Dependencies:** Task 3 (useTranslation hook must exist)

**Estimated scope:** S (1 file, ~100 lines)

---

## Task 6: Wire Language Buttons to setLanguage and Replace Header Badge

**Description:** Connect the language buttons in UserMenu to actually change the language via `setLanguage`, and replace the existing header user badge with the new UserMenu component.

**Files:**
- Modify: `src/app/header/UserMenu.tsx` (wire language buttons)
- Modify: `src/app/header/Header.tsx` (or equivalent, wherever the user badge currently is)

**Steps:**

- [ ] **Step 1: Update UserMenu to wire language buttons**

In `src/app/header/UserMenu.tsx`, import `useLanguageContext` and update the language buttons:
```typescript
import { useLanguageContext } from '@/contexts/LanguageContext'

// Inside UserMenu component:
const { setLanguage } = useLanguageContext()

// Replace the onClick placeholders in language buttons:
<button
  onClick={() => {
    setLanguage('en')
    setIsOpen(false)
  }}
  className={...}
>
  {t('language.en')}
</button>
// ... repeat for 'sk' and 'cs'
```

- [ ] **Step 2: Locate the current header user badge in Header.tsx**

Read the Header file to find where the user badge is currently rendered.

- [ ] **Step 3: Replace badge with UserMenu component**

Import UserMenu and replace the old badge element with `<UserMenu />`.

If the badge currently receives props (userName, userTitle, userInitials), pass them to UserMenu.

- [ ] **Step 4: Verify app still builds and renders header**

Run: `npm run build`

Expected: Build succeeds.

- [ ] **Step 5: Commit both changes**

```bash
git add src/app/header/UserMenu.tsx src/app/header/Header.tsx
git commit -m "feat: wire language switcher and integrate UserMenu into header"
```

**Acceptance Criteria:**
- [ ] Language buttons in UserMenu change the app language when clicked
- [ ] Language change triggers re-render with new translations
- [ ] Old user badge is replaced with UserMenu component
- [ ] Settings and Logout buttons exist (no functionality required yet)

**Verification:**
- [ ] `npm run build` — succeeds
- [ ] `npm run typecheck` — no errors
- [ ] `npm run lint` — no errors

**Dependencies:** Task 5 (UserMenu component), Task 2 (LanguageContext)

**Estimated scope:** S (2 files, modifications)

---

## Checkpoint: Multilingual Support Complete

- [ ] All three language JSON files created and valid
- [ ] LanguageContext manages language state and persistence
- [ ] useTranslation hook provides translation access
- [ ] App wrapped in LanguageProvider
- [ ] UserMenu dropdown component created with language switcher
- [ ] Language buttons wired to change app language
- [ ] Header user badge replaced with UserMenu
- [ ] `npm run lint` — clean, 0 errors
- [ ] `npm run typecheck` — clean, 0 errors
- [ ] `npm run build` — succeeds
- [ ] Manual check: Click language buttons in header dropdown, app switches language immediately

---

## Future Work (Out of Scope)

- Extract existing UI strings into translation keys as features are updated
- Implement Settings page functionality
- Implement Logout functionality
- Add language-specific date/number formatting (Intl API)
- Support for right-to-left languages
