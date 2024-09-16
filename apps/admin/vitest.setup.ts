import '@testing-library/jest-dom/vitest';
import '@testing-library/react';

import { GlobalRegistrator } from '@happy-dom/global-registrator';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, expect, vi } from 'vitest';

GlobalRegistrator.register();
expect.extend(matchers);

afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
});

afterAll(() => {
    GlobalRegistrator.unregister();
});

vi.mock('server-only', () => ({}));

vi.mock('mongoose', async (importActual) => {
    const actual = (await importActual()) as any;
    return {
        ...(actual || {}),
        default: {
            ...(actual?.default || {}),
            connect: vi.fn().mockImplementation(() => ({
                set: vi.fn(),
                setStrict: vi.fn(),
                setStrictQuery: vi.fn(),
                models: {},
                model: vi.fn().mockImplementation((name: string) => {
                    return {
                        ...(actual?.default?.models[name] || {}),
                        find: vi.fn().mockResolvedValue([])
                    };
                })
            }))
        }
    };
});
vi.stubEnv('MONGODB_URI', 'mongodb+srv://dummy-string');
