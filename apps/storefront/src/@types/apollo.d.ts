import '@apollo/client';

/**
 * The storefront Apollo client (`src/api/client.ts`) sets `errorPolicy: 'all'` as the
 * default for every operation so a partial GraphQL response surfaces `data` alongside
 * `errors` instead of throwing. Apollo Client 4.2 stopped accepting non-default
 * `defaultOptions.errorPolicy` unless the defaults are declared at the type level via
 * `ApolloClient.DeclareDefaultOptions`; without this the result `data` is typed as
 * non-nullable while it can be `undefined` at runtime when an error is returned.
 * Declaring the defaults here keeps the inferred result types honest and unblocks the
 * runtime config.
 */
declare module '@apollo/client' {
    namespace ApolloClient {
        namespace DeclareDefaultOptions {
            interface WatchQuery {
                errorPolicy: 'all';
            }
            interface Query {
                errorPolicy: 'all';
            }
            interface Mutate {
                errorPolicy: 'all';
            }
        }
    }
}
