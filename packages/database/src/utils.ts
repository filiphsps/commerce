/**
 * Convert an object with CamelCase keys to snake case.
 * This is pretty much only useful for converting objects to be sent by the REST API.
 *
 * @param {T} input - input object.
 * @returns {T} Resulting object.
 */
export const RestifyObject = <T>(input: T): T => {
    const CamelCaseToSnakeCase = (input: string): string => {
        return input.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
    };

    if (typeof input !== 'object' || input === null) {
        return input;
    }

    if (Array.isArray(input)) {
        return input.map((item) => RestifyObject(item)) as unknown as T;
    }

    const snakeCaseObject = {} as T;
    for (const key in input) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
            const snakeCaseKey = CamelCaseToSnakeCase(key);
            snakeCaseObject[snakeCaseKey as keyof T] = RestifyObject(input[key]);
        }
    }

    return snakeCaseObject;
};
