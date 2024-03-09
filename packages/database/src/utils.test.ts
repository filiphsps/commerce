import { describe, expect, it } from 'vitest';

import { RestifyObject } from './utils';

describe('RestifyObject', () => {
    it('should return the same input when given a non-object value', () => {
        const input = 'test';
        const result = RestifyObject(input);
        expect(result).toEqual(input);
    });

    it('should return the same input when given a null value', () => {
        const input = null;
        const result = RestifyObject(input);
        expect(result).toEqual(input);
    });

    it('should return the same input when given an empty object', () => {
        const input = {};
        const result = RestifyObject(input);
        expect(result).toEqual(input);
    });

    it('should convert camel case keys to snake case keys', () => {
        const input = {
            firstName: 'John',
            lastName: 'Doe',
            age: 30
        };
        const expectedOutput = {
            first_name: 'John',
            last_name: 'Doe',
            age: 30
        };
        const result = RestifyObject(input);
        expect(result).toEqual(expectedOutput);
    });

    it('should recursively convert camel case keys to snake case keys in nested objects', () => {
        const input = {
            firstName: 'John',
            lastName: 'Doe',
            address: {
                streetName: '123 Main St',
                city: 'New York'
            }
        };
        const expectedOutput = {
            first_name: 'John',
            last_name: 'Doe',
            address: {
                street_name: '123 Main St',
                city: 'New York'
            }
        };
        const result = RestifyObject(input);
        expect(result).toEqual(expectedOutput);
    });

    it('should convert camel case keys to snake case keys in arrays', () => {
        const input = [
            { firstName: 'John', lastName: 'Doe' },
            { firstName: 'Jane', lastName: 'Smith' }
        ];
        const expectedOutput = [
            { first_name: 'John', last_name: 'Doe' },
            { first_name: 'Jane', last_name: 'Smith' }
        ];
        const result = RestifyObject(input);
        expect(result).toEqual(expectedOutput);
    });

    it('should handle arrays with nested objects', () => {
        const input = [
            { firstName: 'John', lastName: 'Doe', address: { streetName: '123 Main St', city: 'New York' } },
            { firstName: 'Jane', lastName: 'Smith', address: { streetName: '456 Elm St', city: 'Los Angeles' } }
        ];
        const expectedOutput = [
            { first_name: 'John', last_name: 'Doe', address: { street_name: '123 Main St', city: 'New York' } },
            { first_name: 'Jane', last_name: 'Smith', address: { street_name: '456 Elm St', city: 'Los Angeles' } }
        ];
        const result = RestifyObject(input);
        expect(result).toEqual(expectedOutput);
    });
});
