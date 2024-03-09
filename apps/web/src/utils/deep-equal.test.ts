import { describe, expect, it } from 'vitest';

import { deepEqual } from '@/utils/deep-equal';

describe('deepEqual', () => {
    it('should return true for equal objects', () => {
        const obj1 = { name: 'John', age: 30 };
        const obj2 = { name: 'John', age: 30 };
        expect(deepEqual(obj1, obj2)).toBe(true);
    });

    it('should return false for different objects', () => {
        const obj1 = { name: 'John', age: 30 };
        const obj2 = { name: 'Jane', age: 25 };
        expect(deepEqual(obj1, obj2)).toBe(false);
    });

    it('should return true for equal arrays', () => {
        const arr1 = [1, 2, 3];
        const arr2 = [1, 2, 3];
        expect(deepEqual(arr1, arr2)).toBe(true);
    });

    it('should return false for different arrays', () => {
        const arr1 = [1, 2, 3];
        const arr2 = [3, 2, 1];
        expect(deepEqual(arr1, arr2)).toBe(false);
    });

    it('should return true for equal nested objects', () => {
        const obj1 = { name: 'John', address: { city: 'New York', country: 'USA' } };
        const obj2 = { name: 'John', address: { city: 'New York', country: 'USA' } };
        expect(deepEqual(obj1, obj2)).toBe(true);
    });

    it('should return false for different nested objects', () => {
        const obj1 = { name: 'John', address: { city: 'New York', country: 'USA' } };
        const obj2 = { name: 'John', address: { city: 'Los Angeles', country: 'USA' } };
        expect(deepEqual(obj1, obj2)).toBe(false);
    });
});
