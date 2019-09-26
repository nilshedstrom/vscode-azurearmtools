// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { TLE } from "../extension.bundle";
import { Property } from "../src/JSON";
import { ParameterDefinition } from "../src/ParameterDefinition";
import { ITemplateScope } from "../src/TemplateScope";
import { UserFunctionNamespaceDefinition } from "../src/UserFunctionNamespaceDefinition";

export class FakeScope implements ITemplateScope {
    public parameterDefinitions: ParameterDefinition[] = [];
    public variableDefinitions: Property[] = [];
    public namespaceDefinitions: UserFunctionNamespaceDefinition[] = [];

    // public isInUserFunction(): boolean {
    //     return false;
    // }
}

export function parse(stringValue: string): TLE.ParseResult {
    return TLE.Parser.parse(stringValue, new FakeScope());
}
