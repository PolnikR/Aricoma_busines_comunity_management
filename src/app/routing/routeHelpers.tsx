import { Route } from 'react-router'
import { ModuleWorkQueuePage } from '@/features/module-placeholder/pages/ModuleWorkQueuePage'
import type { ModulePageConfig } from '../modulePageConfigs'

export function toRoutePath(path: string) {
  return path.replace(/^\//, '')
}

export function renderModulePageRoutes(pages: ModulePageConfig[]) {
  return pages.map((page) => (
    <Route
      key={page.path}
      path={toRoutePath(page.path)}
      element={<ModuleWorkQueuePage {...page} />}
    />
  ))
}
