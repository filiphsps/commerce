import { DocumentTransform } from '@apollo/client';
import { DuplicateContextDirectiveError, DuplicateContextVariableError } from '@nordcom/commerce-errors';
import { type DirectiveNode, Kind, type OperationDefinitionNode, type VariableDefinitionNode } from 'graphql';

const COUNTRY_VAR: VariableDefinitionNode = {
    kind: Kind.VARIABLE_DEFINITION,
    variable: { kind: Kind.VARIABLE, name: { kind: Kind.NAME, value: 'country' } },
    type: { kind: Kind.NAMED_TYPE, name: { kind: Kind.NAME, value: 'CountryCode' } },
};

const LANGUAGE_VAR: VariableDefinitionNode = {
    kind: Kind.VARIABLE_DEFINITION,
    variable: { kind: Kind.VARIABLE, name: { kind: Kind.NAME, value: 'language' } },
    type: { kind: Kind.NAMED_TYPE, name: { kind: Kind.NAME, value: 'LanguageCode' } },
};

const IN_CONTEXT_DIRECTIVE: DirectiveNode = {
    kind: Kind.DIRECTIVE,
    name: { kind: Kind.NAME, value: 'inContext' },
    arguments: [
        {
            kind: Kind.ARGUMENT,
            name: { kind: Kind.NAME, value: 'country' },
            value: { kind: Kind.VARIABLE, name: { kind: Kind.NAME, value: 'country' } },
        },
        {
            kind: Kind.ARGUMENT,
            name: { kind: Kind.NAME, value: 'language' },
            value: { kind: Kind.VARIABLE, name: { kind: Kind.NAME, value: 'language' } },
        },
    ],
};

/**
 * Injects `@inContext(country: $country, language: $language)` and the matching
 * variable definitions into a single GraphQL operation node.
 *
 * @param op - The operation definition to augment with Shopify locale context.
 * @returns A new operation node with `$country` and `$language` variable definitions and the `@inContext` directive added.
 * @throws {DuplicateContextDirectiveError} When the operation already carries an `@inContext` directive.
 * @throws {DuplicateContextVariableError} When the operation already declares a `country` or `language` variable.
 */
function transformOperation(op: OperationDefinitionNode): OperationDefinitionNode {
    const opName = op.name?.value ?? `<anonymous ${op.operation}>`;

    if (op.directives?.some((d) => d.name.value === 'inContext')) {
        throw new DuplicateContextDirectiveError(opName);
    }

    for (const v of op.variableDefinitions ?? []) {
        const name = v.variable.name.value;
        if (name === 'country' || name === 'language') {
            throw new DuplicateContextVariableError(opName, name);
        }
    }

    return {
        ...op,
        variableDefinitions: [...(op.variableDefinitions ?? []), COUNTRY_VAR, LANGUAGE_VAR],
        directives: [...(op.directives ?? []), IN_CONTEXT_DIRECTIVE],
    };
}

/**
 * Apollo `DocumentTransform` that automatically injects Shopify's `@inContext` locale directive
 * onto every operation before the document reaches the Storefront API.
 *
 * Wire this into the Apollo Client constructor once — every query and mutation will automatically
 * carry country and language context without per-call boilerplate.
 *
 * @throws {DuplicateContextDirectiveError} When an operation in the document already declares `@inContext`.
 * @throws {DuplicateContextVariableError} When an operation already defines `country` or `language` variables.
 * @example
 * ```ts
 * import { inContextTransform } from '@nordcom/commerce-shopify-graphql';
 *
 * const client = new ApolloClient({
 *     link,
 *     cache,
 *     documentTransform: inContextTransform,
 * });
 * ```
 */
export const inContextTransform = new DocumentTransform((document) => ({
    ...document,
    definitions: document.definitions.map((def) =>
        def.kind === Kind.OPERATION_DEFINITION ? transformOperation(def) : def,
    ),
}));
