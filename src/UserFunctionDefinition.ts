// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import * as assert from "assert";
import { CachedValue } from "./CachedValue";
import * as Json from "./JSON";
import { OutputDefinition } from "./OutputDefinition";

/**
 * This class represents the definition of a user-defined function in a deployment template.
 */
export class UserFunctionDefinition {
    private _output: CachedValue<OutputDefinition | null> = new CachedValue<OutputDefinition | null>();

    constructor(private _name: Json.StringValue, private _value: Json.ObjectValue) {
        assert(_name);
        assert(_value);
    }

    public get name(): Json.StringValue {
        return this._name;
    }

    public get output(): OutputDefinition | null {
        return this._output.getOrCacheValue(() => {
            let output = Json.asObjectValue(this._value.getPropertyValue("output"));
            if (output) {
                return new OutputDefinition(output);
            }

            return null;
        });
    }

    // asdf: parameters
    // asdf: output

    //    public get description(): string {

    // if (this._description === undefined) {
    //     this._description = null;

    //     const parameterDefinition: Json.ObjectValue = Json.asObjectValue(this._property.value);
    //     if (parameterDefinition) {
    //         const metadata: Json.ObjectValue = Json.asObjectValue(parameterDefinition.getPropertyValue("metadata"));
    //         if (metadata) {
    //             const description: Json.StringValue = Json.asStringValue(metadata.getPropertyValue("description"));
    //             if (description) {
    //                 this._description = description.toString();
    //             }
    //         }
    //     }
    // }
    // return this._description;
    // }
}
