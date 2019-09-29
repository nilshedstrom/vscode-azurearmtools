// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { TLE } from "../extension.bundle";
import { Property } from "../src/JSON";
import { ParameterDefinition } from "../src/ParameterDefinition";
import { ITemplateScope, ScopeContext } from "../src/TemplateScope";
import { UserFunctionNamespaceDefinition } from "../src/UserFunctionNamespaceDefinition";

export class FakeScope implements ITemplateScope {
    public parameterDefinitions: ParameterDefinition[] = [];
    public variableDefinitions: Property[] = [];
    public namespaceDefinitions: UserFunctionNamespaceDefinition[] = [];
    public scopeContext: ScopeContext = ScopeContext.Default;
}

export function parse(stringValue: string): TLE.ParseResult {
    return TLE.Parser.parse(stringValue, new FakeScope());
}
