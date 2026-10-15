import { Suspense, isValidElement, type ReactNode } from 'react'
import { Navigate, createRoutesFromElements, type RouteObject } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from '../AppRoutes'

// Recorded before splitting the monolithic AppRoutes. Route shape and exact loading
// skeletons must not change without explicit review. Page identities are checked
// separately by lazyRouteBindings.test.tsx using real route navigation.
function elementContract(node: ReactNode) {
  if (!isValidElement(node)) return null

  const props = node.props as {
    to?: unknown
    replace?: unknown
    fallback?: ReactNode
    children?: ReactNode
  }

  if (node.type === Navigate) {
    return { kind: 'redirect', to: props.to, replace: props.replace }
  }
  if (node.type === Suspense) {
    const fallback = props.fallback
    if (!isValidElement(fallback)) return { kind: 'suspense', fallback: null }
    const fallbackType = fallback.type
    const fallbackName = typeof fallbackType === 'function'
      ? fallbackType.name
      : typeof fallbackType === 'string' ? fallbackType : 'unknown'
    const { variant } = fallback.props as { variant?: string }
    return { kind: 'suspense', fallback: variant ? `${fallbackName}:${variant}` : fallbackName }
  }

  if (typeof node.type === 'function') {
    return { kind: node.type.name || 'component' }
  }
  return { kind: typeof node.type === 'object' ? 'lazy' : node.type }
}

function routeContract(nodes: RouteObject[], parents: string[] = []): unknown[] {
  return nodes.flatMap(node => {
    const segment = node.index ? '(index)' : node.path ?? '(layout)'
    const path = [...parents, segment]
    return [
      {
        route: path.join(' / '),
        contained: (node.handle as { contentScroll?: string } | undefined)?.contentScroll ?? null,
        element: elementContract(node.element),
      },
      ...(node.children ? routeContract(node.children, path) : []),
    ]
  })
}

describe('ABCO route contract', () => {
  it('preserves every existing route, redirect, layout handle and loading fallback', () => {
    expect(routeContract(createRoutesFromElements(AppRoutes())))
      .toMatchSnapshot()
  })
})
