declare module 'supercluster' {
    export interface SuperclusterOptions {
        minZoom?: number
        maxZoom?: number
        radius?: number
        extent?: number
        nodeSize?: number
        log?: boolean
        map?: (props: any) => any
        reduce?: (accumulated: any, props: any) => void
    }

    export default class Supercluster {
        constructor(options?: SuperclusterOptions)
        load(points: any[]): this
        getClusters(bbox: [number, number, number, number], zoom: number): any[]
        getTile(z: number, x: number, y: number): any
        getLeaves(clusterId: number, limit?: number, offset?: number): any[]
        getClusterExpansionZoom(clusterId: number): number
        getChildren(clusterId: number): any[]
    }
}
