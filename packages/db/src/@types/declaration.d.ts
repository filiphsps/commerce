declare global {
    var _mongoClientPromise: Promise<typeof import('mongoose')>;
}

export {};
