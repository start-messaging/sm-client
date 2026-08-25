import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { hasFeature } from '@/lib/plan';
import { ConfigPanel } from './flow-editor/ConfigPanel';
import { EditorTopBar } from './flow-editor/EditorTopBar';
import { NodePalette } from './flow-editor/NodePalette';
import { nodeTypes } from './flow-editor/node-types';
import { useFlowEditor } from './flow-editor/use-flow-editor';

function FlowEditor({ flowId }: { flowId: string }) {
  const { t } = useTranslation();
  const workspace = useCurrentWorkspace();
  const editor = useFlowEditor(workspace.slug, flowId);

  if (editor.isLoading) {
    return (
      <div className="grid flex-1 place-items-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (!editor.flow) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-[13px] text-[#71717a]">
          {t('flows.not_found', 'This flow no longer exists.')}
        </p>
        <Button size="sm" variant="outline" asChild>
          <Link to={`/w/${workspace.slug}/automations`}>
            {t('flows.back_to_list', 'Back to automations')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <EditorTopBar
        slug={workspace.slug}
        status={editor.flow.status}
        name={editor.name}
        onNameChange={editor.setName}
        isDirty={editor.isDirty}
        isSaving={editor.isSaving}
        isActivating={editor.isActivating}
        isDeactivating={editor.isDeactivating}
        canActivate={hasFeature(workspace, 'chatbot_flows')}
        issues={editor.issues}
        onAutoArrange={editor.autoArrange}
        onSave={() => void editor.save()}
        onActivate={() => void editor.activate()}
        onDeactivate={() => void editor.deactivate()}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <NodePalette triggerPlaced={editor.hasTrigger} />

        <ReactFlow
          nodes={editor.nodes}
          edges={editor.edges}
          nodeTypes={nodeTypes}
          onNodesChange={editor.onNodesChange}
          onEdgesChange={editor.onEdgesChange}
          onConnect={editor.onConnect}
          onDrop={editor.onDrop}
          onDragOver={editor.onDragOver}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
          className="flex-1"
          fitView
        >
          <Background variant={BackgroundVariant.Dots} color="#e4e4e7" />
          <Controls />
          <MiniMap style={{ background: '#f4f4f5' }} />
        </ReactFlow>

        <ConfigPanel
          selectedNode={editor.selectedNode}
          triggerType={editor.triggerType}
          triggerKeywords={editor.triggerKeywords}
          onTriggerTypeChange={editor.setTriggerType}
          onTriggerKeywordsChange={editor.setTriggerKeywords}
          onDataChange={editor.updateNodeData}
          onDeleteNode={editor.deleteNode}
          onClose={editor.clearSelection}
        />
      </div>
    </>
  );
}

/**
 * The flow canvas. It bleeds past the workspace shell's padding to use the
 * whole viewport below the header — a canvas with a gutter reads as broken.
 */
export function FlowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const workspace = useCurrentWorkspace();

  return (
    <div className="-m-6 flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      {id ? (
        <ReactFlowProvider>
          <FlowEditor flowId={id} />
        </ReactFlowProvider>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-[13px] text-[#71717a]">
            {t('flows.not_found', 'This flow no longer exists.')}
          </p>
          <Button size="sm" variant="outline" asChild>
            <Link to={`/w/${workspace.slug}/automations`}>
              {t('flows.back_to_list', 'Back to automations')}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default FlowEditorPage;
