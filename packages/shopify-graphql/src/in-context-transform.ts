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

export const inContextTransform = new DocumentTransform((document) => ({
    ...document,
    definitions: document.definitions.map((def) =>
        def.kind === Kind.OPERATION_DEFINITION ? transformOperation(def) : def,
    ),
}));
