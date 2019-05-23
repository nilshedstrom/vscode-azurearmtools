// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { CachedValue } from "./CachedValue";
import { DeploymentTemplate } from "./DeploymentTemplate";
import { assert } from "./fixed_assert";
import * as Json from "./JSON";
import { ParameterDefinition } from "./ParameterDefinition";

export interface ITemplateScope {
    parameterDefinitions: ParameterDefinition[];
    variableDefinitions: Json.Property[];
}

export class TemplateScope implements ITemplateScope {
    // At least one of these must be non-null
    // asdf private _deploymentTemplate: DeploymentTemplate | null;
    // private _scopeObjectValue: Json.ObjectValue | null;

    private _parameterDefinitions: CachedValue<ParameterDefinition[]> = new CachedValue<ParameterDefinition[]>();
    private _variableDefinitions: CachedValue<Json.Property[]> = new CachedValue<Json.Property[]>();

    /**
     * Constructor
     * @param scopeObjectValue The JSON object representing this scope (i.e., containing
     * the "parameters" and "variables" properties, or else null if none
     * (if the deployment template is malformed, there may be no top-level object)asdf
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
}

export interface ITemplateScopeContext {
    isInUserFunction(): boolean;
}

export class TemplateScopeContext {
    constructor(_template: DeploymentTemplate, _value: Json.Value) {
        //assert(_token.type === Json.TokenType.QuotedString, "Scope token must be the quoted string that contains the expression");
        assert(_template); //testpoint
        assert(_value);
    }

    public isInUserFunction(): boolean {
        return false; //testpoint
    }
}
