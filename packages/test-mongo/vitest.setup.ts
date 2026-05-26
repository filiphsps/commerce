// Pin the mongod version for the test suite so we use the same binary CI does.
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION ?? '8.0.4';
