import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';

const NODE_WIDTH = 240;
const NODE_HEIGHT = 80;

/**
 * Top-to-bottom dagre pass over the graph. Dagre positions nodes by centre
 * while React Flow positions by top-left corner, hence the half-size offset.
 */
export function autoLayout<T extends Node>(nodes: T[], edges: Edge[]): T[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((n) =>
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }),
  );
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return nodes.map((n) => {
    const { x, y } = g.node(n.id);
    return {
      ...n,
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
    };
  });
}
