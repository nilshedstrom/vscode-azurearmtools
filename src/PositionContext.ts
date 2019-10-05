// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

// tslint:disable:max-line-length

import { AzureRMAssets, FunctionMetadata } from "./AzureRMAssets";
import { CachedPromise } from "./CachedPromise";
import { CachedValue } from "./CachedValue";
import * as Completion from "./Completion";
import { __debugMarkPositionInString } from "./debugMarkStrings";
import { DeploymentTemplate } from "./DeploymentTemplate";
import { assert } from './fixed_assert';
import * as Hover from "./Hover";
import { IParameterDefinition } from "./IParameterDefinition";
import * as Json from "./JSON";
import * as language from "./Language";
import { ParameterDefinition } from "./ParameterDefinition";
import * as Reference from "./Reference";
import { TemplateScope } from "./TemplateScope";
import * as TLE from "./TLE";

/**
 * Represents a position inside the snapshot of a deployment template, plus all related information
 * that can be parsed and analyzed about it
 */
export class PositionContext {
    private _deploymentTemplate: DeploymentTemplate; //asdf needed?
    private _givenDocumentPosition?: language.Position;
    private _documentPosition: CachedValue<language.Position> = new CachedValue<language.Position>();
    private _givenDocumentCharacterIndex?: number;
    private _documentCharacterIndex: CachedValue<number> = new CachedValue<number>();
    private _jsonToken: CachedValue<Json.Token | null> = new CachedValue<Json.Token>();
    private _jsonValue: CachedValue<Json.Value | null> = new CachedValue<Json.Value | null>();
    private _tleInfo: CachedValue<TleInfo | null> = new CachedValue<TleInfo | null>();
    private _hoverInfo: CachedPromise<Hover.Info | null> = new CachedPromise<Hover.Info | null>();
    private _completionItems: CachedPromise<Completion.Item[]> = new CachedPromise<Completion.Item[]>();
    private _parameterDefinition: CachedValue<IParameterDefinition | null> = new CachedValue<ParameterDefinition | null>();
    private _variableDefinition: CachedValue<Json.Property | null> = new CachedValue<Json.Property | null>();
    private _references: CachedValue<Reference.List | null> = new CachedValue<Reference.List | null>();
    private _signatureHelp: CachedPromise<TLE.FunctionSignatureHelp | null> = new CachedPromise<TLE.FunctionSignatureHelp | null>();

    public static fromDocumentLineAndColumnIndexes(deploymentTemplate: DeploymentTemplate, documentLineIndex: number, documentColumnIndex: number): PositionContext {
        assert(deploymentTemplate !== null, "deploymentTemplate cannot be null");
        assert(deploymentTemplate !== undefined, "deploymentTemplate cannot be undefined");
        assert(documentLineIndex !== null, "documentLineIndex cannot be null");
        assert(documentLineIndex !== undefined, "documentLineIndex cannot be undefined");
        assert(documentLineIndex >= 0, "documentLineIndex cannot be negative");
        assert(documentLineIndex < deploymentTemplate.lineCount, `documentLineIndex (${documentLineIndex}) cannot be greater than or equal to the deployment template's line count (${deploymentTemplate.lineCount})`);
        assert(documentColumnIndex !== null, "documentColumnIndex cannot be null");
        assert(documentColumnIndex !== undefined, "documentColumnIndex cannot be undefined");
        assert(documentColumnIndex >= 0, "documentColumnIndex cannot be negative");
        assert(documentColumnIndex <= deploymentTemplate.getMaxColumnIndex(documentLineIndex), `documentColumnIndex (${documentColumnIndex}) cannot be greater than the line's maximum index (${deploymentTemplate.getMaxColumnIndex(documentLineIndex)})`);

        // asdf refactor with private constructor
        let context = new PositionContext();
        context._deploymentTemplate = deploymentTemplate;
        context._givenDocumentPosition = new language.Position(documentLineIndex, documentColumnIndex);
        return context;

    }
    public static fromDocumentCharacterIndex(deploymentTemplate: DeploymentTemplate, documentCharacterIndex: number): PositionContext {
        assert(deploymentTemplate !== null, "deploymentTemplate cannot be null");
        assert(deploymentTemplate !== undefined, "deploymentTemplate cannot be undefined");
        assert(documentCharacterIndex !== null, "documentCharacterIndex cannot be null");
        assert(documentCharacterIndex !== undefined, "documentCharacterIndex cannot be undefined");
        assert(documentCharacterIndex >= 0, "documentCharacterIndex cannot be negative");
        assert(documentCharacterIndex <= deploymentTemplate.maxCharacterIndex, `documentCharacterIndex (${documentCharacterIndex}) cannot be greater than the maximum character index (${deploymentTemplate.maxCharacterIndex})`);

        let context = new PositionContext();
        context._deploymentTemplate = deploymentTemplate;
        context._givenDocumentCharacterIndex = documentCharacterIndex;
        return context;
    }

    /**
     * Convenient way of seeing what this object represents in the debugger, shouldn't be used for production code
     */
    public get __debugDisplay(): string {
        let docText: string = this._deploymentTemplate.documentText;
        return __debugMarkPositionInString(docText, this.documentCharacterIndex, "<<POSITION>>");
    }

    /**
     * Convenient way of seeing what this object represents in the debugger, shouldn't be used for production code
     */
    public get __debugFullDisplay(): string {
        let docText: string = this._deploymentTemplate.documentText;
        return __debugMarkPositionInString(docText, this.documentCharacterIndex, "<<POSITION>>", Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    }

    public get documentPosition(): language.Position {
        return this._documentPosition.getOrCacheValue(() => {
            if (this._givenDocumentPosition) {
                return this._givenDocumentPosition;
            } else {
                return this._deploymentTemplate.getDocumentPosition(this.documentCharacterIndex);
            }
        });
    }

    public get documentLineIndex(): number {
        return this.documentPosition.line;
    }

    public get documentColumnIndex(): number {
        return this.documentPosition.column;
    }

    public get documentCharacterIndex(): number {
        return this._documentCharacterIndex.getOrCacheValue(() => {
            if (typeof this._givenDocumentCharacterIndex === "number") {
                return this._givenDocumentCharacterIndex;
            } else {
                return this._deploymentTemplate.getDocumentCharacterIndex(this.documentLineIndex, this.documentColumnIndex);
            }
        });
    }

    public get jsonToken(): Json.Token | null {
        return this._jsonToken.getOrCacheValue(() => {
            return this._deploymentTemplate.getJSONTokenAtDocumentCharacterIndex(this.documentCharacterIndex);
        });
    }

    public get jsonValue(): Json.Value | null {
        return this._jsonValue.getOrCacheValue(() => {
            return this._deploymentTemplate.getJSONValueAtDocumentCharacterIndex(this.documentCharacterIndex);
        });
    }

    public get jsonTokenStartIndex(): number {
        assert(!!this.jsonToken, "The jsonTokenStartIndex can only be requested when the PositionContext is inside a JSONToken.");
        // tslint:disable-next-line:no-non-null-assertion no-unnecessary-type-assertion // Asserted
        return this.jsonToken!.span.startIndex;
    }

    /**
     * Retrieves TleInfo for the current position if it's inside a string
     */
    public get tleInfo(): TleInfo | null {
        return this._tleInfo.getOrCacheValue(() => {
            //const tleParseResult = this._deploymentTemplate.getTLEParseResultFromJSONToken(this.jsonToken);
            const jsonToken = this.jsonToken;
            if (
                jsonToken
                && jsonToken.type === Json.TokenType.QuotedString
                && this.jsonValue
                && this.jsonValue instanceof Json.StringValue
            ) { //asdfasdf
                const tleParseResult = this._deploymentTemplate.getTLEParseResultFromJSONStringValue(this.jsonValue);
                if (tleParseResult) {
                    const tleCharacterIndex = this.documentCharacterIndex - this.jsonTokenStartIndex;
                    const tleValue = tleParseResult.getValueAtCharacterIndex(tleCharacterIndex);
                    return new TleInfo(tleParseResult, tleCharacterIndex, tleValue, tleParseResult.scope);
                }
            }
            return null;
        });
    }

    public get emptySpanAtDocumentCharacterIndex(): language.Span {
        return new language.Span(this.documentCharacterIndex, 0);
    }

    public get hoverInfo(): Promise<Hover.Info | null> {
        return this._hoverInfo.getOrCachePromise(async () => {
            const tleInfo = this.tleInfo;
            if (tleInfo) {
                const tleValue: TLE.Value | null = tleInfo.tleValue; //testpoint
                const scope = tleInfo.scope;
                if (tleValue instanceof TLE.FunctionCallValue) {
                    if (tleValue.nameToken.span.contains(tleInfo.tleCharacterIndex)) {
                        if (tleValue.namespaceToken) {
                            const ns = tleValue.namespaceToken.stringValue;
                            const name = tleValue.nameToken.stringValue;
                            const nsDefinition = scope.getFunctionNamespaceDefinition(ns);
                            const definition = scope.getFunctionDefinition(ns, name);
                            if (nsDefinition && definition) {
                                const hoverSpan: language.Span = tleValue.nameToken.span.translate(this.jsonTokenStartIndex); //testpoint
                                return new Hover.UserFunctionInfo(nsDefinition, definition, hoverSpan);
                            }
                        } else {
                            const functionMetadata: FunctionMetadata | undefined = await AzureRMAssets.getFunctionMetadataFromName(tleValue.nameToken.stringValue); //testpoint
                            if (functionMetadata) {
                                const hoverSpan: language.Span = tleValue.nameToken.span.translate(this.jsonTokenStartIndex); //testpoint
                                return new Hover.FunctionInfo(functionMetadata.name, functionMetadata.usage, functionMetadata.description, hoverSpan);
                            }
                        }
                        return null;
                    }
                } else if (tleValue instanceof TLE.StringValue) {
                    if (tleValue.isParametersArgument()) { //testpoint
                        const parameterDefinition: IParameterDefinition | null = scope.getParameterDefinition(tleValue.toString()); //testpoint
                        if (parameterDefinition) {
                            const hoverSpan: language.Span = tleValue.getSpan().translate(this.jsonTokenStartIndex); //testpoint
                            return new Hover.ParameterReferenceInfo(parameterDefinition.name.toString(), parameterDefinition.description, hoverSpan);
                        }
                    } else if (tleValue.isVariablesArgument()) {
                        const variableDefinition: Json.Property | null = scope.getVariableDefinition(tleValue.toString()); //testpoint
                        if (variableDefinition) { //testpoint
                            const hoverSpan: language.Span = tleValue.getSpan().translate(this.jsonTokenStartIndex); //testpoint
                            return new Hover.VariableReferenceInfo(variableDefinition.name.toString(), hoverSpan);
                        }
                    }
                }
            }

            return null;
        });
    }

    /**
     * Get completion items for our position in the document
     */
    public async getCompletionItems(): Promise<Completion.Item[]> {
        return this._completionItems.getOrCachePromise(async () => {
            const tleInfo = this.tleInfo;
            if (!tleInfo) {
                // No string at this position
                return []; //testpoint
            }

            // We're inside a JSON string. It may or may not contain square brackets.

            // The function/string/number/etc at the current position inside the string expression,
            // or else the JSON string itself even it's not an expression
            const tleValue: TLE.Value | null = tleInfo.tleValue;
            const scope: TemplateScope = tleInfo.scope;

            if (!tleValue || !tleValue.contains(tleInfo.tleCharacterIndex)) {
                // No TLE value here. For instance, expression is empty, or before/after/on the square brackets
                if (PositionContext.isInsideSquareBrackets(tleInfo.tleParseResult, tleInfo.tleCharacterIndex)) { //testpoint
                    // Inside brackets, so complete with all valid functions
                    return await PositionContext.getMatchingFunctionCompletions("", this.emptySpanAtDocumentCharacterIndex); //testpoint
                } else {
                    return []; //testpoint
                }

            } else if (tleValue instanceof TLE.FunctionCallValue) {
                return this.getFunctionCallCompletions(tleValue, tleInfo.tleCharacterIndex, scope); //testpoint
            } else if (tleValue instanceof TLE.StringValue) {
                return this.getStringLiteralCompletions(tleValue, tleInfo.tleCharacterIndex, scope); //testpoint
            } else if (tleValue instanceof TLE.PropertyAccess) {
                return await this.getPropertyAccessCompletions(tleValue, tleInfo.tleCharacterIndex, scope); //testpoint
            }

            return []; //testpoint
        });
    }

    /**
     * Given position in expression is past the left square bracket and before the right square bracket,
     * *or* there is no square bracket yet
     */
    private static isInsideSquareBrackets(parseResult: TLE.ParseResult, characterIndex: number): boolean {
        const leftSquareBracketToken: TLE.Token | null = parseResult.leftSquareBracketToken;
        const rightSquareBracketToken: TLE.Token | null = parseResult.rightSquareBracketToken;

        if (leftSquareBracketToken && leftSquareBracketToken.span.afterEndIndex <= characterIndex &&
            (!rightSquareBracketToken || characterIndex <= rightSquareBracketToken.span.startIndex)) {
            return true; //testpoint
        }

        return false;
    }

    /**
     * Get completions when we're anywhere inside a string literal
     */
    private getStringLiteralCompletions(tleValue: TLE.StringValue, tleCharacterIndex: number, scope: TemplateScope): Completion.Item[] {
        // Start at index 1 to skip past the opening single-quote.
        const prefix: string = tleValue.toString().substring(1, tleCharacterIndex - tleValue.getSpan().startIndex);

        if (tleValue.isParametersArgument()) { //testpoint
            // The string is a parameter name inside a parameters('xxx') function
            return this.getMatchingParameterCompletions(prefix, tleValue, tleCharacterIndex, scope); //testpoint
        } else if (tleValue.isVariablesArgument()) {
            // The string is a variable name inside a variables('xxx') function
            return this.getMatchingVariableCompletions(prefix, tleValue, tleCharacterIndex, scope); //testpoint
        }

        return [];
    }

    /**
     * Get completions when we're anywhere inside a property accesses, e.g. "resourceGroup().prop1.prop2"
     */
    private async getPropertyAccessCompletions(tleValue: TLE.PropertyAccess, tleCharacterIndex: number, scope: TemplateScope): Promise<Completion.Item[]> {
        const functionSource: TLE.FunctionCallValue | null = tleValue.functionSource;
        if (functionSource) { //testpoint
            let propertyPrefix: string = "";
            let replaceSpan: language.Span = this.emptySpanAtDocumentCharacterIndex;
            const propertyNameToken: TLE.Token | null = tleValue.nameToken;
            if (propertyNameToken) {
                replaceSpan = propertyNameToken.span.translate(this.jsonTokenStartIndex); //testpoint
                propertyPrefix = propertyNameToken.stringValue.substring(0, tleCharacterIndex - propertyNameToken.span.startIndex).toLowerCase();
            }

            const variableProperty: Json.Property | null = scope.getVariableDefinitionFromFunctionCall(functionSource);
            const parameterProperty: IParameterDefinition | null = scope.getParameterDefinitionFromFunctionCall(functionSource);
            const sourcesNameStack: string[] = tleValue.sourcesNameStack;
            if (variableProperty) { //testpoint
                // If the variable's value is an object...
                const sourceVariableDefinition: Json.ObjectValue | null = Json.asObjectValue(variableProperty.value);
                if (sourceVariableDefinition) {
                    return this.getDeepPropertyAccessCompletions(//testpoint
                        propertyPrefix,
                        sourceVariableDefinition,
                        sourcesNameStack,
                        replaceSpan);
                }
            } else if (parameterProperty) { //testpoint
                // If the parameters's default value is an object...
                const parameterDefValue: Json.ObjectValue | null = parameterProperty.defaultValue ? Json.asObjectValue(parameterProperty.defaultValue) : null;
                if (parameterDefValue) {
                    const sourcePropertyDefinition: Json.ObjectValue | null = Json.asObjectValue(parameterDefValue.getPropertyValueFromStack(sourcesNameStack));
                    if (sourcePropertyDefinition) {
                        return this.getDeepPropertyAccessCompletions(//testpoint
                            propertyPrefix,
                            sourcePropertyDefinition,
                            sourcesNameStack,
                            replaceSpan);
                    }
                }
            } else if (sourcesNameStack.length === 0) { //testpoint
                // We don't allow multiple levels of property access
                // (resourceGroup().prop1.prop2) on functions other than variables/parameters,
                // therefore checking that sourcesNameStack.length === 0
                const functionName: string = functionSource.nameToken.stringValue;
                let functionMetadataMatches: FunctionMetadata[] = await AzureRMAssets.getFunctionMetadataFromPrefix(functionName);
                assert(functionMetadataMatches);

                const result: Completion.Item[] = [];
                if (functionMetadataMatches.length === 1) {
                    const functionMetadata: FunctionMetadata = functionMetadataMatches[0];
                    for (const returnValueMember of functionMetadata.returnValueMembers) { //testpoint
                        if (propertyPrefix === "" || returnValueMember.toLowerCase().startsWith(propertyPrefix)) { //testpoint
                            result.push(PositionContext.createPropertyCompletionItem(returnValueMember, replaceSpan)); //testpoint
                        }
                    }

                    return result;
                }
            }
        }

        return [];
    }

    /**
     * Return completions when we're anywhere inside a function call expression
     */
    private async getFunctionCallCompletions(tleValue: TLE.FunctionCallValue, tleCharacterIndex: number, scope: TemplateScope): Promise<Completion.Item[]> {
        if (tleValue.nameToken.span.contains(tleCharacterIndex, true)) { //testpoint
            // The caret is inside the TLE function's name
            const functionNameStartIndex: number = tleValue.nameToken.span.startIndex;
            const functionNamePrefix: string = tleValue.nameToken.stringValue.substring(0, tleCharacterIndex - functionNameStartIndex);

            let replaceSpan: language.Span;
            if (functionNamePrefix.length === 0) {
                replaceSpan = this.emptySpanAtDocumentCharacterIndex; //testpoint
            } else {
                replaceSpan = tleValue.nameToken.span.translate(this.jsonTokenStartIndex); //testpoint
            }

            return await PositionContext.getMatchingFunctionCompletions(functionNamePrefix, replaceSpan);
        } else if (tleValue.leftParenthesisToken && tleCharacterIndex <= tleValue.leftParenthesisToken.span.startIndex) {
            // The caret is between the function name and the left parenthesis (with whitespace between them)
            return await PositionContext.getMatchingFunctionCompletions("", this.emptySpanAtDocumentCharacterIndex); //testpoint
        } else {
            if (tleValue.isBuiltin("parameters") && tleValue.argumentExpressions.length === 0) { //testpoint
                return this.getMatchingParameterCompletions("", tleValue, tleCharacterIndex, scope); //testpoint
            } else if (tleValue.isBuiltin("variables") && tleValue.argumentExpressions.length === 0) {
                return this.getMatchingVariableCompletions("", tleValue, tleCharacterIndex, scope); //testpoint
            } else {
                return await PositionContext.getMatchingFunctionCompletions("", this.emptySpanAtDocumentCharacterIndex); //testpoint
            }
        }
    }

    private getDeepPropertyAccessCompletions(propertyPrefix: string, variableOrParameterDefinition: Json.ObjectValue, sourcesNameStack: string[], replaceSpan: language.Span): Completion.Item[] {
        const result: Completion.Item[] = [];

        const sourcePropertyDefinition: Json.ObjectValue | null = Json.asObjectValue(variableOrParameterDefinition.getPropertyValueFromStack(sourcesNameStack));
        if (sourcePropertyDefinition) {
            let matchingPropertyNames: string[]; //testpoint
            if (!propertyPrefix) {
                matchingPropertyNames = sourcePropertyDefinition.propertyNames; //testpoint
            } else {
                matchingPropertyNames = []; //testpoint
                for (const propertyName of sourcePropertyDefinition.propertyNames) {
                    if (propertyName.startsWith(propertyPrefix)) { //testpoint
                        matchingPropertyNames.push(propertyName); //testpoint
                    }
                }
            }

            for (const matchingPropertyName of matchingPropertyNames) {
                result.push(PositionContext.createPropertyCompletionItem(matchingPropertyName, replaceSpan)); //testpoint
            }
        }

        return result;
    }

    private static createPropertyCompletionItem(propertyName: string, replaceSpan: language.Span): Completion.Item {
        return new Completion.Item(propertyName, `${propertyName}$0`, replaceSpan, "(property)", "", Completion.CompletionKind.Property);
    }

    // Returns null if references are not supported at this location.
    // Returns empty list if supported but none found
    public get references(): Reference.List | null {
        return this._references.getOrCacheValue(() => {
            let referenceName: string | null = null;
            let referenceType: Reference.ReferenceKind | null = null;

            if (this.tleInfo) {
                // Handle variable and parameter uses inside a string expression
                const tleStringValue: TLE.StringValue | null = TLE.asStringValue(this.tleInfo.tleValue);
                let scope: TemplateScope = this.tleInfo.scope;

                // Handle references for "xxx" when we're on "xxx" in a call to parameters('xxx') or references('xxx')
                if (tleStringValue) {
                    referenceName = tleStringValue.toString();

                    if (tleStringValue.isParametersArgument()) { //testpoint
                        // We're inside a parameters('xxx') call
                        referenceType = Reference.ReferenceKind.Parameter;
                    } else if (tleStringValue.isVariablesArgument()) {
                        // We're inside a variables('xxx') call
                        referenceType = Reference.ReferenceKind.Variable; //testpoint
                    }
                }

                // Handle when we're directly on the name in parameter or variable definition
                if (referenceType === null) {
                    const jsonStringValue: Json.StringValue | null = Json.asStringValue(this.jsonValue); //testpoint
                    if (jsonStringValue) {
                        const unquotedString = jsonStringValue.unquotedValue; //testpoint

                        const parameterDefinition: IParameterDefinition | null = scope.getParameterDefinition(unquotedString);
                        if (parameterDefinition && parameterDefinition.name.unquotedValue === unquotedString) { //asdf?
                            referenceName = unquotedString;
                            referenceType = Reference.ReferenceKind.Parameter; //testpoint
                        } else {
                            const variableDefinition: Json.Property | null = scope.getVariableDefinition(unquotedString); //testpoint
                            if (variableDefinition && variableDefinition.name === jsonStringValue) { //testpoint
                                referenceName = unquotedString;
                                referenceType = Reference.ReferenceKind.Variable; //testpoint
                            }
                        }
                    }
                }

                if (referenceName && referenceType !== null) {
                    return this._deploymentTemplate.findReferences(referenceType, referenceName, scope);
                }
            }

            return null;
        });
    }

    public get signatureHelp(): Promise<TLE.FunctionSignatureHelp | null> {
        return this._signatureHelp.getOrCachePromise(async () => {
            const tleValue: TLE.Value | null = this.tleInfo && this.tleInfo.tleValue;
            if (this.tleInfo && tleValue) {
                let functionToHelpWith: TLE.FunctionCallValue | null = TLE.asFunctionValue(tleValue); //testpoint
                if (!functionToHelpWith) {
                    functionToHelpWith = TLE.asFunctionValue(tleValue.parent); //testpoint
                }

                if (functionToHelpWith) {
                    const functionMetadata: FunctionMetadata | undefined = await AzureRMAssets.getFunctionMetadataFromName(functionToHelpWith.nameToken.stringValue); //testpoint
                    if (functionMetadata) {
                        let currentArgumentIndex: number = 0; //testpoint

                        for (const commaToken of functionToHelpWith.commaTokens) {
                            if (commaToken.span.startIndex < this.tleInfo.tleCharacterIndex) {
                                ++currentArgumentIndex; //testpoint
                            }
                        }

                        const functionMetadataParameters: string[] = functionMetadata.parameters;
                        if (functionMetadataParameters.length > 0 &&
                            functionMetadataParameters.length <= currentArgumentIndex &&
                            functionMetadataParameters[functionMetadataParameters.length - 1].endsWith("...")) {

                            currentArgumentIndex = functionMetadataParameters.length - 1; //testpoint
                        }

                        return new TLE.FunctionSignatureHelp(currentArgumentIndex, functionMetadata); //testpoint
                    }
                }
            }

            return null;
        });
    }

    /**
     * If this PositionContext is currently at a parameter reference (inside 'parameterName' in
     * "[parameters('parameterName')])", get the definition of the parameter that is being referenced.
     */
    public get parameterDefinitionIfAtReference(): IParameterDefinition | null {
        return this._parameterDefinition.getOrCacheValue(() => {
            if (this.tleInfo) {
                const tleValue: TLE.Value | null = this.tleInfo.tleValue;
                if (tleValue && tleValue instanceof TLE.StringValue && tleValue.isParametersArgument()) {
                    return this.tleInfo.scope.getParameterDefinition(tleValue.toString()); //testpoint
                }
            }

            return null;
        });
    }

    /**
     * If this PositionContext is currently at a variable reference (inside 'variableName' in
     * "[variables('variableName')])", get the definition of the variable that is being referenced.
     */
    public get variableDefinitionIfAtReference(): Json.Property | null {
        return this._variableDefinition.getOrCacheValue(() => {
            if (this.tleInfo) {
                const tleValue: TLE.Value | null = this.tleInfo.tleValue;
                if (tleValue && tleValue instanceof TLE.StringValue && tleValue.isVariablesArgument()) {
                    return this.tleInfo.scope.getVariableDefinition(tleValue.toString()); //testpoint
                }
            }

            return null;
        });
    }

    /**
     * Given a function name prefix and replacement span, return a list of completions for functions
     * starting with that prefix
     */
    private static async getMatchingFunctionCompletions(prefix: string, replaceSpan: language.Span): Promise<Completion.Item[]> {
        let functionMetadataMatches: FunctionMetadata[];
        if (prefix === "") {
            functionMetadataMatches = (await AzureRMAssets.getFunctionsMetadata()).functionMetadata; //testpoint
        } else {
            functionMetadataMatches = (await AzureRMAssets.getFunctionMetadataFromPrefix(prefix)); //testpoint
        }

        const completionItems: Completion.Item[] = [];
        for (const functionMetadata of functionMetadataMatches) {
            const name: string = functionMetadata.name; //testpoint

            let insertText: string = name;
            if (functionMetadata.maximumArguments === 0) {
                insertText += "()$0";
            } else {
                insertText += "($0)";
            }

            completionItems.push(new Completion.Item(name, insertText, replaceSpan, `(function) ${functionMetadata.usage}`, functionMetadata.description, Completion.CompletionKind.Function)); //testpoint
        }
        return completionItems;
    }

    private getMatchingParameterCompletions(prefix: string, tleValue: TLE.StringValue | TLE.FunctionCallValue, tleCharacterIndex: number, scope: TemplateScope): Completion.Item[] {
        const replaceSpanInfo: ReplaceSpanInfo = this.getReplaceSpanInfo(tleValue, tleCharacterIndex); //testpoint

        const parameterCompletions: Completion.Item[] = [];
        const parameterDefinitionMatches: IParameterDefinition[] = scope.findParameterDefinitionsWithPrefix(prefix);
        for (const parameterDefinition of parameterDefinitionMatches) {
            const name: string = `'${parameterDefinition.name}'`; //testpoint
            parameterCompletions.push(
                new Completion.Item(
                    name,
                    `${name}${replaceSpanInfo.includeRightParenthesisInCompletion ? ")" : ""}$0`,
                    replaceSpanInfo.replaceSpan,
                    `(parameter)`,
                    // tslint:disable-next-line: strict-boolean-expressions
                    parameterDefinition.description,
                    Completion.CompletionKind.Parameter));
        }
        return parameterCompletions;
    }

    private getMatchingVariableCompletions(prefix: string, tleValue: TLE.StringValue | TLE.FunctionCallValue, tleCharacterIndex: number, scope: TemplateScope): Completion.Item[] {
        const replaceSpanInfo: ReplaceSpanInfo = this.getReplaceSpanInfo(tleValue, tleCharacterIndex);

        const variableCompletions: Completion.Item[] = [];
        const variableDefinitionMatches: Json.Property[] = scope.findVariableDefinitionsWithPrefix(prefix); //testpoint
        for (const variableDefinition of variableDefinitionMatches) {
            const variableName: string = `'${variableDefinition.name.toString()}'`; //testpoint
            variableCompletions.push(new Completion.Item(variableName, `${variableName}${replaceSpanInfo.includeRightParenthesisInCompletion ? ")" : ""}$0`, replaceSpanInfo.replaceSpan, `(variable)`, "", Completion.CompletionKind.Variable));
        }
        return variableCompletions;
    }

    private getReplaceSpanInfo(tleValue: TLE.StringValue | TLE.FunctionCallValue, tleCharacterIndex: number): ReplaceSpanInfo {
        let includeRightParenthesisInCompletion: boolean = true;
        let replaceSpan: language.Span;
        if (tleValue instanceof TLE.StringValue) {
            const stringSpan: language.Span = tleValue.getSpan(); //testpoint
            const stringStartIndex: number = stringSpan.startIndex;
            const functionValue: TLE.FunctionCallValue | null = TLE.asFunctionValue(tleValue.parent);

            const rightParenthesisIndex: number = tleValue.toString().indexOf(")");
            const rightSquareBracketIndex: number = tleValue.toString().indexOf("]");
            if (rightParenthesisIndex >= 0) {
                replaceSpan = new language.Span(stringStartIndex, rightParenthesisIndex + 1); //testpoint
            } else if (rightSquareBracketIndex >= 0) {
                replaceSpan = new language.Span(stringStartIndex, rightSquareBracketIndex); //testpoint
            } else if (functionValue && functionValue.rightParenthesisToken && functionValue.argumentExpressions.length === 1) {
                replaceSpan = new language.Span(stringStartIndex, functionValue.rightParenthesisToken.span.afterEndIndex - stringStartIndex); //testpoint
            } else {
                includeRightParenthesisInCompletion = !!functionValue && functionValue.argumentExpressions.length <= 1; //testpoint
                replaceSpan = stringSpan;
            }

            replaceSpan = replaceSpan.translate(this.jsonTokenStartIndex);
        } else {
            if (tleValue.rightParenthesisToken) {
                replaceSpan = new language.Span(//testpoint
                    this.documentCharacterIndex,
                    tleValue.rightParenthesisToken.span.startIndex - tleCharacterIndex + 1);
            } else {
                replaceSpan = this.emptySpanAtDocumentCharacterIndex; //testpoint
            }
        }

        return {
            includeRightParenthesisInCompletion: includeRightParenthesisInCompletion,
            replaceSpan: replaceSpan
        };
    }
}

interface ReplaceSpanInfo {
    includeRightParenthesisInCompletion: boolean;
    replaceSpan: language.Span;
}

interface ITleInfo {
    /**
     * The parse result of the enclosing string, if we're inside a string (it's with an expression or not)
     */
    tleParseResult: TLE.ParseResult;

    /**
     * The index inside the enclosing string, if we're inside a string (whether it's an expression or not)
     */
    tleCharacterIndex: number;

    /**
     * The outermost TLE value enclosing the current position, if we're inside a string
     * (whether it's an expression or not). This can null if inside square brackets but before
     * an expression, etc.
     */
    tleValue: TLE.Value | null;

}

class TleInfo implements ITleInfo {
    public constructor(
        public readonly tleParseResult: TLE.ParseResult,
        public readonly tleCharacterIndex: number,
        public readonly tleValue: TLE.Value | null,
        public readonly scope: TemplateScope
    ) {
    }
}
