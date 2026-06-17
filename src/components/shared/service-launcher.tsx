import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Grip, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useMyWorkspaces } from '@/api/hooks/use-workspaces';
import { useAvailableServices } from '@/api/hooks/use-services';
import { cn } from '@/lib/utils';
import type { WorkspaceSummary } from '@/types/api';

/**
 * The 9-dot launcher (top right, Google-apps style). Desktop: hovering opens a
 * quick panel of MY services with my workspaces grouped under each; clicking
 * the icon jumps to the full gallery (/services). Touch: the tap goes straight
 * to the gallery — the panel is a hover shortcut, never the only path.
 */
export function ServiceLauncher() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug: activeSlug } = useParams();
  const [open, setOpen] = useState(false);
  const { data: workspaces } = useMyWorkspaces();
  const { data: services } = useAvailableServices();

  // Hover with a grace period: the popover sits a few px from the trigger, so
  // an instant close on mouseleave would flicker (or lose the panel) while the
  // pointer crosses the gap. Either element re-entering cancels the close.
  const closeTimer = useRef<number | null>(null);
  const hoverOpen = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hoverClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 200);
  };
  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  const groups = useMemo(() => {
    const byService = new Map<string, WorkspaceSummary[]>();
    for (const ws of workspaces ?? []) {
      const list = byService.get(ws.serviceKey) ?? [];
      list.push(ws);
      byService.set(ws.serviceKey, list);
    }
    return [...byService.entries()];
  }, [workspaces]);

  const serviceName = (key: string) =>
    services?.find((s) => s.key === key)?.name ?? key;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('launcher.aria')}
          onMouseEnter={hoverOpen}
          onMouseLeave={hoverClose}
          onClick={(e) => {
            // preventDefault stops Radix's own open-toggle from re-opening
            // the panel after we navigate (keyboard/touch activation).
            e.preventDefault();
            setOpen(false);
            void navigate('/services');
          }}
        >
          <Grip className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 p-2"
        onMouseEnter={hoverOpen}
        onMouseLeave={hoverClose}
      >
        {groups.length > 0 && (
          <div className="flex flex-col gap-2">
            {groups.map(([serviceKey, list]) => (
              <div key={serviceKey}>
                <p className="text-muted-foreground px-2 pb-1 text-xs font-medium tracking-wide uppercase">
                  {serviceName(serviceKey)}
                </p>
                <div className="flex flex-col">
                  {list.map((ws) => (
                    <Link
                      key={ws.id}
                      to={`/w/${ws.slug}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'hover:bg-accent rounded-md px-2 py-1.5 text-sm',
                        ws.slug === activeSlug && 'bg-accent font-medium',
                      )}
                    >
                      {ws.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <Separator />
          </div>
        )}
        <Link
          to="/services"
          onClick={() => setOpen(false)}
          className="hover:bg-accent text-primary flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium"
        >
          <LayoutGrid className="size-4" />
          {t('launcher.allServices')}
        </Link>
      </PopoverContent>
    </Popover>
  );
}
