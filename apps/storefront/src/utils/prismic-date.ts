export const convertPrismicDateToISO = (date: string): string => {
    const result = new Date(date.replace(/(\+|-)(\d{2})(\d{2})$/, '.000$1$2:$3'));
    return result.toISOString();
};
