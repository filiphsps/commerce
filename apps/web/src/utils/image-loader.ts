import type { ImageLoader as ImageLoaderType } from 'next/image';

export const ImageLoader: ImageLoaderType = ({ src, width, quality }) => {
    const params = [];

    // TODO: Refactor this!
    if (src.includes('images.prismic.io')) {
        if (width) {
            params.push(`w=${width}`);
        }
        if (quality) {
            params.push(`q=${quality}`);
        }
        if (!src.includes('fm=')) {
            params.push(`fm=avif`);
        }
    } else {
        if (width) {
            params.push(`width=${width}`);
        }
        if (quality) {
            params.push(`quality=${quality}`);
        }
    }

    return `${src}${params.length ? (src.includes('?') && '&') || '?' : ''}${params.join('&')}`;
};
