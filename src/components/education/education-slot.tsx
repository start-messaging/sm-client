import type { ReactNode } from 'react';
import { BookOpen, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface EducationSlotProps {
  /** Short, punchy title for this educational unit. */
  title: string;
  /** 1–3 sentence explanation of what this page/flow does and why it matters. */
  body: ReactNode;
  /**
   * Optional YouTube / Loom embed URL. When present, an iframe appears below
   * the body copy. Prefer unlisted YouTube or Loom free until high-traffic
   * (then migrate to R2 + Cloudflare Stream).
   */
  embedUrl?: string;
  /** Link to external docs page (e.g. Meta docs or our own help centre). */
  docsUrl?: string;
  /** Extra class names on the outer card. */
  className?: string;
}

/**
 * The one way to attach educational context to any page or flow. Every new
 * product surface ships with an EducationSlot so users always understand
 * "what is this / why does it matter" before they act.
 *
 * Upgrade path: text → docsUrl → embedUrl → R2 video (just swap the URL).
 */
export function EducationSlot({
  title,
  body,
  embedUrl,
  docsUrl,
  className,
}: EducationSlotProps) {
  const { t } = useTranslation();

  return (
    <Card className={cn('border-blue-100 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-foreground/80 text-sm leading-relaxed">
          {body}
        </CardDescription>
      </CardHeader>

      {(embedUrl || docsUrl) && (
        <CardContent className="flex flex-wrap gap-2 pt-0">
          {docsUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={docsUrl} target="_blank" rel="noopener noreferrer">
                <BookOpen className="mr-1.5 size-3.5" />
                {t('education.slot.docsLabel')}
              </a>
            </Button>
          )}
          {embedUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={embedUrl} target="_blank" rel="noopener noreferrer">
                <Play className="mr-1.5 size-3.5" />
                {t('education.slot.videoLabel')}
              </a>
            </Button>
          )}
        </CardContent>
      )}

      {embedUrl && (
        <CardContent className="pt-0">
          <div className="relative aspect-video w-full overflow-hidden rounded-md">
            <iframe
              src={embedUrl}
              title={title}
              className="absolute inset-0 size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
