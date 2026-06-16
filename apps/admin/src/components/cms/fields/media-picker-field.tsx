'use client';

import type { UploadFieldDescriptor } from '@nordcom/commerce-cms/descriptors';
import { type FieldRendererProps, FieldShell, useEditorField } from '@nordcom/commerce-cms/editor/form';
import type { Media } from '@nordcom/commerce-cms/types';
import { ImageIcon, Loader2, Upload } from 'lucide-react';
import { useParams } from 'next/navigation';
import { type MouseEvent as ReactMouseEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getMediaByIdAction, listMediaAction } from '@/lib/cms-actions/media-list';
import { updateMediaMetadataAction } from '@/lib/cms-actions/media-metadata';
import { createMediaAction } from '@/lib/cms-actions/media-upload';
import { cn } from '@/utils/tailwind';

/** The editable metadata slice the detail pane binds — seeded from the active media, posted on save. */
type MetadataDraft = {
    /** Required alt text describing the image. */
    alt: string;
    /** Optional editorial caption; empty clears it. */
    caption: string;
    /** Focal point X in `0..1` (0 = left edge), driving the focal-aware derivative crops. */
    focalX: number;
    /** Focal point Y in `0..1` (0 = top edge). */
    focalY: number;
};

/**
 * Derives a sensible default alt text from an uploaded file's name — the basename with its
 * extension dropped and separators spaced — so a quick upload satisfies the required `alt` contract
 * without a modal prompt. The operator can refine it in the detail pane afterward, exactly like
 * Shopify defaults alt to the filename.
 *
 * @param filename - The picked file's name.
 * @returns A non-empty alt string (falls back to the raw name when there is nothing to strip).
 */
function defaultAltFromFilename(filename: string): string {
    const withoutExtension = filename.replace(/\.[^./\\]+$/, '');
    const spaced = withoutExtension.replace(/[_-]+/g, ' ').trim();
    return spaced || filename;
}

/**
 * Formats a byte count as a compact human-readable size for the detail pane's file facts.
 *
 * @param bytes - The size in bytes.
 * @returns A unit-suffixed string (e.g. `12.4 KB`).
 */
function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${value.toFixed(1)} ${units[unit]}`;
}

/**
 * Clamps a raw focal coordinate into the `0..1` range, treating non-finite input as the centered
 * default — mirrors the Convex side's `clampFocal` so the visual picker can never post an
 * out-of-range value.
 *
 * @param value - The candidate coordinate.
 * @returns The clamped coordinate, or `0.5` when the input is not a finite number.
 */
function clampFocal(value: number): number {
    if (!Number.isFinite(value)) return 0.5;
    return Math.min(1, Math.max(0, value));
}

/** The best available serving URL for a thumbnail-sized rendering of a media row. */
function thumbnailSrc(media: Media): string | null {
    return media.thumbnailURL ?? media.sizes?.thumbnail?.url ?? media.url ?? null;
}

/**
 * Props for {@link MediaPickerDialog}.
 */
type MediaPickerDialogProps = {
    /** Tenant domain the media actions are scoped to. */
    domain: string;
    /** The field's dotted path, used to namespace the dialog's test ids. */
    path: string;
    /** The media id the field currently holds, pre-selected when the dialog opens. */
    value: string | undefined;
    /** The resolved media behind `value`, merged into the grid so a selection off the first page still resolves. */
    preselected: Media | null;
    /** Commits a chosen media row to the field and closes the dialog. */
    onCommit: (media: Media) => void;
    /** Clears the field's selection ("no image") and closes the dialog. */
    onClear: () => void;
    /** The trigger element that opens the dialog. */
    children: ReactNode;
};

/**
 * The Shopify-style media picker — a two-pane modal that lists the tenant's uploaded images to
 * choose from, uploads a new one inline, and edits the selected image's metadata and focal point
 * before committing it to the field. Left pane is a contact-sheet grid (plus an upload tile); the
 * right pane is the selected image's detail editor: a live preview carrying a click-to-place focal
 * reticle, the required alt text, an optional caption, and the file facts. Built on the generic
 * {@link Dialog} primitive, so it inherits the focus trap, scroll lock, and `Escape`-to-close.
 *
 * @param props - {@link MediaPickerDialogProps}.
 * @returns The trigger wrapping the portalled picker dialog.
 */
function MediaPickerDialog({ domain, path, value, preselected, onCommit, onClear, children }: MediaPickerDialogProps) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<Media[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | undefined>(undefined);
    const [activeId, setActiveId] = useState<string | undefined>(value);
    const [draft, setDraft] = useState<MetadataDraft | null>(null);
    const [savingMeta, setSavingMeta] = useState(false);
    const [metaError, setMetaError] = useState<string | undefined>(undefined);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // `preselected` lets a `value` that lives past the first page still resolve in the detail pane.
    const active = items.find((media) => media.id === activeId) ?? (preselected?.id === activeId ? preselected : null);

    const refresh = useCallback(async (): Promise<Media[]> => {
        const page = await listMediaAction(domain);
        setItems(page.items);
        return page.items;
    }, [domain]);

    // Load the library when the dialog opens; re-seed the selection to the field's current value.
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setLoading(true);
        setLoadError(undefined);
        setActiveId(value);
        refresh()
            .catch((cause: unknown) => {
                if (!cancelled)
                    setLoadError(cause instanceof Error ? cause.message : 'Could not load the media library.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [open, value, refresh]);

    // Re-seed the metadata draft whenever the active image (or its saved revision) changes.
    useEffect(() => {
        if (!active) {
            setDraft(null);
            return;
        }
        setMetaError(undefined);
        setDraft({
            alt: active.alt,
            caption: active.caption ?? '',
            focalX: active.focalX ?? 0.5,
            focalY: active.focalY ?? 0.5,
        });
    }, [active?.id, active?.updatedAt, active]);

    /**
     * Uploads the picked file through the create action, defaulting its alt to the filename, then
     * refreshes the grid and selects the new image so the operator lands straight on its detail
     * pane to refine the metadata.
     */
    const onFilePicked = useCallback(async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file) return;
        setUploading(true);
        setUploadError(undefined);
        try {
            const formData = new FormData();
            formData.set('file', file);
            formData.set('alt', defaultAltFromFilename(file.name));
            const { id } = await createMediaAction(domain, formData);
            await refresh();
            setActiveId(id);
        } catch (cause) {
            setUploadError(cause instanceof Error ? cause.message : 'Upload failed.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [domain, refresh]);

    /** Persists the detail pane's metadata draft (re-cropping derivatives when the focal moved). */
    const onSaveMetadata = useCallback(async () => {
        if (!active || !draft) return;
        setSavingMeta(true);
        setMetaError(undefined);
        try {
            const formData = new FormData();
            formData.set('mediaId', active.id);
            formData.set('alt', draft.alt);
            formData.set('caption', draft.caption);
            formData.set('focalX', String(draft.focalX));
            formData.set('focalY', String(draft.focalY));
            await updateMediaMetadataAction(domain, formData);
            await refresh();
        } catch (cause) {
            setMetaError(cause instanceof Error ? cause.message : 'Could not save the image details.');
        } finally {
            setSavingMeta(false);
        }
    }, [active, draft, domain, refresh]);

    /** Commits a media row to the field and closes the dialog. */
    const commit = useCallback(
        (media: Media) => {
            onCommit(media);
            setOpen(false);
        },
        [onCommit],
    );

    /** Clears the field's selection ("no image") and closes the dialog. */
    const clearAndClose = useCallback(() => {
        onClear();
        setOpen(false);
    }, [onClear]);

    /** Places the focal reticle from a click on the preview, normalizing the pointer to `0..1`. */
    const onFocalClick = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = clampFocal((event.clientX - rect.left) / rect.width);
        const y = clampFocal((event.clientY - rect.top) / rect.height);
        setDraft((prev) => (prev ? { ...prev, focalX: x, focalY: y } : prev));
    }, []);

    const altInvalid = draft !== null && draft.alt.trim() === '';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent
                aria-describedby={undefined}
                className="h-[90vh] max-w-5xl"
                data-testid={`media-picker-${path}`}
            >
                <DialogHeader>
                    <DialogTitle>Select media</DialogTitle>
                </DialogHeader>

                <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                    {/* Library — contact-sheet grid plus the upload tile. */}
                    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto border-border p-4 md:border-r-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            data-testid={`media-upload-input-${path}`}
                            onChange={onFilePicked}
                        />
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            <button
                                type="button"
                                disabled={uploading}
                                onClick={() => fileInputRef.current?.click()}
                                data-testid={`media-upload-${path}`}
                                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-md border-2 border-border border-dashed bg-background text-muted-foreground outline-none transition-colors hover:border-primary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                            >
                                {uploading ? (
                                    <Loader2 className="size-5 animate-spin" aria-hidden />
                                ) : (
                                    <Upload className="size-5" aria-hidden />
                                )}
                                <span className="font-semibold text-xs uppercase tracking-wide">
                                    {uploading ? 'Uploading' : 'Upload'}
                                </span>
                            </button>

                            {items.map((media) => {
                                const src = thumbnailSrc(media);
                                const selected = media.id === activeId;
                                return (
                                    <button
                                        key={media.id}
                                        type="button"
                                        onClick={() => setActiveId(media.id)}
                                        onDoubleClick={() => commit(media)}
                                        data-testid={`media-tile-${media.id}`}
                                        data-selected={selected ? 'true' : undefined}
                                        title={media.alt || media.filename || undefined}
                                        className={cn(
                                            'group relative aspect-square overflow-hidden rounded-md border-2 bg-background outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                                            selected ? 'border-primary' : 'border-border hover:border-muted-foreground',
                                        )}
                                    >
                                        {src ? (
                                            // Convex serving URLs are dynamic blobs; a plain <img> avoids per-host
                                            // remote-pattern config for an admin-only surface.
                                            // biome-ignore lint/performance/noImgElement: dynamic Convex blob URL, admin-only.
                                            <img
                                                src={src}
                                                alt={media.alt || media.filename || ''}
                                                loading="lazy"
                                                className="size-full object-cover"
                                            />
                                        ) : (
                                            <span className="flex size-full items-center justify-center text-muted-foreground">
                                                <ImageIcon className="size-5" aria-hidden />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {loading && items.length === 0 ? (
                            <p className="py-8 text-center text-muted-foreground text-sm">Loading media…</p>
                        ) : null}
                        {!loading && items.length === 0 && !loadError ? (
                            <p className="py-8 text-center text-muted-foreground text-sm">
                                No media yet. Upload your first image.
                            </p>
                        ) : null}
                        {loadError ? (
                            <p role="alert" className="font-medium text-destructive text-sm">
                                {loadError}
                            </p>
                        ) : null}
                        {uploadError ? (
                            <p role="alert" className="font-medium text-destructive text-sm">
                                {uploadError}
                            </p>
                        ) : null}
                    </div>

                    {/* Detail — the selected image's preview, focal picker, and editable metadata. */}
                    <div className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto p-4 md:w-80 lg:w-96">
                        {active && draft ? (
                            <>
                                <button
                                    type="button"
                                    onClick={onFocalClick}
                                    aria-label="Set focal point"
                                    data-testid={`media-focal-${path}`}
                                    className="relative block w-full cursor-crosshair overflow-hidden rounded-md border-2 border-border bg-black outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {thumbnailSrc(active) ? (
                                        // biome-ignore lint/performance/noImgElement: dynamic Convex blob URL, admin-only.
                                        <img
                                            src={active.url ?? thumbnailSrc(active) ?? ''}
                                            alt={active.alt || active.filename || ''}
                                            className="max-h-64 w-full object-contain"
                                        />
                                    ) : (
                                        <span className="flex h-40 w-full items-center justify-center text-muted-foreground">
                                            <ImageIcon className="size-6" aria-hidden />
                                        </span>
                                    )}
                                    <span
                                        aria-hidden
                                        style={{ left: `${draft.focalX * 100}%`, top: `${draft.focalY * 100}%` }}
                                        className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary/20 ring-2 ring-black/40"
                                    />
                                </button>

                                <FieldRow
                                    label="Alt text"
                                    htmlFor="media-detail-alt"
                                    required
                                    errorMessage={altInvalid ? 'Alt text is required.' : undefined}
                                >
                                    <Input
                                        id="media-detail-alt"
                                        value={draft.alt}
                                        onChange={(event) => setDraft({ ...draft, alt: event.target.value })}
                                    />
                                </FieldRow>

                                <FieldRow label="Caption" htmlFor="media-detail-caption">
                                    <Input
                                        id="media-detail-caption"
                                        value={draft.caption}
                                        placeholder="Optional"
                                        onChange={(event) => setDraft({ ...draft, caption: event.target.value })}
                                    />
                                </FieldRow>

                                <FieldRow label="Focal point" htmlFor="media-detail-focal-x">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="media-detail-focal-x"
                                            type="number"
                                            min={0}
                                            max={1}
                                            step={0.01}
                                            value={draft.focalX}
                                            aria-label="Focal point X"
                                            onChange={(event) =>
                                                setDraft({ ...draft, focalX: clampFocal(Number(event.target.value)) })
                                            }
                                        />
                                        <Input
                                            type="number"
                                            min={0}
                                            max={1}
                                            step={0.01}
                                            value={draft.focalY}
                                            aria-label="Focal point Y"
                                            onChange={(event) =>
                                                setDraft({ ...draft, focalY: clampFocal(Number(event.target.value)) })
                                            }
                                        />
                                    </div>
                                </FieldRow>

                                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                                    <dt className="text-muted-foreground">File</dt>
                                    <dd className="truncate font-medium" title={active.filename ?? undefined}>
                                        {active.filename}
                                    </dd>
                                    <dt className="text-muted-foreground">Type</dt>
                                    <dd className="font-medium">{active.mimeType}</dd>
                                    {active.width && active.height ? (
                                        <>
                                            <dt className="text-muted-foreground">Size</dt>
                                            <dd className="font-medium">
                                                {active.width} × {active.height} · {formatBytes(active.filesize ?? 0)}
                                            </dd>
                                        </>
                                    ) : (
                                        <>
                                            <dt className="text-muted-foreground">Size</dt>
                                            <dd className="font-medium">{formatBytes(active.filesize ?? 0)}</dd>
                                        </>
                                    )}
                                </dl>

                                {metaError ? (
                                    <p role="alert" className="font-medium text-destructive text-sm">
                                        {metaError}
                                    </p>
                                ) : null}

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={savingMeta || altInvalid}
                                    onClick={onSaveMetadata}
                                    data-testid={`media-save-${path}`}
                                >
                                    {savingMeta ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                                    Save details
                                </Button>
                            </>
                        ) : (
                            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                                <ImageIcon className="size-8" aria-hidden />
                                <p className="text-sm">Select an image to edit its details.</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className={value ? 'justify-between' : undefined}>
                    {value ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            data-testid={`media-dialog-clear-${path}`}
                            onClick={clearAndClose}
                        >
                            Remove image
                        </Button>
                    ) : null}
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={!active}
                            data-testid={`media-use-${path}`}
                            onClick={() => active && commit(active)}
                        >
                            Use image
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Props for {@link FieldRow} — a compact label + control row used inside the picker's detail pane.
 */
type FieldRowProps = {
    /** The row's label. */
    label: string;
    /** The control's `id`, wired to the label. */
    htmlFor: string;
    /** Whether to render the required marker. */
    required?: boolean;
    /** Validation message surfaced beneath the control. */
    errorMessage?: string;
    /** The control. */
    children: ReactNode;
};

/**
 * A labeled control row matching the editor's field chrome — used for the picker's detail-pane
 * metadata inputs, which live outside the form-state {@link FieldShell}.
 *
 * @param props - {@link FieldRowProps}.
 * @returns The labeled row.
 */
function FieldRow({ label, htmlFor, required, errorMessage, children }: FieldRowProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={htmlFor} className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                {label}
                {required ? (
                    <span aria-hidden="true" className="ml-1 text-primary">
                        *
                    </span>
                ) : null}
            </label>
            {children}
            {errorMessage ? (
                <p role="alert" className="font-medium text-destructive text-xs">
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}

/**
 * The admin's upload-field widget — replaces the library's bare file input with a Shopify-style
 * media picker. The field shows the current selection (thumbnail + filename) or an empty dropzone,
 * and a "Choose image" trigger opens the {@link MediaPickerDialog} to browse the library, upload a
 * new image, and edit its alt/caption/focal before committing. The committed media id is written to
 * form state at the field's path — the same value the library widget stored — so the rest of the
 * editor (autosave, publish, the storefront read) is unchanged.
 *
 * Registered for the `upload` kind via `registerAdminFieldWidgets`; the tenant `domain` comes from
 * the `[domain]` route segment, the seam the media actions are scoped to.
 *
 * @param props.field - The upload descriptor.
 * @param props.path - The field's dotted form-state path.
 * @returns The bound media picker field, or `null` when its condition hides it.
 */
export function AdminUploadField({ field, path }: FieldRendererProps<UploadFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<string>(field, path);
    const params = useParams<{ domain: string }>();
    const domain = params.domain;
    const [preview, setPreview] = useState<Media | null>(null);

    // Resolve the current value's media so the closed field can render its thumbnail. A `preview`
    // already matching the value (e.g. just committed from the dialog) needs no round-trip.
    useEffect(() => {
        if (!value) {
            setPreview(null);
            return;
        }
        if (preview?.id === value) return;
        let cancelled = false;
        getMediaByIdAction(domain, value)
            .then((media) => {
                if (!cancelled) setPreview(media);
            })
            .catch(() => {
                // A missing/foreign id leaves the id-only fallback below; never crash the field.
            });
        return () => {
            cancelled = true;
        };
    }, [value, domain, preview?.id]);

    const onCommit = useCallback(
        (media: Media) => {
            setValue(media.id);
            setPreview(media);
        },
        [setValue],
    );

    // Deselect: an empty id is the field's "no image" state — every render path keys off the value's
    // truthiness, so the cleared field shows the empty dropzone and round-trips as no selection.
    const onClear = useCallback(() => {
        setValue('');
        setPreview(null);
    }, [setValue]);

    if (!visible) return null;

    const src = preview ? thumbnailSrc(preview) : null;

    return (
        <FieldShell htmlFor={path} label={field.label ?? field.name} required={field.required} errorMessage={error}>
            <div className="flex items-center gap-3">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-border bg-background text-muted-foreground">
                    {src ? (
                        // biome-ignore lint/performance/noImgElement: dynamic Convex blob URL, admin-only.
                        <img
                            src={src}
                            alt={preview?.alt || preview?.filename || ''}
                            className="size-full object-cover"
                        />
                    ) : (
                        <ImageIcon className="size-5" aria-hidden />
                    )}
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                    {value ? (
                        <span data-testid={`upload-${path}-value`} className="truncate font-medium text-sm">
                            {preview?.filename ?? value}
                        </span>
                    ) : (
                        <span className="text-muted-foreground text-sm">No image selected</span>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        <MediaPickerDialog
                            domain={domain}
                            path={path}
                            value={value}
                            preselected={preview}
                            onCommit={onCommit}
                            onClear={onClear}
                        >
                            <Button type="button" variant="outline" size="sm" data-testid={`media-picker-open-${path}`}>
                                {value ? 'Change image' : 'Choose image'}
                            </Button>
                        </MediaPickerDialog>
                        {value ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                data-testid={`media-clear-${path}`}
                                onClick={onClear}
                            >
                                Remove
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>
        </FieldShell>
    );
}
