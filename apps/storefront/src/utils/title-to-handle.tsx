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
