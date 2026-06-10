/**
 * Live-preview seam shared by the admin theme editor and the storefront
 * preview bridge: the `postMessage` wire contract (types + guards) and the
 * pure preview-URL builders targeting the storefront's `/api/cms-preview`
 * draft-mode activation route.
 */

export {
    isThemePreviewMessage,
    isThemePreviewReadyMessage,
    THEME_PREVIEW_MESSAGE_TYPE,
    THEME_PREVIEW_READY_MESSAGE_TYPE,
    type ThemePreviewMessage,
    type ThemePreviewReadyMessage,
} from './messages';
export { buildPreviewActivationUrl, buildPreviewPath, type PreviewTarget } from './url';
