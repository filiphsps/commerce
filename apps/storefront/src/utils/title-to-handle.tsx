/**
 * Converts a display title into a URL-safe handle by lowercasing, replacing spaces and punctuation with hyphens, and stripping diacritics and special characters.
 *
 * @param title - The display title to convert.
 * @returns A URL-safe handle string.
 */
export const TitleToHandle = (title: string) => {
    return (title || '')
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/&/g, '')
        .replace(/å/g, 'a')
        .replace(/ä/g, 'a')
        .replace(/ö/g, 'o')
        .replace(/é/g, 'e')
        .replace(/,/g, '-')
        .replace(/[.]/g, '-')
        .replace(/[!]/g, '')
        .replace(/[']/g, '')
        .replace(/--/g, '-');
};
