import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const originalAdapterPath = process.env.NEXT_ORIGINAL_ADAPTER_PATH;

async function loadOriginalAdapter() {
    if (!originalAdapterPath) return null;
    try {
        const mod = await import(pathToFileURL(originalAdapterPath).href);
        return mod.default ?? mod;
    } catch (error) {
        console.warn(`[storefront-adapter] Failed to load original adapter at ${originalAdapterPath}:`, error);
        return null;
    }
}

const original = await loadOriginalAdapter();

async function createMissingFallbackShells(distDir) {
    const manifestPath = path.join(distDir, 'prerender-manifest.json');
    let manifest;
    try {
        manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    } catch (error) {
        console.warn('[storefront-adapter] Could not read prerender manifest:', error);
        return;
    }

    const dynamicRoutes = manifest.dynamicRoutes ?? {};
    let createdCount = 0;

    for (const route of Object.values(dynamicRoutes)) {
        if (typeof route.fallback !== 'string') continue;
        const fallback = route.fallback.endsWith('.html') ? route.fallback : `${route.fallback}.html`;
        const filePath = path.join(distDir, 'server', 'app', fallback);
        try {
            await fs.access(filePath);
        } catch {
            try {
                await fs.mkdir(path.dirname(filePath), { recursive: true });
                await fs.writeFile(filePath, '');
                createdCount++;
            } catch (error) {
                console.warn(`[storefront-adapter] Failed to create fallback shell ${filePath}:`, error);
            }
        }
    }

    if (createdCount > 0) {
    }
}

const adapter = {
    name: original?.name ? `${original.name}+storefront-fallback-shell-fix` : 'storefront-fallback-shell-fix',

    async modifyConfig(config, ctx) {
        if (typeof original?.modifyConfig === 'function') {
            return original.modifyConfig(config, ctx);
        }
        return config;
    },

    async onBuildComplete(ctx) {
        await createMissingFallbackShells(ctx.distDir);
        if (typeof original?.onBuildComplete === 'function') {
            await original.onBuildComplete(ctx);
        }
    },
};

export default adapter;
