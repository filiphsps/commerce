'use client';

import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import { X as CloseIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useProductOptions } from '../context';
import { useIsDesktop } from '../use-is-desktop';

export type OverlayProps = {
    groupName: string;
};

const Overlay = ({ groupName }: OverlayProps) => {
    const isDesktop = useIsDesktop();
    const [open, setOpen] = useState(false);
    const { resolved, selectVariant, selection } = useProductOptions();
    const group = resolved.find((g) => g.name === groupName);

    const onSelectAndClose = useCallback(
        (valueName: string) => {
            selectVariant({ ...selection, [groupName]: valueName });
            setOpen(false);
        },
        [groupName, selection, selectVariant],
    );

    if (!group) return null;

    if (isDesktop) {
        return (
            <Popover.Root open={open} onOpenChange={setOpen}>
                <Popover.Anchor asChild>
                    <button
                        type="button"
                        data-option-more
                        onClick={() => setOpen((v) => !v)}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                        aria-label={`Show all ${groupName} options`}
                        className="product-options-more text-(length:--product-card-more-size) text-(color:var(--product-card-more-color)) inline-flex min-h-(--product-card-more-min-size) min-w-(--product-card-more-min-size) cursor-pointer select-none items-center justify-center rounded-full bg-(--product-card-more-bg) px-2 font-(--product-card-more-weight) transition-[background-color,transform] hover:bg-[color-mix(in_srgb,var(--product-card-more-bg)_96%,black_4%)] focus-visible:outline-none motion-safe:active:scale-[0.97] motion-safe:hover:scale-[1.03] focus-visible:[outline:2px_solid_var(--accent)]"
                        style={{ touchAction: 'manipulation', userSelect: 'none' }}
                    >
                        +{Math.max(0, group.values.length - 4)}
                    </button>
                </Popover.Anchor>
                <Popover.Portal>
                    <Popover.Content
                        side="bottom"
                        align="end"
                        sideOffset={6}
                        className="border-(color:var(--product-card-overlay-border-color)) z-50 max-h-(--product-card-overlay-max-height) w-(--product-card-overlay-width) overflow-y-auto rounded-(--product-card-overlay-radius) border bg-(--product-card-overlay-bg) p-(--product-card-overlay-padding) shadow-(--product-card-overlay-shadow)"
                    >
                        <header className="mb-2 flex items-center justify-between">
                            <h3 className="font-semibold text-sm">{groupName}</h3>
                            <Popover.Close
                                aria-label="Close"
                                className="cursor-pointer rounded p-1 hover:bg-black/5 focus-visible:outline-none focus-visible:[outline:2px_solid_var(--accent)]"
                            >
                                <CloseIcon className="size-4" />
                            </Popover.Close>
                        </header>
                        <div className="grid grid-cols-2 gap-2">
                            {group.values.map((v) => (
                                <button
                                    key={v.name}
                                    type="button"
                                    onClick={() => onSelectAndClose(v.name)}
                                    className="border-(color:var(--product-card-chip-border)) hover:border-(color:var(--accent)) flex cursor-pointer select-none items-center gap-2 rounded-md border bg-(--product-card-overlay-row-bg,white) p-2 text-left text-sm transition-[background-color,border-color,transform] hover:bg-(--accent-soft) focus-visible:outline-none disabled:opacity-40 motion-safe:active:scale-[0.99] focus-visible:[outline:2px_solid_var(--accent)]"
                                    style={{ touchAction: 'manipulation', userSelect: 'none' }}
                                >
                                    {v.swatch?.color ? (
                                        <span
                                            className="inline-block size-3.5 rounded-full"
                                            style={{ background: v.swatch.color }}
                                            aria-hidden="true"
                                        />
                                    ) : null}
                                    <span>{v.name}</span>
                                    {!v.available ? <small className="ml-auto opacity-60">Out</small> : null}
                                </button>
                            ))}
                        </div>
                    </Popover.Content>
                </Popover.Portal>
            </Popover.Root>
        );
    }

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <button
                    type="button"
                    data-option-more
                    aria-haspopup="dialog"
                    aria-label={`Show all ${groupName} options`}
                    className="product-options-more text-(length:--product-card-more-size) text-(color:var(--product-card-more-color)) inline-flex min-h-(--product-card-more-min-size) min-w-(--product-card-more-min-size) cursor-pointer select-none items-center justify-center rounded-full bg-(--product-card-more-bg) px-2 font-(--product-card-more-weight) transition-[background-color,transform] hover:bg-[color-mix(in_srgb,var(--product-card-more-bg)_96%,black_4%)] focus-visible:outline-none motion-safe:active:scale-[0.97] motion-safe:hover:scale-[1.03] focus-visible:[outline:2px_solid_var(--accent)]"
                    style={{ touchAction: 'manipulation', userSelect: 'none' }}
                >
                    +{Math.max(0, group.values.length - 4)}
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 motion-safe:animate-[product-card-overlay-fade-in_180ms_linear]" />
                <Dialog.Content
                    aria-describedby={undefined}
                    className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col gap-2 overflow-y-auto rounded-t-(--product-card-overlay-radius) bg-(--product-card-overlay-bg) p-(--product-card-overlay-padding) pb-[max(var(--product-card-overlay-padding),env(safe-area-inset-bottom))] shadow-(--product-card-overlay-shadow) motion-safe:animate-[product-card-sheet-in_220ms_cubic-bezier(0.32,0.72,0,1)]"
                >
                    <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-black/15" />
                    <header className="flex items-center justify-between">
                        <Dialog.Title className="font-semibold text-base">{groupName}</Dialog.Title>
                        <Dialog.Close
                            aria-label="Close"
                            className="cursor-pointer rounded p-1 hover:bg-black/5 focus-visible:outline-none focus-visible:[outline:2px_solid_var(--accent)]"
                        >
                            <CloseIcon className="size-5" />
                        </Dialog.Close>
                    </header>
                    <div className="grid grid-cols-1 gap-2">
                        {group.values.map((v) => (
                            <button
                                key={v.name}
                                type="button"
                                onClick={() => onSelectAndClose(v.name)}
                                className="border-(color:var(--product-card-chip-border)) hover:border-(color:var(--accent)) flex cursor-pointer select-none items-center gap-2 rounded-md border bg-(--product-card-overlay-row-bg,white) p-3 text-left text-sm transition-[background-color,border-color,transform] hover:bg-(--accent-soft) focus-visible:outline-none motion-safe:active:scale-[0.99] focus-visible:[outline:2px_solid_var(--accent)]"
                                style={{ touchAction: 'manipulation', userSelect: 'none' }}
                            >
                                {v.swatch?.color ? (
                                    <span
                                        className="inline-block size-4 rounded-full"
                                        style={{ background: v.swatch.color }}
                                        aria-hidden="true"
                                    />
                                ) : null}
                                <span>{v.name}</span>
                                {!v.available ? <small className="ml-auto opacity-60">Out</small> : null}
                            </button>
                        ))}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

Overlay.displayName = 'Nordcom.ProductOptions.Overlay';
export default Overlay;
