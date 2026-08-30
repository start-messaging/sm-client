import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useMetaFlows, useSyncMetaFlows } from '@/api/hooks/use-meta-flows';

const STATUS_BADGE: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-700',
  DRAFT: 'bg-zinc-100 text-zinc-600',
  DEPRECATED: 'bg-yellow-100 text-yellow-700',
  BLOCKED: 'bg-red-100 text-red-700',
  THROTTLED: 'bg-orange-100 text-orange-700',
};

export function MetaFlowsPage() {
  const { data: flows = [], isLoading } = useMetaFlows();
  const sync = useSyncMetaFlows();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-[15px] font-semibold text-[#18181b]">WhatsApp Flows</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Flows created in Meta Business Manager. Use them in template buttons.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
          >
            {sync.isPending ? (
              <Spinner className="size-3.5 mr-1.5" />
            ) : (
              <RefreshCw className="size-3.5 mr-1.5" />
            )}
            Sync from Meta
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://business.facebook.com/wa/manage/flows/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-3.5 mr-1.5" />
              Open Meta Flow Builder
            </a>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading…
        </div>
      ) : flows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-[#18181b]">No flows synced yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create flows in{' '}
            <a
              href="https://business.facebook.com/wa/manage/flows/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Meta Business Manager
            </a>
            , then click &quot;Sync from Meta&quot;.
          </p>
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {flows.map((flow) => (
            <div key={flow.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#18181b] truncate">{flow.name}</p>
                <p className="text-xs text-muted-foreground">ID: {flow.metaFlowId}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {flow.categories.map((c) => (
                  <span key={c} className="text-xs text-muted-foreground">{c}</span>
                ))}
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[flow.status] ?? 'bg-zinc-100 text-zinc-600'}`}
                >
                  {flow.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {flows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Last synced: {new Date(flows[0].syncedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
