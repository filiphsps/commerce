import type { ImageLoader as ImageLoaderType } from 'next/image';

export const fallbackLoader: ImageLoaderType = ({ src, width, quality }) => {
    const params: string[] = [];
    if (width) {
        params.push(`width=${width}`);
    }
    if (quality) {
        params.push(`quality=${quality}`);
    }

    const div = src.includes('?') ? '&' : '?';
    return `${src}${params.length > 0 ? div : ''}${params.join('&')}`;
};
