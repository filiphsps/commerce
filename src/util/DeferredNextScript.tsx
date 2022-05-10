import { NextScript } from 'next/document';
import React from 'react';
// @ts-ignore
import { getPageFiles } from 'next/dist/next-server/server/get-page-files';

function getDocumentFiles(buildManifest, pathname) {
    const sharedFiles = getPageFiles(buildManifest, '/_app');
    const pageFiles =
        pathname !== '/_error' ? getPageFiles(buildManifest, pathname) : [];

    return {
        sharedFiles,
        pageFiles,
        allFiles: [...(new Set([...sharedFiles, ...pageFiles]) as any)]
    };
}

class DeferredNextScript extends NextScript {
    getScripts() {
        const files = getDocumentFiles(
            this.context.buildManifest,
            this.context.__NEXT_DATA__.page
        );

        return super.getScripts(files).map((script) => {
            return React.cloneElement(script, {
                key: script.props.src,
                defer: true,
                async: false
            });
        });
    }
    getDynamicChunks() {
        const files = getDocumentFiles(
            this.context.buildManifest,
            this.context.__NEXT_DATA__.page
        );

        return super.getDynamicChunks(files).map((script) => {
            return React.cloneElement(script, {
                key: script.props.src,
                defer: true,
                async: false
            });
        });
    }
}

export default DeferredNextScript;
