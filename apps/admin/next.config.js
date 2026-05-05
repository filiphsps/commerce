import "dotenv/config";

import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import createVercelToolbar from "@vercel/toolbar/plugins/next";

const withVercelToolbar = createVercelToolbar({
	devServerPort: 1337,
});

const isDev = process.env.NODE_ENV === "development";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getBaseUrl() {
	if (process.env.VERCEL_ENV === "production") {
		return "https://admin.shops.nordcom.io";
	}

	return process.env.VERCEL_URL
		? `https://${process.env.VERCEL_URL}`
		: undefined;
}

/** @type {import('next').NextConfig} */
const config = {
	pageExtensions: ["ts", "tsx"],
	poweredByHeader: false,
	generateEtags: true,
	reactStrictMode: true,
	productionBrowserSourceMaps: true,
	compress: true,
	trailingSlash: true,
	transpilePackages: [],
	assetPrefix: getBaseUrl(),
	reactCompiler: true,
	cacheComponents: true,
	typedRoutes: true,
	turbopack: { root: path.resolve(path.join(__dirname, "../..")) },
	experimental: {
		appNavFailHandling: true,
		caseSensitiveRoutes: true,
		cssChunking: true,
		esmExternals: true,
		proxyPrefetch: "flexible",
		optimizeCss: true,
		optimizePackageImports: ["@apollo/client", "@shopify/hydrogen-react"],
		optimizeServerReact: true,
		parallelServerBuildTraces: true,
		parallelServerCompiles: true,
		scrollRestoration: true,
		serverComponentsHmrCache: true,
		serverSourceMaps: true,
		staleTimes: { dynamic: 0, static: 180 },
		taint: true,
		typedEnv: true,
		useWasmBinary: false,
		webpackBuildWorker: true,
		rootParams: true,
	},
	images: {
		dangerouslyAllowSVG: true,
		//path: 'https://cloudflare-image.nordcom.workers.dev', // Shopify images fails when using .nordcom.io domain.
		//minimumCacheTTL: 60,
		contentDispositionType: "inline",
		remotePatterns: [
			{
				protocol: "https",
				hostname: "nordcom.io",
			},
			{
				protocol: "https",
				hostname: "**.nordcom.io",
			},
			{
				protocol: "https",
				hostname: "**.prismic.io",
			},
			{
				protocol: "https",
				hostname: "**.unsplash.com",
			},
			{
				protocol: "https",
				hostname: "**.shopify.com",
			},
			{
				protocol: "https",
				hostname: "**.github.io",
			},
			{
				protocol: "https",
				hostname: "**.gravatar.com",
			},
		],
		formats: ["image/webp", "image/avif"],
	},
	typescript: {
		ignoreBuildErrors: true,
		tsconfigPath: "tsconfig.json",
	},
	sassOptions: {
		loadPaths: [path.join(__dirname, "src/scss"), path.join(__dirname, "src")],
	},

	env: {
		ENVIRONMENT:
			process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
		GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
		AUTH_URL: process.env.AUTH_URL,
	},

	async generateBuildId() {
		if (process.env.NODE_ENV === "development") return "dev";
		return process.env.VERCEL_GIT_COMMIT_SHA || "unknown";
	},

	webpack: !isDev
		? (config, { webpack, isServer }) => {
				config.experiments = {
					...config.experiments,
					topLevelAwait: true,
				};

				config.plugins.push(
					new webpack.DefinePlugin({
						__SENTRY_DEBUG__: false,
						__SENTRY_TRACING__: false,
						__RRWEB_EXCLUDE_IFRAME__: true,
						__RRWEB_EXCLUDE_SHADOW_DOM__: true,
						__SENTRY_EXCLUDE_REPLAY_WORKER__: true,
					}),
				);

				if (isServer) {
					config.devtool = "source-map";
				}
				return config;
			}
		: undefined,

	// We handle all redirects at the edge.
	skipTrailingSlashRedirect: true,
};

export default withVercelToolbar(config);
