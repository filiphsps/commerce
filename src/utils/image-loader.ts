import type { ImageLoader as ImageLoaderType } from 'next/image';

export const ImageLoader: ImageLoaderType = ({ src, width, quality }) => {
    if (src.includes('images.prismic.io')) {
        let res = `${src}${(src.includes('?') && '&') || '?'}`;

        if (!res.includes('&q=') && !res.includes('?q=')) {
            res += `q=${quality || 75}`;
        }
        if (!res.includes('&fm=') && !res.includes('?fm=')) {
            res += `fm=avif`;
        }
        if (!res.includes('&w=') && !res.includes('?w=') && width) {
            res += `w=${width}`;
        }

        return res;
    }

    return `${src}${(src.includes('?') && '&') || '?'}width=${width}${(quality && `&quality=${quality}`) || ''}`;
};
