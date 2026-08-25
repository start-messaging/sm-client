import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';

export type FlowStatus = 'draft' | 'active' | 'inactive';
export type FlowTriggerType = 'first_message' | 'any_inbound' | 'keyword';
export type FlowNodeType =
  | 'trigger'
  | 'send_message'
  | 'wait_for_reply'
  | 'button_branch'
  | 'list_branch'
  | 'condition'
  | 'set_field'
  | 'add_tag'
  | 'remove_tag'
  | 'change_stage'
  | 'assign_agent'
  | 'end';

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  sourceHandle: string | null;
  target: string;
  targetHandle: string | null;
}

export interface WaFlow {
  id: string;
  name: string;
  description: string | null;
  status: FlowStatus;
  triggerType: FlowTriggerType;
  triggerKeywords: string[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlowBody {
  name: string;
  description?: string;
  triggerType: FlowTriggerType;
  triggerKeywords?: string[];
}

export interface PatchFlowBody extends Partial<CreateFlowBody> {
  nodes?: FlowNode[];
  edges?: FlowEdge[];
}

export interface FlowListResult {
  flows: WaFlow[];
  total: number;
}

export const flowsApi = {
  list: (slug: string) => apiGet<FlowListResult>(endpoints.flows.list(slug)),
  create: (slug: string, body: CreateFlowBody) =>
    apiPost<WaFlow>(endpoints.flows.create(slug), body),
  get: (slug: string, id: string) =>
    apiGet<WaFlow>(endpoints.flows.get(slug, id)),
  patch: (slug: string, id: string, body: PatchFlowBody) =>
    apiPatch<WaFlow>(endpoints.flows.patch(slug, id), body),
  delete: (slug: string, id: string) =>
    apiDelete<void>(endpoints.flows.delete(slug, id)),
  activate: (slug: string, id: string) =>
    apiPost<WaFlow>(endpoints.flows.activate(slug, id), {}),
  deactivate: (slug: string, id: string) =>
    apiPost<WaFlow>(endpoints.flows.deactivate(slug, id), {}),
};
