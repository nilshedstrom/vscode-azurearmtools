// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { Language } from '../extension.bundle';
import { assert } from './fixed_assert';
import { DefinitionKind, INamedDefinition } from './INamedDefinition';
import * as Json from "./JSON";

/**
 * This represents the definition of a top-level parameter in a deployment template.
 */
export interface IVariableDefinition extends INamedDefinition {
    nameValue: Json.StringValue;
    value: Json.Value | null;
    span: Language.Span;
}

export function isVariableDefinition(definition: INamedDefinition): definition is IVariableDefinition {
    return definition.definitionKind === DefinitionKind.Variable;
}

abstract class VariableDefinition implements INamedDefinition {
    public readonly definitionKind: DefinitionKind = DefinitionKind.Variable;
}

export class TopLevelVariableDefinition extends VariableDefinition {
    constructor(private readonly _property: Json.Property) {
        super();

        assert(_property);
    }

    public get nameValue(): Json.StringValue {
        return this._property.nameValue;
    }

    public get value(): Json.Value | null {
        return this._property.value;
    }

    public get span(): Language.Span {
        return this._property.span;
    }

    /**
     * Convenient way of seeing what this object represents in the debugger, shouldn't be used for production code
     */
    public get __debugDisplay(): string {
        return `${this.nameValue.toString()} (var)`;
    }
}

/**
 * This class represents the definition of a top-level parameter in a deployment template.
 */
export class TopLevelCopyBlockVariableDefinition extends VariableDefinition {
    public constructor(
        private readonly _copyVariableObject: Json.ObjectValue,
        public readonly nameValue: Json.StringValue,
        public readonly value: Json.Value | null
    ) {
        super();
    }

    public static createIfValid(copyVariableObject: Json.Value): IVariableDefinition | undefined {
        // E.g.
        //   "variables": {
        //         "copy": [
        //             { <<<< This is passed to constructor
        //                 "name": "top-level-string-array",
        //                 "count": 5,
        //                 "input": "[concat('myDataDisk', copyIndex('top-level-string-array', 1))]"
        //             }
        //         ]
        //   }

        const asObject = Json.asObjectValue(copyVariableObject);
        if (asObject) {
            const nameValue = Json.asStringValue(asObject.getPropertyValue('name'));
            if (nameValue) {
                const value = asObject.getPropertyValue('input');
                return new TopLevelCopyBlockVariableDefinition(asObject, nameValue, value); //asdf test bad input, bad name
            }
        }

        return undefined;
    }

    public get span(): Language.Span {
        return this._copyVariableObject.span;
    }

    /**
     * Convenient way of seeing what this object represents in the debugger, shouldn't be used for production code
     */
    public get __debugDisplay(): string {
        return `${this.nameValue.toString()} (iter var)`;
    }
}
