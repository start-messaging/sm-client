import type { Edge } from '@xyflow/react';
import type { FlowEditorNode } from './node-types';

export interface FlowWarning {
  nodeId: string;
  code: 'CONSECUTIVE_SENDS' | 'DELAY_TOO_SHORT';
  message: string;
}

export function findFlowHealthWarnings(
  nodes: FlowEditorNode[],
  edges: Edge[],
): FlowWarning[] {
  const warnings: FlowWarning[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const node of nodes) {
    const inEdge = edges.find((e) => e.target === node.id);
    if (!inEdge) continue;
    const pred = nodeMap.get(inEdge.source);
    if (!pred) continue;

    if (node.type === 'send_message' && pred.type === 'send_message') {
      warnings.push({
        nodeId: node.id,
        code: 'CONSECUTIVE_SENDS',
        message:
          'Two messages in a row with no delay. Add a Wait step between sends to protect your number quality.',
      });
    }

    // wait_delay is a future node type; this check activates once it is added
    if (node.type === ('wait_delay' as string) && pred.type === 'send_message') {
      const { delayAmount = 1, delayUnit = 'hours' } = node.data as {
        delayAmount?: number;
        delayUnit?: string;
      };
      const isShort =
        delayUnit === 'minutes' ||
        (delayUnit === 'hours' && (delayAmount as number) < 24);
      if (isShort) {
        warnings.push({
          nodeId: node.id,
          code: 'DELAY_TOO_SHORT',
          message: `A ${delayAmount} ${delayUnit} delay between messages is short. Consider ≥24h to reduce block risk.`,
        });
      }
    }
  }

  return warnings;
}
