import type { ImageLoader as ImageLoaderType } from 'next/image';

export const ImageLoader: ImageLoaderType = ({ src, width, quality }) => {
    if (src.includes('images.prismic.io')) {
        return `${src}${(src.includes('?') && '&') || '?'}q=${quality || 75}`;
    }

    return `${src}${(src.includes('?') && '&') || '?'}width=${width}${(quality && `&quality=${quality}`) || ''}`;
};
