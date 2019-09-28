// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { CachedValue } from "./CachedValue";
import * as Json from "./JSON";
import { ParameterDefinition } from "./ParameterDefinition";
import { UserFunctionNamespaceDefinition } from "./UserFunctionNamespaceDefinition";

export interface ITemplateScope {
    parameterDefinitions: ParameterDefinition[];
    variableDefinitions: Json.Property[];
    namespaceDefinitions: UserFunctionNamespaceDefinition[];
}

export class TemplateScope implements ITemplateScope {
    private _parameterDefinitions: CachedValue<ParameterDefinition[]> = new CachedValue<ParameterDefinition[]>();
    private _variableDefinitions: CachedValue<Json.Property[]> = new CachedValue<Json.Property[]>();

    // Represents the "functions" section (which is an array of namespace definitions)
    // https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-authoring-templates#functions
    private _namespaceDefinitions: CachedValue<UserFunctionNamespaceDefinition[]> = new CachedValue<UserFunctionNamespaceDefinition[]>();

    /**
     * Constructor
     * @param scopeObjectValue The JSON object representing this scope (i.e., containing
     * the "parameters" and "variables" properties, or else null if none
     * (if the deployment template is malformed, there may be no top-level object)
     */
    constructor(private _scopeObjectValue: Json.ObjectValue | null) {
    }

    public get parameterDefinitions(): ParameterDefinition[] {
        return this._parameterDefinitions.getOrCacheValue(() => {
            const parameterDefinitions: ParameterDefinition[] = []; //testpoint

            if (this._scopeObjectValue) {
                const parameters: Json.ObjectValue | null = Json.asObjectValue(this._scopeObjectValue.getPropertyValue("parameters")); //testpoint
                if (parameters) {
                    for (const parameter of parameters.properties) {
                        parameterDefinitions.push(new ParameterDefinition(parameter)); //testpoint
                    }
                }
            }

            return parameterDefinitions;
        });
    }

    // asdf just repeat those from the owner
    public get variableDefinitions(): Json.Property[] {
        return this._variableDefinitions.getOrCacheValue(() => {
            if (this._scopeObjectValue) {
                const variables: Json.ObjectValue | null = Json.asObjectValue(this._scopeObjectValue.getPropertyValue("variables")); //testpoint
                if (variables) {
                    return variables.properties; //testpoint
                }
            }

            return []; //testpoint
        });
    }

    // asdf just repeat those from the owner
    public get namespaceDefinitions(): UserFunctionNamespaceDefinition[] {
        return this._namespaceDefinitions.getOrCacheValue(() => {
            const namespaceDefinitions: UserFunctionNamespaceDefinition[] = [];

            // Example:
            //
            // "functions": [
            //     { << This is a UserFunctionNamespaceDefinition
            //       "namespace": "<namespace-for-functions>",
            //       "members": { << This is a UserFunctionDefinition
            //         "<function-name>": {
            //           "parameters": [
            //             {
            //               "name": "<parameter-name>",
            //               "type": "<type-of-parameter-value>"
            //             }
            //           ],
            //           "output": {
            //             "type": "<type-of-output-value>",
            //             "value": "<function-return-value>"
            //           }
            //         }
            //       }
            //     }
            //   ],

            if (this._scopeObjectValue) {
                const functionNamespacesArray: Json.ArrayValue | null = Json.asArrayValue(this._scopeObjectValue.getPropertyValue("functions"));
                if (functionNamespacesArray) {
                    for (let namespaceElement of functionNamespacesArray.elements) {
                        const namespaceObject = Json.asObjectValue(namespaceElement);
                        if (namespaceObject) {
                            let namespace = UserFunctionNamespaceDefinition.createIfValid(namespaceObject);
                            if (namespace) {
                                namespaceDefinitions.push(namespace);
                            }
                        }
                    }
                }
            }

            return namespaceDefinitions;
        });
    }
}
