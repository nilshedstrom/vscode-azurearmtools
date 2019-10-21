// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { Language } from '../extension.bundle';
import { assert } from './fixed_assert';
import { IUsageInfo } from './Hover';
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
    public usageInfo: IUsageInfo;
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

    public get usageInfo(): IUsageInfo {
        return {
            usage: this.nameValue.unquotedValue,
            friendlyType: "variable",
            description: undefined
        };
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
    public readonly value: Json.Value | null;

    public constructor(
        /**
         * The "copy" block array element corresponding to this variable (see below)
         */
        private readonly _copyVariableObject: Json.ObjectValue,

        /**
         * StringValue representing the "name" property of the copy block
         */
        public readonly nameValue: Json.StringValue,

        /**
         * The "input" property from the copy block, represents the value of each instance of the
         * resulting variable array
         */
        input: Json.Value | null
    ) {
        super();

        // The value will be an array of the value of the "input" property
        this.value = input ? new Json.ArrayValue(input.span, [input]) : null; // asdf test input null
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

    public get usageInfo(): IUsageInfo {
        return {
            usage: this.nameValue.unquotedValue,
            friendlyType: "iteration variable",
            description: undefined
        };
    }

    /**
     * Convenient way of seeing what this object represents in the debugger, shouldn't be used for production code
     */
    public get __debugDisplay(): string {
        return `${this.nameValue.toString()} (iter var)`;
    }
}
