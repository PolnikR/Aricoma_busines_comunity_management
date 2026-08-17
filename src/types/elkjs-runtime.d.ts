declare module 'elkjs-runtime' {
  interface ElkLayoutNode {
    id: string
    x?: number
    y?: number
    width?: number
    height?: number
    layoutOptions?: Record<string, string>
    children?: ElkLayoutNode[]
    edges?: ElkLayoutEdge[]
  }

  interface ElkLayoutEdge {
    id: string
    sources: string[]
    targets: string[]
  }

  export default class ELK {
    layout(graph: ElkLayoutNode): Promise<ElkLayoutNode>
  }
}
