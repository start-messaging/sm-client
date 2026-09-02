import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WaMessagePreview } from '@/components/whatsapp/wa-message-preview';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog';
import { useTemplates } from '@/api/hooks/use-templates';
import { useContacts } from '@/api/hooks/use-contacts';
import { useFlows } from '@/api/hooks/use-flows';
import {
  useCampaign,
  useCreateCampaign,
  useLaunchCampaign,
  useUpdateCampaign,
  useUploadCampaignAudienceCsv,
  useLastMarketingSend,
} from '@/api/hooks/use-campaigns';
import { parseCsv, readFileAsText } from '@/lib/csv';
import { toast } from '@/lib/toast';
import type { Campaign } from '@/api/campaigns.api';
import type { TemplateComponent, WaTemplate } from '@/api/templates.api';
import type { WaContact } from '@/api/contacts.api';

type AudienceMode = 'contacts' | 'csv';

const _moduleLoadTime = Date.now();

function extractBodyVars(components: TemplateComponent[]): number[] {
  const body = components.find((c) => c.type === 'BODY');
  if (!body?.text) return [];
  const matches = [...body.text.matchAll(/\{\{(\d+)\}\}/g)];
  const nums = [...new Set(matches.map((m) => parseInt(m[1], 10)))];
  return nums.sort((a, b) => a - b);
}

function componentText(
  components: TemplateComponent[],
  type: 'HEADER' | 'BODY' | 'FOOTER',
): string {
  return components.find((c) => c.type === type)?.text ?? '';
}

type VarMappingType = 'name' | 'phone' | 'attr' | 'text';
const TAG_FILTER_ALL = '__all__';

interface VarMappingEntry {
  type: VarMappingType;
  attrKey: string;
}

const schema = z.object({
  name: z.string().min(1, 'campaigns.create.nameRequired'),
  templateId: z.string().min(1, 'campaigns.create.templateRequired'),
  // Audience is required on step 2, not here — otherwise Next on Message
  // runs the full schema against an empty list.
  audienceIds: z.array(z.string()),
});
type FormValues = z.infer<typeof schema>;

function isMappingComplete(
  vars: number[],
  mapping: Record<string, VarMappingEntry>,
): boolean {
  if (vars.length === 0) return true;
  return vars.every((n) => {
    const entry = mapping[String(n)];
    if (!entry) return false;
    if (entry.type === 'attr' || entry.type === 'text') {
      return (entry.attrKey ?? '').trim().length > 0;
    }
    return entry.type === 'name' || entry.type === 'phone';
  });
}

function parseServerVarMapping(value: string): VarMappingEntry {
  if (value === 'name') return { type: 'name', attrKey: '' };
  if (value === 'phone') return { type: 'phone', attrKey: '' };
  if (value.startsWith('text:')) {
    return { type: 'text', attrKey: value.slice('text:'.length) };
  }
  const attrKey = value.startsWith('attr:')
    ? value.slice('attr:'.length)
    : value;
  return { type: 'attr', attrKey };
}

function contactHasAttribute(contact: WaContact, key: string): boolean {
  const raw = contact.attributes?.[key];
  if (raw == null) return false;
  return String(raw).trim().length > 0;
}

function VarMappingRow({
  index,
  value,
  onChange,
}: {
  index: number;
  value: VarMappingEntry | undefined;
  onChange: (val: VarMappingEntry) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-12 shrink-0 font-mono text-sm">
        {`{{${index}}}`}
      </span>
      <Select
        value={value?.type}
        onValueChange={(v) => {
          if (v !== 'name' && v !== 'phone' && v !== 'attr' && v !== 'text') {
            return;
          }
          onChange({
            type: v,
            attrKey: v === 'attr' || v === 'text' ? (value?.attrKey ?? '') : '',
          });
        }}
      >
        <SelectTrigger className="h-8 flex-1 text-sm">
          <SelectValue placeholder={t('campaigns.create.varMapPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">{t('campaigns.create.varName')}</SelectItem>
          <SelectItem value="phone">
            {t('campaigns.create.varPhone')}
          </SelectItem>
          <SelectItem value="text">{t('campaigns.create.varText')}</SelectItem>
          <SelectItem value="attr">{t('campaigns.create.varAttr')}</SelectItem>
        </SelectContent>
      </Select>
      {(value?.type === 'attr' || value?.type === 'text') && (
        <Input
          className="h-8 flex-1 text-sm"
          placeholder={
            value.type === 'text'
              ? t('campaigns.create.varTextValue')
              : t('campaigns.create.varAttrKey')
          }
          value={value.attrKey ?? ''}
          onChange={(e) =>
            onChange({ type: value.type, attrKey: e.target.value })
          }
        />
      )}
    </div>
  );
}

// ── Shared header-media input (file upload + URL) ────────────────────────────

const HEADER_MEDIA_ACCEPT: Record<string, string> = {
  IMAGE: 'image/jpeg,image/png,image/webp,image/gif',
  VIDEO: 'video/mp4,video/3gpp',
  DOCUMENT:
    'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function HeaderMediaField({
  format,
  file,
  url,
  blobUrl,
  fileInputRef,
  onFileChange,
  onUrlChange,
  onClear,
}: {
  format: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  file: File | null;
  url: string;
  blobUrl: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (f: File | null) => void;
  onUrlChange: (u: string) => void;
  onClear: () => void;
}) {
  const label =
    format === 'IMAGE' ? 'Header image' : format === 'VIDEO' ? 'Header video' : 'Header document';
  const previewSrc = blobUrl || (url.trim() ? url.trim() : '');

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <p className="text-xs text-muted-foreground">
        Upload a file or paste a public URL. The server uploads files to R2 when you send.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={HEADER_MEDIA_ACCEPT[format]}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (fileInputRef.current) fileInputRef.current.value = '';
          onFileChange(f);
        }}
      />
      <div className="flex gap-2">
        <Input
          placeholder="https://example.com/image.jpg"
          value={file ? file.name : url}
          readOnly={!!file}
          onChange={(e) => onUrlChange(e.target.value)}
          className="flex-1 text-sm"
        />
        {(file || url.trim()) ? (
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            <X className="size-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1.5 size-3.5" />
            Upload
          </Button>
        )}
      </div>
      {previewSrc && format === 'IMAGE' && (
        <img
          src={previewSrc}
          alt="header preview"
          className="max-h-32 w-auto rounded border object-cover"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
      {previewSrc && format === 'VIDEO' && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={previewSrc} controls className="max-h-32 w-auto rounded border" preload="metadata" />
      )}
      {file && format === 'DOCUMENT' && (
        <p className="text-xs text-muted-foreground">{file.name}</p>
      )}
    </div>
  );
}

export function CreateCampaignPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editCampaignId = searchParams.get('edit') ?? '';
  const isEditMode = editCampaignId.length > 0;
  const ws = useCurrentWorkspace();
  const { data: tplData } = useTemplates(ws.slug);
  const { data: contactsData } = useContacts(ws.slug);
  const { data: flowsData } = useFlows(ws.slug);
  const { data: editCampaign, isLoading: editCampaignLoading } = useCampaign(
    ws.slug,
    editCampaignId,
  );
  const createMutation = useCreateCampaign(ws.slug);
  const updateMutation = useUpdateCampaign(ws.slug);
  const launchMutation = useLaunchCampaign(ws.slug);
  const uploadAudienceCsvMutation = useUploadCampaignAudienceCsv(ws.slug);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [editHydrated, setEditHydrated] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showOptedOut, setShowOptedOut] = useState(false);
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('contacts');
  const [csvFileName, setCsvFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvError, setCsvError] = useState('');
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [varMapping, setVarMapping] = useState<Record<string, VarMappingEntry>>(
    {},
  );
  // Kept in sync inside writeVarMapping (the only place varMapping changes),
  // never assigned at render time — updating a ref during render is unsafe.
  const varMappingRef = useRef(varMapping);
  const [mappingError, setMappingError] = useState('');
  const [flowId, setFlowId] = useState<string | null>(null);
  const [headerMediaFile, setHeaderMediaFile] = useState<File | null>(null);
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const headerMediaInputRef = useRef<HTMLInputElement>(null);
  // Blob URL for local preview — revoked on cleanup / file change
  const [headerBlobUrl, setHeaderBlobUrl] = useState('');

  const listPath = `/w/${ws.slug}/campaigns`;

  const approvedTemplates: WaTemplate[] = useMemo(
    () => (tplData?.templates ?? []).filter((tpl) => tpl.status === 'APPROVED'),
    [tplData],
  );
  const activeFlows = useMemo(
    () => (flowsData?.flows ?? []).filter((f) => f.status === 'active'),
    [flowsData],
  );
  const allContacts = contactsData?.contacts ?? [];

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allContacts.forEach((c) => c.tags.forEach((tag) => tagSet.add(tag)));
    return [...tagSet].sort();
  }, [allContacts]);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', templateId: '', audienceIds: [] },
  });

  const templateId = useWatch({ control, name: 'templateId' });
  const campaignName = useWatch({ control, name: 'name' });
  const audienceIds = useWatch({ control, name: 'audienceIds' }) ?? [];

  const extraDirtyKey = JSON.stringify({
    varMapping,
    audienceMode,
    csvFileName,
    flowId,
    headerMediaUrl,
    headerFile: headerMediaFile?.name ?? '',
  });
  const initialExtra = useRef<string | null>(null);
  useEffect(() => {
    if (isEditMode && !editHydrated) return;
    if (initialExtra.current === null) initialExtra.current = extraDirtyKey;
  }, [isEditMode, editHydrated, extraDirtyKey]);
  const extraDirty =
    initialExtra.current !== null && extraDirtyKey !== initialExtra.current;
  const blocker = useUnsavedChanges(
    (isDirty || extraDirty) &&
      !createMutation.isPending &&
      !updateMutation.isPending &&
      !launchMutation.isPending,
  );

  const selectedTemplate = approvedTemplates.find((x) => x.id === templateId);
  const isMarketingTemplate = selectedTemplate?.category === 'MARKETING';
  const templateHeaderMediaFormat = selectedTemplate?.components
    .find((c) => c.type === 'HEADER' && c.format && c.format !== 'TEXT')
    ?.format as 'IMAGE' | 'VIDEO' | 'DOCUMENT' | undefined;

  const { data: lastMarketingSendData } = useLastMarketingSend(
    ws.slug,
    isMarketingTemplate,
  );

  const marketingSpacingHoursAgo = useMemo(() => {
    if (!lastMarketingSendData?.lastSentAt) return null;
    const diffMs = _moduleLoadTime - new Date(lastMarketingSendData.lastSentAt).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return diffHours < 48 ? diffHours : null;
  }, [lastMarketingSendData]);

  const templateVars = selectedTemplate
    ? extractBodyVars(selectedTemplate.components)
    : [];

  const visibleContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allContacts.filter((c) => {
      if (!showOptedOut && !c.optedIn) return false;
      if (tagFilter && !c.tags.includes(tagFilter)) return false;
      if (!q) return true;
      return (
        (c.name ?? '').toLowerCase().includes(q) ||
        c.phoneE164.toLowerCase().includes(q)
      );
    });
  }, [allContacts, showOptedOut, tagFilter, search]);

  const optedInVisible = visibleContacts.filter((c) => c.optedIn);

  function writeVarMapping(
    updater: (
      prev: Record<string, VarMappingEntry>,
    ) => Record<string, VarMappingEntry>,
  ) {
    setVarMapping((prev) => {
      const next = updater(prev);
      varMappingRef.current = next;
      return next;
    });
  }

  function buildVarMappingPayload(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, entry] of Object.entries(varMappingRef.current)) {
      if (entry.type === 'name') result[key] = 'name';
      else if (entry.type === 'phone') result[key] = 'phone';
      else if (entry.type === 'attr' && (entry.attrKey ?? '').trim())
        result[key] = entry.attrKey.trim();
      else if (entry.type === 'text' && (entry.attrKey ?? '').trim())
        result[key] = `text:${entry.attrKey.trim()}`;
    }
    return result;
  }

  useEffect(() => {
    if (!isEditMode || !editCampaign || editHydrated) return;
    if (approvedTemplates.length === 0 && tplData !== undefined) return;

    setValue('name', editCampaign.name);
    const tpl = approvedTemplates.find(
      (x) =>
        x.name === editCampaign.templateName &&
        x.language === editCampaign.templateLanguage,
    );
    if (tpl) setValue('templateId', tpl.id);
    setValue('audienceIds', editCampaign.audienceIds ?? []);

    const mapping: Record<string, VarMappingEntry> = {};
    for (const [key, value] of Object.entries(
      editCampaign.variableMapping ?? {},
    )) {
      mapping[key] = parseServerVarMapping(value);
    }
    writeVarMapping(() => mapping);

    setFlowId(editCampaign.flowId ?? null);
    setHeaderMediaUrl(editCampaign.headerMediaUrl ?? '');

    if ((editCampaign.audienceCsv?.length ?? 0) > 0) {
      setAudienceMode('csv');
      setCsvFileName(
        t('campaigns.wizard.csv.existingAudience', 'Saved CSV audience'),
      );
      const rows = editCampaign.audienceCsv!.map((entry) => ({
        phone: entry.phoneE164,
        ...(entry.name ? { name: entry.name } : {}),
        ...(entry.attrs ?? {}),
      }));
      const headerSet = new Set<string>();
      for (const row of rows) {
        for (const key of Object.keys(row)) headerSet.add(key);
      }
      setCsvHeaders(['phone', ...[...headerSet].filter((h) => h !== 'phone')]);
      setCsvRows(rows);
    }

    setEditHydrated(true);
  }, [
    isEditMode,
    editCampaign,
    editHydrated,
    approvedTemplates,
    tplData,
    setValue,
    t,
  ]);

  function toggleContact(id: string, checked: boolean) {
    setValue(
      'audienceIds',
      checked ? [...audienceIds, id] : audienceIds.filter((x) => x !== id),
      { shouldValidate: true },
    );
  }

  function selectAllVisible() {
    const ids = new Set(audienceIds);
    for (const c of optedInVisible) ids.add(c.id);
    setValue('audienceIds', [...ids], { shouldValidate: true });
  }

  async function goNextFromMessage() {
    const ok = await trigger(['name', 'templateId']);
    if (!ok) return;
    if (!isMappingComplete(templateVars, varMappingRef.current)) {
      setMappingError(t('campaigns.create.mappingRequired'));
      return;
    }
    setStep(2);
  }

  async function handleCsvFile(file: File) {
    setCsvError('');
    let parsed: { headers: string[]; rows: Record<string, string>[] };
    try {
      parsed = parseCsv(await readFileAsText(file));
    } catch {
      setCsvHeaders([]);
      setCsvRows([]);
      setCsvError(t('campaigns.wizard.csv.errorParsing'));
      return;
    }
    if (!parsed.headers.includes('phone')) {
      setCsvHeaders([]);
      setCsvRows([]);
      setCsvError(t('campaigns.wizard.csv.missingPhoneColumn'));
      return;
    }
    if (parsed.rows.length === 0) {
      setCsvHeaders([]);
      setCsvRows([]);
      setCsvError(t('campaigns.wizard.csv.emptyFile'));
      return;
    }
    setCsvFileName(file.name);
    setCsvHeaders(parsed.headers);
    setCsvRows(parsed.rows);
  }

  function goNextFromAudience() {
    if (audienceMode === 'csv') {
      if (csvError || csvRows.length === 0) {
        toast.error(t('campaigns.wizard.csv.rowsRequired'));
        return;
      }
      setStep(3);
      return;
    }
    const optedInIds = audienceIds.filter(
      (id) => allContacts.find((c) => c.id === id)?.optedIn === true,
    );
    if (optedInIds.length === 0) {
      toast.error(t('campaigns.create.audienceOptedInRequired'));
      return;
    }
    setValue('audienceIds', optedInIds);
    setStep(3);
  }

  async function submit(launch: boolean) {
    if (!selectedTemplate) return;

    let audienceIdsForSave: string[] = [];
    if (audienceMode === 'csv') {
      if (csvRows.length === 0) {
        toast.error(t('campaigns.wizard.csv.rowsRequired'));
        return;
      }
    } else {
      const optedInIds = audienceIds.filter(
        (id) => allContacts.find((c) => c.id === id)?.optedIn === true,
      );
      if (optedInIds.length === 0) {
        toast.error(t('campaigns.create.audienceOptedInRequired'));
        return;
      }
      audienceIdsForSave = optedInIds;
    }

    const variableMapping = buildVarMappingPayload();
    const sharedPayload = {
      name: campaignName.trim(),
      templateName: selectedTemplate.name,
      templateLanguage: selectedTemplate.language,
      audienceIds: audienceIdsForSave,
      variableMapping,
    };

    try {
      let campaign: Campaign;
      if (isEditMode) {
        campaign = (await updateMutation.mutateAsync({
          id: editCampaignId,
          body: {
            ...sharedPayload,
            flowId: flowId ?? null,
            ...(headerMediaUrl.trim() && !headerMediaFile
              ? { headerMediaUrl: headerMediaUrl.trim() }
              : {}),
          },
        })) as Campaign;
      } else {
        campaign = (await createMutation.mutateAsync({
          ...sharedPayload,
          ...(flowId ? { flowId } : {}),
          ...(headerMediaFile ? { _headerMediaFile: headerMediaFile } : {}),
          ...(headerMediaUrl.trim() && !headerMediaFile
            ? { headerMediaUrl: headerMediaUrl.trim() }
            : {}),
        })) as Campaign;
      }

      if (audienceMode === 'csv') {
        await uploadAudienceCsvMutation.mutateAsync({
          id: campaign.id,
          rows: csvRows,
        });
      }

      if (launch) {
        await launchMutation.mutateAsync(campaign.id);
        toast.success(t('campaigns.launched'));
      } else {
        toast.success(
          isEditMode
            ? t('campaigns.edit.success', 'Campaign updated')
            : t('campaigns.create.success'),
        );
      }
      navigate(listPath);
    } catch (err) {
      toast.error(err);
    }
  }

  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    launchMutation.isPending ||
    uploadAudienceCsvMutation.isPending;
  const selectedContacts: WaContact[] = audienceIds
    .map((id) => allContacts.find((c) => c.id === id))
    .filter((c): c is WaContact => Boolean(c));

  const attributeWarnings = useMemo(() => {
    if (audienceMode !== 'contacts' || audienceIds.length === 0) return [];
    const warnings: { varIndex: number; key: string }[] = [];
    for (const n of templateVars) {
      const entry = varMapping[String(n)];
      if (entry?.type !== 'attr' || !(entry.attrKey ?? '').trim()) continue;
      const key = entry.attrKey.trim();
      const missing = selectedContacts.some((c) => !contactHasAttribute(c, key));
      if (missing) warnings.push({ varIndex: n, key });
    }
    return warnings;
  }, [audienceMode, audienceIds.length, templateVars, varMapping, selectedContacts]);

  if (isEditMode && editCampaignLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <UnsavedChangesDialog blocker={blocker} />
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2" asChild>
          <Link to={listPath}>
            <ArrowLeft className="mr-1.5 size-3.5" />
            {t('campaigns.wizard.back', 'All campaigns')}
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEditMode
            ? t('campaigns.edit.title', 'Edit Campaign')
            : t('campaigns.create.title')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t('campaigns.create.subtitle')}
        </p>
      </div>

      <ol className="text-muted-foreground flex gap-4 text-sm">
        {([1, 2, 3] as const).map((n) => (
          <li
            key={n}
            className={n === step ? 'text-foreground font-medium' : undefined}
          >
            {n}.{' '}
            {n === 1
              ? isEditMode
                ? t('campaigns.edit.stepMessage', 'Edit Campaign')
                : t('campaigns.wizard.stepMessage', 'Message')
              : n === 2
                ? t('campaigns.wizard.stepAudience', 'Audience')
                : t('campaigns.wizard.stepReview', 'Review')}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="cc-name">
                {t('campaigns.create.name')}
              </FieldLabel>
              <Input
                id="cc-name"
                placeholder={t('campaigns.create.namePlaceholder')}
                {...register('name')}
              />
              {errors.name && (
                <FieldError>{t(errors.name.message ?? '')}</FieldError>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>{t('campaigns.create.template')}</FieldLabel>
              <Controller
                name="templateId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={(v) => {
                      if (v !== field.value) {
                        writeVarMapping(() => ({}));
                        setMappingError('');
                        setHeaderMediaFile(null);
                        setHeaderMediaUrl('');
                        if (headerBlobUrl) { URL.revokeObjectURL(headerBlobUrl); setHeaderBlobUrl(''); }
                      }
                      field.onChange(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('campaigns.create.templatePlaceholder')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {approvedTemplates.length === 0 ? (
                        <div className="text-muted-foreground p-3 text-sm">
                          {t('campaigns.create.noApprovedTemplates')}
                        </div>
                      ) : (
                        approvedTemplates.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id}>
                            <span className="flex items-center gap-1.5">
                              {tpl.name}
                              {tpl.isCarousel && (
                                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0 text-[10px] font-medium">
                                  Carousel
                                </Badge>
                              )}
                              <span className="text-muted-foreground text-xs">
                                {tpl.language}
                              </span>
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.templateId && (
                <FieldError>{t(errors.templateId.message ?? '')}</FieldError>
              )}
              {marketingSpacingHoursAgo !== null && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    You sent a marketing campaign {marketingSpacingHoursAgo}h ago. Spacing campaigns ≥48h apart protects your number quality.
                  </span>
                </div>
              )}
              {selectedTemplate?.isCarousel && (
                <p className="text-muted-foreground text-xs">
                  {t('campaigns.carousel_template_note')}
                </p>
              )}
              {approvedTemplates.length === 0 && (
                <Button
                  variant="link"
                  className="h-auto justify-start p-0"
                  asChild
                >
                  <Link to={`/w/${ws.slug}/templates`}>
                    {t('campaigns.wizard.goTemplates', 'Go to Templates')}
                  </Link>
                </Button>
              )}
            </div>

            {templateVars.length > 0 && (
              <div className="flex flex-col gap-2">
                <FieldLabel>{t('campaigns.create.variableMapping')}</FieldLabel>
                <p className="text-muted-foreground text-xs">
                  {t('campaigns.create.variableMappingHint')}
                </p>
                {templateVars.map((n) => (
                  <VarMappingRow
                    key={n}
                    index={n}
                    value={varMapping[String(n)]}
                    onChange={(val) => {
                      setMappingError('');
                      writeVarMapping((prev) => ({
                        ...prev,
                        [String(n)]: val,
                      }));
                    }}
                  />
                ))}
                {mappingError && <FieldError>{mappingError}</FieldError>}
              </div>
            )}

            {activeFlows.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <FieldLabel>{t('campaigns.create.followUpFlow', 'Follow-up flow (optional)')}</FieldLabel>
                <p className="text-muted-foreground text-xs">
                  {t('campaigns.create.followUpFlowHint', 'After the campaign message is sent, enroll the contact in this flow for automated follow-up.')}
                </p>
                <Select
                  value={flowId ?? ''}
                  onValueChange={(v) => setFlowId(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('campaigns.create.followUpFlowNone', 'None — send once and stop')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('campaigns.create.followUpFlowNone', 'None — send once and stop')}</SelectItem>
                    {activeFlows.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {templateHeaderMediaFormat && (
              <HeaderMediaField
                format={templateHeaderMediaFormat}
                file={headerMediaFile}
                url={headerMediaUrl}
                blobUrl={headerBlobUrl}
                fileInputRef={headerMediaInputRef}
                onFileChange={(file) => {
                  if (headerBlobUrl) URL.revokeObjectURL(headerBlobUrl);
                  setHeaderMediaFile(file);
                  setHeaderMediaUrl('');
                  setHeaderBlobUrl(file ? URL.createObjectURL(file) : '');
                }}
                onUrlChange={(url) => {
                  if (headerBlobUrl) { URL.revokeObjectURL(headerBlobUrl); setHeaderBlobUrl(''); }
                  setHeaderMediaFile(null);
                  setHeaderMediaUrl(url);
                }}
                onClear={() => {
                  if (headerBlobUrl) { URL.revokeObjectURL(headerBlobUrl); setHeaderBlobUrl(''); }
                  setHeaderMediaFile(null);
                  setHeaderMediaUrl('');
                }}
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" asChild>
                <Link to={listPath}>{t('common.cancel')}</Link>
              </Button>
              <Button type="button" onClick={() => void goNextFromMessage()}>
                {t('campaigns.wizard.next', 'Next')}
              </Button>
            </div>
          </div>

          {selectedTemplate && (
            <aside className="hidden w-72 shrink-0 lg:block">
              <WaMessagePreview
                headerText={
                  selectedTemplate.components.find(
                    (c) => c.type === 'HEADER' && c.format === 'TEXT',
                  )?.text
                }
                headerMedia={(() => {
                  const h = selectedTemplate.components.find(
                    (c) => c.type === 'HEADER' && c.format && c.format !== 'TEXT',
                  );
                  return h?.format
                    ? { format: h.format }
                    : undefined;
                })()}
                bodyText={componentText(selectedTemplate.components, 'BODY')}
                footerText={componentText(
                  selectedTemplate.components,
                  'FOOTER',
                )}
                templateName={selectedTemplate.name}
                buttons={
                  selectedTemplate.buttons ??
                  selectedTemplate.components.find((c) => c.type === 'BUTTONS')
                    ?.buttons ??
                  []
                }
              />
            </aside>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <Tabs
            value={audienceMode}
            onValueChange={(v) => setAudienceMode(v as AudienceMode)}
          >
            <TabsList>
              <TabsTrigger value="contacts">
                {t('campaigns.wizard.tabContacts', 'From contacts')}
              </TabsTrigger>
              <TabsTrigger value="csv">
                {t('campaigns.wizard.tabCsv', 'Upload CSV')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contacts" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="h-8 max-w-xs text-sm"
                  placeholder={t(
                    'campaigns.wizard.searchAudience',
                    'Search name or phone…',
                  )}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {allTags.length > 0 && (
                  <Select
                    value={tagFilter || TAG_FILTER_ALL}
                    onValueChange={(v) =>
                      setTagFilter(v === TAG_FILTER_ALL ? '' : v)
                    }
                  >
                    <SelectTrigger className="h-8 w-40 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TAG_FILTER_ALL}>
                        {t('campaigns.create.allTags')}
                      </SelectItem>
                      {allTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <label className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={showOptedOut}
                    onCheckedChange={(v) => setShowOptedOut(Boolean(v))}
                  />
                  {t('campaigns.wizard.showOptedOut', 'Show opted-out')}
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-auto h-8"
                  onClick={selectAllVisible}
                >
                  {t('campaigns.wizard.selectAll', 'Select all opted-in')}
                </Button>
              </div>

              <p className="text-muted-foreground text-xs">
                {t('campaigns.create.selectedCount', {
                  count: audienceIds.length,
                })}
              </p>

              {selectedContacts.filter((c) => !c.optedIn).length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-300">
                  {t(
                    selectedContacts.filter((c) => !c.optedIn).length === 1
                      ? 'campaigns.opted_out_warning'
                      : 'campaigns.opted_out_warning_plural',
                    {
                      count: selectedContacts.filter((c) => !c.optedIn).length,
                    },
                  )}
                </div>
              )}

              {attributeWarnings.map(({ varIndex, key }) => (
                <div
                  key={`${varIndex}-${key}`}
                  className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-300"
                >
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {t(
                      'campaigns.create.missingAttributeWarning',
                      "Some contacts are missing the '{{key}}' attribute and will receive an empty value for variable {{var}}.",
                      { key, var: `{{${varIndex}}}` },
                    )}
                  </span>
                </div>
              ))}

              <div className="rounded-md border">
                {visibleContacts.length === 0 ? (
                  <p className="text-muted-foreground p-4 text-sm">
                    {t('campaigns.create.noContacts')}
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-muted-foreground text-left text-xs">
                      <tr>
                        <th className="w-10 px-3 py-2" />
                        <th className="px-3 py-2 font-medium">
                          {t('campaigns.wizard.colName', 'Name')}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t('campaigns.wizard.colPhone', 'Phone')}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t('campaigns.wizard.colTags', 'Tags')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleContacts.map((c) => (
                        <tr key={c.id} className="border-t">
                          <td className="px-3 py-2">
                            <Checkbox
                              checked={audienceIds.includes(c.id)}
                              disabled={!c.optedIn}
                              onCheckedChange={(checked) =>
                                toggleContact(c.id, Boolean(checked))
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            {c.name ?? '—'}
                            {!c.optedIn && (
                              <Badge
                                variant="outline"
                                className="ml-2 text-[10px]"
                              >
                                {t('campaigns.create.notOptedIn')}
                              </Badge>
                            )}
                          </td>
                          <td className="text-muted-foreground px-3 py-2 font-mono text-xs">
                            {c.phoneE164}
                          </td>
                          <td className="text-muted-foreground px-3 py-2 text-xs">
                            {c.tags.join(', ') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {errors.audienceIds && (
                <FieldError>{t(errors.audienceIds.message ?? '')}</FieldError>
              )}
            </TabsContent>

            <TabsContent value="csv" className="flex flex-col gap-4">
              <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-xs leading-relaxed">
                {t(
                  'campaigns.wizard.csv.hint',
                  'Add any extra columns — e.g. `company`, `city`. They map to contact attributes automatically.',
                )}
              </p>

              <div
                className="border-border hover:bg-muted/50 flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed py-8 text-center transition-colors"
                onClick={() => csvInputRef.current?.click()}
                onKeyDown={(e) =>
                  e.key === 'Enter' && csvInputRef.current?.click()
                }
                role="button"
                tabIndex={0}
              >
                <Upload className="text-muted-foreground size-8" />
                {csvFileName ? (
                  <span className="text-sm font-medium">{csvFileName}</span>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    {t('campaigns.wizard.csv.dropzone', 'Choose a CSV file…')}
                  </span>
                )}
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleCsvFile(file);
                  }}
                />
              </div>

              {csvError && (
                <p className="text-destructive text-xs">{csvError}</p>
              )}

              {csvRows.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground text-xs">
                    {t('campaigns.wizard.csv.rowCount', {
                      count: csvRows.length,
                    })}
                  </p>
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {csvHeaders.map((h) => (
                            <TableHead key={h} className="font-mono text-xs">
                              {h}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvRows.slice(0, 5).map((row, i) => (
                          <TableRow key={i}>
                            {csvHeaders.map((h) => (
                              <TableCell key={h} className="text-xs">
                                {row[h] || '—'}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {t(
                      'campaigns.wizard.csv.previewNote',
                      'Showing the first 5 rows. Phone validity and opt-out status are checked when the campaign is created.',
                    )}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              {t('campaigns.wizard.backStep', 'Back')}
            </Button>
            <Button type="button" onClick={goNextFromAudience}>
              {t('campaigns.wizard.next', 'Next')}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && selectedTemplate && (
        <div className="flex flex-col gap-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">
                {t('campaigns.create.name')}
              </dt>
              <dd className="font-medium">{campaignName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {t('campaigns.create.template')}
              </dt>
              <dd className="font-mono">{selectedTemplate.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {t('campaigns.wizard.audienceCount', 'Audience')}
              </dt>
              <dd>
                {audienceMode === 'csv'
                  ? t('campaigns.wizard.csv.rowCount', {
                      count: csvRows.length,
                      defaultValue: '{{count}} rows parsed',
                    })
                  : t('campaigns.create.selectedCount', {
                      count: selectedContacts.length,
                    })}
              </dd>
            </div>
          </dl>

          {templateVars.length > 0 && (
            <div className="text-sm">
              <p className="text-muted-foreground mb-1">
                {t('campaigns.create.variableMapping')}
              </p>
              <ul className="font-mono text-xs">
                {templateVars.map((n) => {
                  const entry = varMapping[String(n)];
                  const label =
                    entry?.type === 'attr'
                      ? entry.attrKey
                      : entry?.type === 'text'
                        ? `"${entry.attrKey}"`
                        : (entry?.type ?? '—');
                  return (
                    <li key={n}>
                      {`{{${n}}}`} → {label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {flowId && (
            <div className="text-sm">
              <p className="text-muted-foreground mb-0.5">
                {t('campaigns.create.followUpFlow', 'Follow-up flow')}
              </p>
              <p className="font-medium">
                {activeFlows.find((f) => f.id === flowId)?.name ?? flowId}
              </p>
            </div>
          )}

          <p className="text-muted-foreground text-xs">
            {t(
              'campaigns.wizard.metaNote',
              'Meta bills conversations on your WhatsApp Business Account. This is not a CRM wallet charge.',
            )}
          </p>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              {t('campaigns.wizard.backStep', 'Back')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => void handleSubmit(() => submit(false))()}
            >
              {pending && <Spinner className="mr-2 size-4" />}
              {isEditMode
                ? t('campaigns.wizard.saveDraftEdit', 'Save changes')
                : t('campaigns.wizard.saveDraft', 'Create draft')}
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => void handleSubmit(() => submit(true))()}
            >
              {pending && <Spinner className="mr-2 size-4" />}
              {isEditMode
                ? t('campaigns.wizard.saveLaunchEdit', 'Save and launch')
                : t('campaigns.wizard.createLaunch', 'Create and launch')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
