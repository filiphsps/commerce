import type { ImageLoader as ImageLoaderType } from 'next/image';

export const ImageLoader: ImageLoaderType = ({ src, width, quality }) => {
    let res = `${src}${(src.includes('?') && '&') || '?'}width=${width}${(quality && `&quality=${quality}`) || ''}`;

    return res;
};
