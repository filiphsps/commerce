/**
 * Window event the editor toolbar fires once a draft autosave or explicit
 * save/publish has PERSISTED. The content live-preview hook listens for it to
 * post its `router.refresh()` ping only after the draft row is written — so the
 * storefront iframe never re-fetches a stale draft (the optimistic text patch
 * already covers the gap before the save lands). Decoupled into its own module
 * so the toolbar never imports the preview hook.
 */
export const CMS_SAVED_EVENT = 'nordcom:cms-saved';
