// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { assert } from './fixed_assert';
import * as Json from "./JSON";
import * as language from "./Language";
import { UserFunctionDefinition } from "./UserFunctionDefinition";

/**
 * This class represents the definition of a user-defined namespace in a deployment template.
 */
export class UserFunctionNamespaceDefinition {
    /* Example:

            "functions": [
                {
                    "namespace": "contoso",
                    "members": {
                        "uniqueName": {
                            "parameters": [
                                {
                                    "name": "namePrefix",
                                    "type": "string"
                                }
                            ],
                            "output": {
                            "type": "string",
                            "value": "[concat(toLower(parameters('namePrefix')), uniqueString(resourceGroup().id))]"
                            }
                        }
                    }
                }
            ],
        */

    private _members: UserFunctionDefinition[] | undefined;

    private constructor(private _value: Json.ObjectValue, private _name: Json.StringValue) {
        assert(_value);
    }

    public static createIfValid(value: Json.ObjectValue): UserFunctionNamespaceDefinition | null { //asdf
        let nameValue: Json.StringValue | null = Json.asStringValue(value.getPropertyValue("namespace"));
        if (nameValue && nameValue.toString()) {
            return new UserFunctionNamespaceDefinition(value, nameValue);
        }

        return null;
    }

    public get namespaceName(): Json.StringValue {
        return this._name;
    }

    public get span(): language.Span {
        return this._value.span;
    }

    public get members(): UserFunctionDefinition[] {
        if (!this._members) {
            this._members = [];

            const members: Json.ObjectValue | null = Json.asObjectValue(this._value.getPropertyValue("members"));
            if (members) {
                for (let member of members.properties) {
                    let name: Json.StringValue = member.name;
                    let value = Json.asObjectValue(member.value);
                    if (value) {
                        let func = new UserFunctionDefinition(name, value);
                        this._members.push(func);
                    }
                }
            }
        }

        return this._members;
    }

    public getMemberDefinition(functionName: string): UserFunctionDefinition | undefined {
        assert(!!functionName, "functionName cannot be null, undefined, or empty");
        let functionNameLC = functionName.toLowerCase();
        return this.members.find(fd => fd.name.toString().toLowerCase() === functionNameLC);
    }
}
