import { DEFAULT_THEME_PREFERENCE, THEME_COOKIE } from '@/utils/theme';

/**
 * A blocking inline script that runs BEFORE first paint to set `<html data-theme>` from the persisted
 * theme cookie — eliminating a theme flash. For the `'system'` preference (and when the cookie is
 * absent) it consults `prefers-color-scheme` so the resolved theme is correct on the very first frame;
 * for `'dark'` it pins dark. Rendered in `<head>` ahead of the app tree. The `ThemeProvider` then owns
 * all subsequent runtime updates.
 *
 * @returns The inline `<script>` element.
 */
export function ThemeScript() {
    const source = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var p=m?decodeURIComponent(m[1]):'${DEFAULT_THEME_PREFERENCE}';if(p!=='dark'&&p!=='system'){p='${DEFAULT_THEME_PREFERENCE}';}var applied=p==='dark'?'dark':(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=applied;}catch(e){}})();`;
    return <script suppressHydrationWarning={true} dangerouslySetInnerHTML={{ __html: source }} />;
}
