/**
 * Shared Tailwind class strings for the library-agnostic editor field chrome —
 * the card shell, row headers, and the add/remove/reorder controls used by the
 * `array`, `blocks`, `group`, and `collapsible` composite widgets. Kept in one
 * module so the composites render with identical spacing, borders, and hover
 * states without each duplicating the (long) utility lists. Semantic-token only
 * (no component-library dependency) so the package stays host-agnostic.
 */

/** Card shell wrapping one repeatable row (array row, block instance). */
export const rowCardClassName =
    'flex flex-col gap-4 rounded-lg border border-border bg-card/30 p-4 transition-colors hover:border-border/80';

/** Header strip inside a row card: title on the left, controls on the right. */
export const rowHeaderClassName = 'flex items-center justify-between gap-2 border-border/60 border-b pb-3';

/** Small uppercase eyebrow label for a row's position / type. */
export const rowTitleClassName = 'font-semibold text-muted-foreground text-xs uppercase tracking-wide';

/** Square icon button (reorder arrows). */
export const iconButtonClassName =
    'inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';

/** Destructive text button (remove row). */
export const removeButtonClassName =
    'inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 font-medium text-destructive text-xs transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';

/** Dashed add affordance that anchors to the start of the column. */
export const addButtonClassName =
    'inline-flex items-center gap-1.5 self-start rounded-md border border-border border-dashed px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:border-primary hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-transparent';

/** Block-type picker select sitting beside the add control. */
export const pickerSelectClassName =
    'rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring';
