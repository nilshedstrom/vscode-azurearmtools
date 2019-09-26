// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { DeploymentTemplate } from "../DeploymentTemplate";
import { assert } from '../fixed_assert';
import * as Json from "../JSON";
import * as language from "../Language";
import * as TLE from "../TLE";

/**
 * asdf
 */
export class ReferenceInVariableDefinitionJSONVisitor extends Json.Visitor {
    private _referenceSpans: language.Span[] = [];

    constructor(private _deploymentTemplate: DeploymentTemplate) {
        super();

        assert(_deploymentTemplate);
    }

    public get referenceSpans(): language.Span[] {
        return this._referenceSpans;
    }

    public visitStringValue(value: Json.StringValue): void {
        assert(value, "Cannot visit a null or undefined Json.StringValue.");

        const tleParseResult: TLE.ParseResult | null = this._deploymentTemplate.getTLEParseResultFromJSONStringValue(value);
        if (tleParseResult && tleParseResult.expression) {
            const tleVisitor = new ReferenceInVariableDefinitionTLEVisitor();
            tleParseResult.expression.accept(tleVisitor);

            const jsonValueStartIndex: number = value.startIndex;
            for (const tleReferenceSpan of tleVisitor.referenceSpans) {
                this._referenceSpans.push(tleReferenceSpan.translate(jsonValueStartIndex));
            }
        }
    }
}

/**
 * asdf
 */
class ReferenceInVariableDefinitionTLEVisitor extends TLE.Visitor { //asdf
    private _referenceSpans: language.Span[] = [];

    public get referenceSpans(): language.Span[] {
        return this._referenceSpans;
    }

    public visitFunctionCall(functionValue: TLE.FunctionCallValue | null): void {
        if (functionValue && functionValue.doesNameMatch("", "reference")) {
            this._referenceSpans.push(functionValue.nameToken.span);
        }

        super.visitFunctionCall(functionValue);
    }
}
