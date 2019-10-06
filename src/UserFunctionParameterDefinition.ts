// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { assert } from './fixed_assert';
import { IParameterDefinition } from './IParameterDefinition';
import * as Json from "./JSON";
import * as language from "./Language";

/**
 * This class represents the definition of a parameter in a user-defined function
 */
export class UserFunctionParameterDefinition implements IParameterDefinition {
    private constructor(private _name: Json.StringValue, private _objectValue: Json.ObjectValue) {
        assert(_objectValue);
    }

    public static createIfValid(parameterObject: Json.ObjectValue): UserFunctionParameterDefinition | null {
        const name = Json.asStringValue(parameterObject.getPropertyValue('name')); // asdf case insensitive
        if (name) {
            return new UserFunctionParameterDefinition(name, parameterObject);
        }

        return null;
    }

    public get name(): Json.StringValue {
        return this._name;
    }

    // tslint:disable-next-line:no-reserved-keywords
    public get type(): Json.Value | null {
        const parameterDefinition: Json.ObjectValue | null = Json.asObjectValue(this._objectValue);
        if (parameterDefinition) {
            return parameterDefinition.getPropertyValue("type");
        }

        return null;
    }

    public get span(): language.Span {
        return this._objectValue.span;
    }

    public readonly supportsDescription: boolean = false;
    public readonly description: string | null = null;
    public readonly supportsDefaultValue: boolean = false;
    public readonly defaultValue: Json.Value | null = null;

    /**
     * Convenient way of seeing what this object represents in the debugger, shouldn't be used for production code
     */
    public get __debugDisplay(): string {
        return this.name.toString();
    }
}
