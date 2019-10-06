// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import * as assert from "assert";
import { CachedValue } from "./CachedValue";
import * as Json from "./JSON";
import { OutputDefinition } from "./OutputDefinition";
import { UserFunctionParameterDefinition } from "./UserFunctionParameterDefinition";

/**
 * This class represents the definition of a user-defined function in a deployment template.
 */
export class UserFunctionDefinition {
    private _output: CachedValue<OutputDefinition | null> = new CachedValue<OutputDefinition | null>();
    private _parameterDefinitions: CachedValue<UserFunctionParameterDefinition[]> = new CachedValue<UserFunctionParameterDefinition[]>();

    constructor(private _name: Json.StringValue, public readonly objectValue: Json.ObjectValue) {
        assert(_name);
        assert(objectValue);
    }

    public get name(): Json.StringValue {
        return this._name;
    }

    public get output(): OutputDefinition | null {
        return this._output.getOrCacheValue(() => {
            let output = Json.asObjectValue(this.objectValue.getPropertyValue("output"));
            if (output) {
                return new OutputDefinition(output);
            }

            return null;
        });
    }

    public get parameterDefinitions(): UserFunctionParameterDefinition[] { //asdf extract?
        return this._parameterDefinitions.getOrCacheValue(() => {
            const parameterDefinitions: UserFunctionParameterDefinition[] = [];

            // User-function parameters are an ordered array, not an object
            const parametersArray: Json.ArrayValue | null = Json.asArrayValue(this.objectValue.getPropertyValue("parameters")); //testpoint
            if (parametersArray) {
                for (const parameter of parametersArray.elements) {
                    const parameterObject = Json.asObjectValue(parameter);
                    if (parameterObject) {
                        const parameterDefinition = UserFunctionParameterDefinition.createIfValid(parameterObject);
                        if (parameterDefinition) {
                            parameterDefinitions.push(parameterDefinition); //testpoint
                        }
                    }
                }
            }

            return parameterDefinitions;
        });
    }
}
