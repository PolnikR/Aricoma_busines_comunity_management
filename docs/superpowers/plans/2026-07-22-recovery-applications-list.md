# Implementation Plan: Recovery Applications List with Production-Ready Table

## Overview
Build a production-ready Recovery Applications list view that displays all recovery applications in a feature-rich table with metadata (name, description, environment, tier count, status, last updated), inline actions (View, Edit, Delete, Test Recovery), and proper loading/error states.

## Architecture Decisions
- **Table over Cards**: Use existing RecoveryApplicationsTable component for a professional, scannable interface aligned with Virtual Machines design pattern
- **Vertical data enrichment**: Compute tier count and derive status from application state at component level, not API
- **Action placement**: Actions in table for quick access; Edit opens a modal or new page; Delete shows confirmation dialog
- **Consistent patterns**: Follow Virtual Machines page patterns for loading, errors, empty states, and toolbar

## Task List

### Phase 1: Foundation & Integration
- [ ] **Task 1: Enhance RecoveryApplicationsTable with production columns**
  - Add Tier Count, Status, Last Updated columns
  - Add Edit button and Delete button (with confirmation)
  - Keep View JSON for debugging
  - Refine styling to match Virtual Machines table
  - Scope: 1 file (RecoveryApplicationsTable.tsx)

- [ ] **Task 2: Update RecoveryApplicationsListPage to use table**
  - Replace card grid with RecoveryApplicationsTable
  - Pass applications from useRecoveryApplications hook
  - Add create button in PageHeader
  - Improve empty state messaging
  - Scope: 1 file (RecoveryApplicationsListPage.tsx)

### Checkpoint: Table Display Works
- [ ] Build succeeds
- [ ] Lint passes
- [ ] List page displays applications in table format
- [ ] All columns (name, description, environment, tiers, status, updated) visible
- [ ] Create button navigates to builder

### Phase 2: Delete Functionality
- [ ] **Task 3: Implement delete with confirmation**
  - Add DeleteConfirmationDialog component (reusable)
  - Wire useDeleteRecoveryApplication hook in table
  - Show success/error toast notifications
  - Update table after deletion
  - Scope: 2 files (DeleteConfirmationDialog.tsx, RecoveryApplicationsTable.tsx)

- [ ] **Task 4: Test delete functionality**
  - Write tests for delete confirmation dialog
  - Test delete hook integration
  - Test table refresh after delete
  - Scope: 1 file (*.test.ts)

### Checkpoint: Delete Works
- [ ] Delete button opens confirmation dialog
- [ ] Confirmation dialog has Cancel and Delete buttons
- [ ] Delete removes app and updates table
- [ ] Error handling shows toast

### Phase 3: Edit & View Flows
- [ ] **Task 5: Add Edit page route and component**
  - Create RecoveryApplicationEditorPage
  - Reuse RecoveryAppBuilder component (with edit mode)
  - Load existing app data via useRecoveryApplication hook
  - Add back button to return to list
  - Scope: 2 files (RecoveryApplicationEditorPage.tsx, routes config)

- [ ] **Task 6: Wire Edit button to editor**
  - Edit button in table navigates to edit page
  - Update RecoveryAppBuilder to accept editMode prop
  - Handle save vs create mutations
  - Scope: 2 files (RecoveryApplicationsTable.tsx, RecoveryApplicationEditorPage.tsx)

### Checkpoint: Edit Flow Works
- [ ] Edit button navigates to editor page
- [ ] Editor page loads existing app data
- [ ] Save button updates app and returns to list
- [ ] Back button cancels and returns to list

### Phase 4: Polish & Quality
- [ ] **Task 7: Add Test Recovery action (MVP)**
  - Add "Test Recovery" button to table (disabled/info state for MVP)
  - Add tooltip: "Recovery testing coming soon"
  - Placeholder for future recovery simulation feature
  - Scope: 1 file (RecoveryApplicationsTable.tsx)

- [ ] **Task 8: Refine loading, error, and empty states**
  - Add proper skeleton/loading state for table
  - Enhance error alert with retry button
  - Improve empty state with helpful message
  - Match Virtual Machines page patterns
  - Scope: 2 files (RecoveryApplicationsListPage.tsx, components)

- [ ] **Task 9: Add toast notifications**
  - Success toast after create
  - Success toast after edit
  - Error toast on failures
  - Use consistent toast component
  - Scope: 3 files (creation, deletion, editing flows)

### Checkpoint: Complete Feature
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Lint clean
- [ ] Full user flow: Create → List (table view) → View → Edit → Save/Delete

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Edit page conflicts with builder page | Medium | Reuse RecoveryAppBuilder with mode prop; keep roles clear |
| Delete without confirmation loses data | High | Confirmation dialog mandatory; toast confirms action |
| Performance with large app lists | Low (MVP) | Implement pagination/virtualization if 100+ apps in future |
| Missing status logic | Medium | Define status enum (Active/Inactive/Draft) in types; compute in component |

## Open Questions
- Should "Status" be a stored field or derived (e.g., "Active" = has tiers configured)?
- Should Edit show a different UX from Create (modal vs full page)?
- Should Test Recovery be clickable (MVP stub) or disabled for now?

## Success Criteria
- [ ] Table displays all recovery applications with complete metadata
- [ ] Create, Read, Update, Delete flows all working
- [ ] Styling matches Virtual Machines page patterns
- [ ] Loading/error/empty states implemented
- [ ] All lint and tests pass
- [ ] Ready for production deployment to spike/ant-design-shell

