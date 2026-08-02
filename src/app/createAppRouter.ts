import { createBrowserRouter, createRoutesFromElements } from 'react-router'
import { AppRoutes } from './AppRoutes'

export function createAppRouter() {
  return createBrowserRouter(
    createRoutesFromElements(AppRoutes()),
  )
}
