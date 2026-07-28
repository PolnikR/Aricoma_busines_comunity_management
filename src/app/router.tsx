import { RouterProvider } from 'react-router-dom'
import { createAppRouter } from './createAppRouter'

const appRouter = createAppRouter()

export function AppRouter() {
  return <RouterProvider router={appRouter} />
}
