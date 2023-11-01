#!/usr/bin/env node

import fs from 'node:fs';
import { gzipSizeSync } from 'gzip-size';
import path from 'node:path';

// Pull options from `package.json`
const options = getOptions();
const BUILD_OUTPUT_DIRECTORY = getBuildOutputDirectory(options);

// first we check to make sure that the build output directory exists
const nextMetaRoot = path.join(process.cwd(), BUILD_OUTPUT_DIRECTORY);
try {
    fs.accessSync(nextMetaRoot, fs.constants.R_OK);
} catch (err) {
    console.error(
        `No build output found at "${nextMetaRoot}" - you may not have your working directory set correctly, or not have run "next build".`,
    );
    process.exit(1);
}

// if so, we can import the build manifest
const buildMeta = JSON.parse(fs.readFileSync(path.join(nextMetaRoot, 'build-manifest.json'), 'utf-8'));
const appDirMeta = JSON.parse(fs.readFileSync(path.join(nextMetaRoot, 'app-build-manifest.json'), 'utf-8'));

// this memory cache ensures we dont read any script file more than once
// bundles are often shared between pages
const memoryCache = {};

// since _app is the template that all other pages are rendered into,
// every page must load its scripts. we'll measure its size here
const globalBundle = buildMeta.pages['/_app'];
const globalBundleSizes = getScriptSizes(globalBundle);

// next, we calculate the size of each page's scripts, after
// subtracting out the global scripts
const allPageSizes = Object.values(buildMeta.pages).reduce((acc, scriptPaths, i) => {
    const pagePath = Object.keys(buildMeta.pages)[i];
    const scriptSizes = getScriptSizes(
        scriptPaths.filter((scriptPath) => !globalBundle.includes(scriptPath)),
    );

    acc[`/app${pagePath}`] = scriptSizes;
    return acc;
}, {});

const globalAppDirBundle = buildMeta.rootMainFiles;
const globalAppDirBundleSizes = getScriptSizes(globalAppDirBundle);

const allAppDirSizes = Object.values(appDirMeta.pages).reduce((acc, scriptPaths, i) => {
    const pagePath = Object.keys(appDirMeta.pages)[i];
    const scriptSizes = getScriptSizes(
        scriptPaths.filter((scriptPath) => !globalAppDirBundle.includes(scriptPath)),
    );

    acc[`/pages${pagePath}`] = scriptSizes;
    return acc;
}, {});

// format and write the output
const rawData = JSON.stringify({
    ...allPageSizes,
    ...allAppDirSizes,
    __global: globalAppDirBundleSizes

}, null, 4);

// log ouputs to the gh actions panel
console.log(rawData);

mkdirp(path.join(nextMetaRoot, 'analyze/'));
if (!fs.existsSync(path.join(nextMetaRoot, 'analyze'))) {
    fs.mkdirSync(path.join(nextMetaRoot, 'analyze'), { recursive: true });
}
fs.writeFileSync(path.join(nextMetaRoot, 'analyze/__bundle_analysis.json'), rawData);

// --------------
// Util Functions
// --------------

// given an array of scripts, return the total of their combined file sizes
function getScriptSizes(scriptPaths) {
    const res = scriptPaths.reduce(
        (acc, scriptPath) => {
            const [rawSize, gzipSize] = getScriptSize(scriptPath);
            acc.raw += rawSize;
            acc.gzip += gzipSize;

            return acc;
        },
        { raw: 0, gzip: 0 },
    );

    return res;
}

// given an individual path to a script, return its file size
function getScriptSize(scriptPath) {
    const encoding = 'utf8';
    const p = path.join(nextMetaRoot, scriptPath);

    let rawSize, gzipSize;
    if (Object.keys(memoryCache).includes(p)) {
        rawSize = memoryCache[p][0];
        gzipSize = memoryCache[p][1];
    } else {
        const textContent = fs.readFileSync(p, encoding);
        rawSize = Buffer.byteLength(textContent, encoding);
        gzipSize = gzipSizeSync(textContent);
        memoryCache[p] = [rawSize, gzipSize];
    }

    return [rawSize, gzipSize];
}

/**
 * Reads options from `package.json`
 */
function getOptions(pathPrefix = process.cwd()) {
    const pkg = JSON.parse(fs.readFileSync(path.join(pathPrefix, 'package.json'), 'utf-8'));

    return { ...pkg.nextBundleAnalysis, name: pkg.name };
}

/**
 * Gets the output build directory, defaults to `.next`
 *
 * @param {object} options the options parsed from package.json.nextBundleAnalysis using `getOptions`
 * @returns {string}
 */
function getBuildOutputDirectory(options) {
    return options.buildOutputDirectory || '.next';
}

function mkdirp(dirPath) {
    const parts = dirPath.split(path.sep);
    for (let i = 1; i <= parts.length; i++) {
        const subPath = path.join(...parts.slice(0, i));
        if (!fs.existsSync(subPath)) {
            fs.mkdirSync(subPath, { recursive: true });
        }
    }
}
