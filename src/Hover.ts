// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

// tslint:disable max-classes-per-file // Grandfathered in

import * as Json from "./JSON";
import * as language from "./Language";
import { UserFunctionDefinition } from "./UserFunctionDefinition";
import { UserFunctionNamespaceDefinition } from "./UserFunctionNamespaceDefinition";
import { UserFunctionParameterDefinition } from "./UserFunctionParameterDefinition";

/**
 * The information that will be displayed when the cursor hovers over parts of a document.
 */
export abstract class Info {
    constructor(private readonly _span: language.Span) {
    }

    public abstract getHoverText(): string;

    public get span(): language.Span {
        return this._span;
    }

    /**
     * Convenient way of seeing what this object represents in the debugger, shouldn't be used for production code
     */
    public get __debugDisplay(): string {
        return this.getHoverText();
    }
}

/**
 * The information that will be displayed when the cursor hovers over a TLE function.
 */
export class FunctionInfo extends Info {
    constructor(private _name: string, private _usage: string, private _description: string, _functionNameSpan: language.Span) {
        super(_functionNameSpan);
    }

    public getHoverText(): string {
        return `**${this._usage}**${(this._description ? `\n${this._description}` : ``)}`;
    }

    public get functionName(): string {
        return this._name;
    }
}

/**
 * The information that will be displayed when the cursor hovers over a TLE function.
 */
export class UserFunctionInfo extends Info {
    constructor(private _namespace: UserFunctionNamespaceDefinition, private _function: UserFunctionDefinition, _span: language.Span) {
        super(_span);
    }

    public getHoverText(): string {
        const ns = this._namespace.namespaceName.unquotedValue;
        const name = this._function.name.unquotedValue;
        const params: UserFunctionParameterDefinition[] = this._function.parameterDefinitions;
        const usage: string = `${ns}.${name}(${params.map(getParamUsage).join(", ")})`;

        return `**${usage}** User-defined function`;

        function getParamUsage(pd: UserFunctionParameterDefinition): string {
            const paramName = pd.name.unquotedValue;
            const paramTypeValue: Json.StringValue | null = Json.asStringValue(pd.type);
            const paramType: string | null = paramTypeValue && paramTypeValue.unquotedValue;
            const paramTypeLC: string | null = paramType && paramType.toLowerCase();

            return paramTypeLC ? `${paramName} [${paramTypeLC}]` : paramName;
        }
    }
}

/**
 * The information that will be displayed when the cursor hovers over a TLE parameter reference.
 */
export class ParameterReferenceInfo extends Info {
    constructor(private _name: string, private _description: string | null, _parameterNameSpan: language.Span) {
        super(_parameterNameSpan);
    }

    public getHoverText(): string {
        return `**${this._name}** (parameter)${(this._description ? `\n${this._description}` : "")}`;
    }
}

/**
 * The information that will be displayed when the cursor hovers over a TLE variable reference.
 */
export class VariableReferenceInfo extends Info {
    constructor(private _name: string, _variableNameSpan: language.Span) {
        super(_variableNameSpan);
    }

    public getHoverText(): string {
        return `**${this._name}** (variable)`;
    }
}
