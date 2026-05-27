import { runCartAdapterContract } from '../src/contract-tests';
import { createMockCartAdapter } from '../src/mock-adapter';

runCartAdapterContract({
    name: 'mock-adapter',
    factory: () => createMockCartAdapter(),
});
