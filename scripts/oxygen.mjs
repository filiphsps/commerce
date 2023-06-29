import { copyFile, fileSize, glob, removeFile, rmdir } from '@shopify/cli-kit/node/fs';
import { joinPath, relativePath, resolvePath } from '@shopify/cli-kit/node/path';

import child_process from 'child_process';
import path from 'path';
import util from 'util';

const exec = util.promisify(child_process.exec);

const BUILD_DIR = 'dist';
const CLIENT_SUBDIR = 'client';
const WORKER_SUBDIR = 'worker';

export const getProjectPaths = () => {
    const root = process.cwd();
    const publicPath = path.join(root, 'public');
    const buildPath = path.join(root, BUILD_DIR);
    const buildPathClient = path.join(buildPath, CLIENT_SUBDIR);
    const buildPathWorker = path.join(buildPath, WORKER_SUBDIR);
    const buildPathWorkerFile = path.join(buildPath, WORKER_SUBDIR, 'index.js');

    return {
        root,
        buildPath,
        buildPathClient,
        buildPathWorker,
        buildPathWorkerFile,
        publicPath
    };
};

export const runBuild = async () => {
    const { root, buildPath, buildPathClient, buildPathWorker, buildPathWorkerFile, publicPath } =
        getProjectPaths();

    await Promise.all([
        rmdir(path.join()),
        rmdir(buildPath),
        await exec('@cloudflare/next-on-pages'),
        copyPublicFiles(publicPath, buildPathClient),
        copyFile(path.join(root, '.next/static'), path.join(buildPathClient, 'build'))
    ]);
};

export async function copyPublicFiles(publicPath, buildPathClient) {
    return copyFile(publicPath, buildPathClient);
}

// eslint-disable-next-line no-console
runBuild().then(() => console.log('!!!'));
