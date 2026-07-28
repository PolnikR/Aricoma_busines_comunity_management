import { createBrowserRouter, createRoutesFromElements } from 'react-router-dom'
import { AppRoutes } from './AppRoutes'

export function createAppRouter() {
  return createBrowserRouter(
    createRoutesFromElements(AppRoutes()),
  )
}
