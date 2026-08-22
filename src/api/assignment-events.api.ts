import { apiGet } from '@/lib/http';

const v1 = (path: string) => `/v1${path}`;

// Server DTO from GET .../assignment-events (agent B).
export type AssignmentAction =
  | 'ASSIGN'
  | 'CLAIM'
  | 'UNASSIGN'
  | 'TAKEOVER'
  | 'RESOLVE'
  | 'REOPEN';

export type AssignmentEventKind =
  | 'assigned'
  | 'claimed'
  | 'unassigned'
  | 'takeover'
  | 'resolved'
  | 'reopened';

export interface AssignmentEventDto {
  id: string;
  action: AssignmentAction;
  actorUserId: string | null;
  fromUserId: string | null;
  toUserId: string | null;
  createdAt: string;
}

/** Display shape used by the transcript (kind + resolved names). */
export interface WaAssignmentEvent {
  id: string;
  kind: AssignmentEventKind;
  actorName: string | null;
  targetName: string | null;
  prevName: string | null;
  createdAt: string;
}

export interface AssignmentEventListResult {
  events: AssignmentEventDto[];
}

const ACTION_TO_KIND: Record<AssignmentAction, AssignmentEventKind> = {
  ASSIGN: 'assigned',
  CLAIM: 'claimed',
  UNASSIGN: 'unassigned',
  TAKEOVER: 'takeover',
  RESOLVE: 'resolved',
  REOPEN: 'reopened',
};

export function toAssignmentEventView(
  dto: AssignmentEventDto,
  names: Record<string, string>,
): WaAssignmentEvent {
  const targetId = dto.action === 'UNASSIGN' ? dto.fromUserId : dto.toUserId;
  return {
    id: dto.id,
    kind: ACTION_TO_KIND[dto.action] ?? 'assigned',
    actorName: dto.actorUserId ? (names[dto.actorUserId] ?? null) : null,
    targetName: targetId ? (names[targetId] ?? null) : null,
    prevName: dto.fromUserId ? (names[dto.fromUserId] ?? null) : null,
    createdAt: dto.createdAt,
  };
}

export const assignmentEventsApi = {
  list: (slug: string, conversationId: string) =>
    apiGet<AssignmentEventListResult>(
      v1(
        `/workspaces/${slug}/whatsapp/conversations/${conversationId}/assignment-events`,
      ),
    ),
};
