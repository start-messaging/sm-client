import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent as ReactDragEvent } from 'react';
import {
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
} from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { FlowEdge, FlowNode, FlowNodeType, WaFlow } from '@/api/flows.api';
import {
  useActivateFlow,
  useDeactivateFlow,
  useFlow,
  usePatchFlow,
} from '@/api/hooks/use-flows';
import { toast } from '@/lib/toast';
import { autoLayout } from './auto-layout';
import {
  NODE_TYPE_META,
  type FlowEditorNode,
  type FlowEditorNodeData,
} from './node-types';

/** The drag payload the palette writes and the canvas reads. */
export const NODE_DRAG_MIME = 'application/reactflow-node-type';

/** Steps the runner never continues from — they need no outgoing edge. */
const TERMINAL_TYPES: FlowNodeType[] = ['end', 'assign_agent'];

/** One reason the flow cannot be activated. `nodeId` null = whole-flow issue. */
export interface FlowIssue {
  nodeId: string | null;
  message: string;
}

function newNodeId(): string {
  return crypto.randomUUID();
}

function defaultNodeData(type: FlowNodeType): FlowEditorNodeData {
  switch (type) {
    case 'send_message':
      return { message: '' };
    case 'button_branch':
      return { body: '', options: [] };
    case 'list_branch':
      return { body: '', buttonLabel: '', options: [] };
    case 'condition':
      return { variable: 'reply', operator: 'equals', value: '' };
    case 'set_field':
      return { field: 'reply', value: '' };
    case 'add_tag':
    case 'remove_tag':
      return { tag: '' };
    case 'change_stage':
      return { stageId: null };
    case 'assign_agent':
      return { userId: null };
    default:
      return {};
  }
}

function toEditorNodes(flow: WaFlow): FlowEditorNode[] {
  return flow.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    // The trigger card mirrors flow-level settings; the runner reads them from
    // the flow, so these two keys are display-only on the node.
    data:
      node.type === 'trigger'
        ? {
            ...node.data,
            triggerType: flow.triggerType,
            triggerKeywords: flow.triggerKeywords,
          }
        : (node.data as FlowEditorNodeData),
  }));
}

function toApiNodes(nodes: FlowEditorNode[]): FlowNode[] {
  return nodes.flatMap((node) =>
    node.type
      ? [
          {
            id: node.id,
            type: node.type,
            position: node.position,
            data: node.data,
          },
        ]
      : [],
  );
}

function toApiEdges(edges: Edge[]): FlowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle ?? null,
    target: edge.target,
    targetHandle: edge.targetHandle ?? null,
  }));
}

/**
 * Key-sorted stringify: Postgres reorders `jsonb` keys, so a plain
 * JSON.stringify diff would report a saved flow as dirty forever.
 */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1));
    const body = entries
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
      .join(',');
    return `{${body}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function graphSnapshot(
  name: string,
  keywords: string[],
  nodes: FlowNode[],
  edges: FlowEdge[],
): string {
  const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : 1);
  return stableStringify({
    name: name.trim(),
    keywords,
    nodes: [...nodes].sort(byId),
    edges: [...edges].sort(byId),
  });
}

/**
 * Client-side mirror of the server's activate-time graph validation, so the
 * user sees what is wrong on the canvas instead of a 422.
 */
function validateGraph(
  nodes: FlowEditorNode[],
  edges: Edge[],
  label: (node: FlowEditorNode) => string,
  t: TFunction,
): FlowIssue[] {
  const issues: FlowIssue[] = [];

  const triggers = nodes.filter((node) => node.type === 'trigger');
  if (triggers.length === 0) {
    issues.push({
      nodeId: null,
      message: t(
        'flows.issue.no_trigger',
        'Add a trigger step so the flow knows when to start.',
      ),
    });
  } else if (triggers.length > 1) {
    for (const node of triggers.slice(1)) {
      issues.push({
        nodeId: node.id,
        message: t(
          'flows.issue.many_triggers',
          'This flow has more than one trigger step. Keep only one.',
        ),
      });
    }
  }

  const connected = new Set(edges.map((edge) => edge.source));
  for (const node of nodes) {
    if (!node.type || TERMINAL_TYPES.includes(node.type)) continue;
    if (!connected.has(node.id)) {
      issues.push({
        nodeId: node.id,
        message: t(
          'flows.issue.not_connected',
          '"{{step}}" is not connected to a next step.',
          { step: label(node) },
        ),
      });
    }
  }

  for (const node of nodes) {
    if (node.type !== 'button_branch' && node.type !== 'list_branch') continue;
    if ((node.data.options ?? []).length === 0) {
      issues.push({
        nodeId: node.id,
        message: t(
          'flows.issue.no_options',
          '"{{step}}" needs at least one option for the contact to choose.',
          { step: label(node) },
        ),
      });
    }
  }

  return issues;
}

/**
 * All editor state for one flow: the React Flow graph, the flow-level fields
 * the top bar edits, and the save / activate lifecycle. Must be called inside
 * a `<ReactFlowProvider>` (it uses `screenToFlowPosition` and `fitView`).
 */
export function useFlowEditor(slug: string, flowId: string) {
  const { t } = useTranslation();
  const { screenToFlowPosition, fitView } = useReactFlow();

  const flowQuery = useFlow(slug, flowId);
  const flow = flowQuery.data;

  const patchMutation = usePatchFlow(slug);
  const activateMutation = useActivateFlow(slug);
  const deactivateMutation = useDeactivateFlow(slug);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowEditorNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [name, setName] = useState('');
  const [triggerKeywords, setTriggerKeywords] = useState<string[]>([]);
  const [showIssues, setShowIssues] = useState(false);

  // Hydrate once per flow: later refetches must not clobber unsaved edits.
  const hydratedId = useRef<string | null>(null);
  useEffect(() => {
    if (!flow || hydratedId.current === flow.id) return;
    hydratedId.current = flow.id;
    setNodes(toEditorNodes(flow));
    setEdges(flow.edges);
    setName(flow.name);
    setTriggerKeywords(flow.triggerKeywords);
    // The graph arrives after mount, so the `fitView` prop has nothing to fit.
    requestAnimationFrame(() => void fitView({ maxZoom: 1, padding: 0.2 }));
  }, [flow, setNodes, setEdges, fitView]);

  const savedSnapshot = useMemo(
    () =>
      flow
        ? graphSnapshot(
            flow.name,
            flow.triggerKeywords,
            toApiNodes(toEditorNodes(flow)),
            toApiEdges(flow.edges),
          )
        : null,
    [flow],
  );

  const localSnapshot = useMemo(
    () =>
      graphSnapshot(
        name,
        triggerKeywords,
        toApiNodes(nodes),
        toApiEdges(edges),
      ),
    [name, triggerKeywords, nodes, edges],
  );

  const isDirty = savedSnapshot !== null && savedSnapshot !== localSnapshot;

  const nodeLabel = useCallback(
    (node: FlowEditorNode) => {
      const meta = node.type ? NODE_TYPE_META[node.type] : null;
      return meta ? t(meta.labelKey, meta.label) : node.id;
    },
    [t],
  );

  const allIssues = useMemo(
    () => validateGraph(nodes, edges, nodeLabel, t),
    [nodes, edges, nodeLabel, t],
  );
  // Issues stay hidden until the first activate attempt, then track live edits.
  const issues = useMemo(
    () => (showIssues ? allIssues : []),
    [showIssues, allIssues],
  );

  const invalidNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const issue of issues) {
      if (issue.nodeId) ids.add(issue.nodeId);
    }
    return ids;
  }, [issues]);

  /** Nodes as rendered: validation rings are view-only, never persisted. */
  const displayNodes = useMemo(() => {
    if (invalidNodeIds.size === 0) return nodes;
    return nodes.map((node) =>
      invalidNodeIds.has(node.id)
        ? { ...node, className: 'rounded-[10px] ring-2 ring-red-400' }
        : node,
    );
  }, [nodes, invalidNodeIds]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.selected) ?? null,
    [nodes],
  );

  const hasTrigger = useMemo(
    () => nodes.some((node) => node.type === 'trigger'),
    [nodes],
  );

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((current) => addEdge(connection, current)),
    [setEdges],
  );

  const onDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const dropped = event.dataTransfer.getData(
        NODE_DRAG_MIME,
      ) as FlowNodeType;
      if (!dropped || !(dropped in NODE_TYPE_META)) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const created: FlowEditorNode = {
        id: newNodeId(),
        type: dropped,
        position,
        data: defaultNodeData(dropped),
        selected: true,
      };
      setNodes((current) => [
        ...current.map((node) => ({ ...node, selected: false })),
        created,
      ]);
    },
    [screenToFlowPosition, setNodes],
  );

  const updateNodeData = useCallback(
    (nodeId: string, patch: FlowEditorNodeData) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...patch } }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((current) => current.filter((node) => node.id !== nodeId));
      setEdges((current) =>
        current.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId,
        ),
      );
    },
    [setNodes, setEdges],
  );

  const clearSelection = useCallback(() => {
    setNodes((current) =>
      current.map((node) =>
        node.selected ? { ...node, selected: false } : node,
      ),
    );
  }, [setNodes]);

  const autoArrange = useCallback(() => {
    setNodes((current) => autoLayout(current, edges));
    requestAnimationFrame(() => void fitView({ duration: 250 }));
  }, [edges, fitView, setNodes]);

  const persist = useCallback(async () => {
    const saved = await patchMutation.mutateAsync({
      id: flowId,
      body: {
        name: name.trim() || (flow?.name ?? ''),
        triggerKeywords,
        nodes: toApiNodes(nodes),
        edges: toApiEdges(edges),
      },
    });
    // Adopt the server's normalisation (trimmed name, de-duped keywords) so the
    // dirty check settles.
    setName(saved.name);
    setTriggerKeywords(saved.triggerKeywords);
    return saved;
  }, [patchMutation, flowId, name, flow?.name, triggerKeywords, nodes, edges]);

  const save = useCallback(async () => {
    try {
      await persist();
      toast.success(t('flows.saved', 'Flow saved'));
    } catch (error) {
      toast.error(error);
    }
  }, [persist, t]);

  const activate = useCallback(async () => {
    setShowIssues(true);
    if (allIssues.length > 0) {
      toast.error(
        t('flows.issue.blocked', {
          count: allIssues.length,
          defaultValue: 'Fix {{count}} issues before activating this flow.',
          defaultValue_one: 'Fix one issue before activating this flow.',
        }),
      );
      return;
    }
    try {
      if (isDirty) await persist();
      await activateMutation.mutateAsync(flowId);
      toast.success(t('flows.activated', 'Flow is live'));
    } catch (error) {
      toast.error(error);
    }
  }, [allIssues, isDirty, persist, activateMutation, flowId, t]);

  const deactivate = useCallback(async () => {
    try {
      await deactivateMutation.mutateAsync(flowId);
      toast.success(t('flows.deactivated', 'Flow paused'));
    } catch (error) {
      toast.error(error);
    }
  }, [deactivateMutation, flowId, t]);

  return {
    flow,
    isLoading: flowQuery.isLoading,
    isError: flowQuery.isError,
    error: flowQuery.error,

    nodes: displayNodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDragOver,
    onDrop,

    name,
    setName,
    triggerKeywords,
    setTriggerKeywords,

    selectedNode,
    updateNodeData,
    deleteNode,
    clearSelection,
    hasTrigger,

    isDirty,
    issues,
    autoArrange,
    save,
    activate,
    deactivate,
    isSaving: patchMutation.isPending,
    isActivating: activateMutation.isPending,
    isDeactivating: deactivateMutation.isPending,
  };
}
