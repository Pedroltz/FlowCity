export interface GraphNode {
  id: string;
  name: string;
  x: number;
  y: number;
}
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  capacity: number;
  flow: number;
}
export interface Graph {
  id?: string;
  name: string;
  description: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
export interface GraphSummary {
  id: string;
  name: string;
  description: string;
  nodeCount: number;
  edgeCount: number;
}
export interface Segment {
  edgeId: string;
  source: string;
  target: string;
  residualCapacity: number;
  isReverse: boolean;
}
export interface AugmentingPath {
  iteration: number;
  nodes: string[];
  edges: Segment[];
  bottleneck: number;
  addedFlow: number;
}
export interface MaxFlowResult {
  maxFlow: number;
  executionTimeMs: number;
  iterations: number;
  augmentingPaths: AugmentingPath[];
  edges: (GraphEdge & { residualCapacity: number })[];
  residualNetwork: {
    id: string;
    originalEdgeId: string;
    source: string;
    target: string;
    residualCapacity: number;
    isReverse: boolean;
  }[];
}
