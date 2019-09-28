// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { AzureRMAssets, FunctionsMetadata } from "./AzureRMAssets";
import { CachedPromise } from "./CachedPromise";
import { CachedValue } from "./CachedValue";
import { assert } from "./fixed_assert";
import { Histogram } from "./Histogram";
import * as Json from "./JSON";
import * as language from "./Language";
import { ParameterDefinition } from "./ParameterDefinition";
import { PositionContext } from "./PositionContext";
import * as Reference from "./Reference";
import { isArmSchema } from "./supported";
import { ITemplateScope, TemplateScope } from "./TemplateScope";
import * as TLE from "./TLE";
import { UserFunctionDefinition } from "./UserFunctionDefinition";
import { UserFunctionNamespaceDefinition } from "./UserFunctionNamespaceDefinition";
import * as Utilities from "./Utilities";
import { GenericStringVisitor } from "./visitors/GenericStringVisitor";
import { ReferenceInVariableDefinitionJSONVisitor } from "./visitors/ReferenceInVariableDefinitionJSONVisitor";

export class DeploymentTemplate {
    // Parse result for the template document as a whole
    private _jsonParseResult: Json.ParseResult;

    // The top-level parameters and variables (as opposed to those in user functions and deployment resources)
    private _topLevelScope: ITemplateScope;

    // A list of all JSON tokens in the template that represent quoted strings
    private _jsonQuotedStringTokens: CachedValue<Json.Token[]> = new CachedValue<Json.Token[]>();

    // A map from all quoted string values (not including the surrounding quotes) to the
    //   cached TLE parse, if the string is found in a valid portion of the document tree.
    private _quotedStringToTleParseResultMap: CachedValue<Map<string, TLE.ParseResult>> = new CachedValue<Map<string, TLE.ParseResult>>();

    // All errors and warnings in the template
    private _errors: CachedPromise<language.Issue[]> = new CachedPromise<language.Issue[]>();
    private _warnings: CachedValue<language.Issue[]> = new CachedValue<language.Issue[]>();

    private _schemaUri: CachedValue<string | null> = new CachedValue<string | null>();

    /**
     * Create a new DeploymentTemplate object.
     *
     * @param _documentText The string text of the document.
     * @param _documentId A unique identifier for this document. Usually this will be a URI to the document.
     */
    constructor(private _documentText: string, private _documentId: string) {
        assert(_documentText !== null);
        assert(_documentText !== undefined);
        assert(_documentId);

        this._jsonParseResult = Json.parse(_documentText);
        this._topLevelScope = new TemplateScope(Json.asObjectValue(this.jsonParseResult.value));
    }

    public get topLevelScope(): ITemplateScope {
        return this._topLevelScope;
    }

    public hasArmSchemaUri(): boolean {
        return isArmSchema(this.schemaUri);
    }

    /**
     * A list of all JSON tokens in the template that represent quoted strings
     */
    private get jsonQuotedStringTokens(): Json.Token[] {
        return this._jsonQuotedStringTokens.getOrCacheValue(() => {
            const jsonQuotedStringTokens: Json.Token[] = [];

            for (const jsonToken of this._jsonParseResult.tokens) {
                if (jsonToken.type === Json.TokenType.QuotedString) {
                    jsonQuotedStringTokens.push(jsonToken);
                }
            }

            return jsonQuotedStringTokens;
        });
    }

    /**
     * Parse all JSON strings in valid portions of the template and cache the resulting TLE.ParseResult.
     * Tries to avoid parsing the exact same expression string more than once for a given scope.
     *
     * NOTE: JSON strings in invalid portions of the temlpate may not traverse end up in this map
     *
     * asdf Should be more lazy?
     */
    private get quotedStringToTleParseResultMap(): Map<string, TLE.ParseResult> {
        return this._quotedStringToTleParseResultMap.getOrCacheValue(() => {
            const quotedStringToTleParseResultMap = new Map<string, TLE.ParseResult>();

            for (let jsonQuotedStringToken of this.jsonQuotedStringTokens) {
                let tleParseResult: TLE.ParseResult = TLE.Parser.parse(jsonQuotedStringToken.toString(), this.topLevelScope);
                // Cache the results of this parse by the string's value // asdf: can't map by string value, they might be in different scopes, getting different results.  Need to cache by string and scope
                const unquoted: string = Utilities.unquote(jsonQuotedStringToken.toString()); // not positive about this - "\"" is turning into empty string
                quotedStringToTleParseResultMap.set(unquoted, tleParseResult);

                // // NOTE: Since we're visiting by following valid branches of the parse tree, we may not traverse all JSON string tokens in the text
                // if (this.jsonParseResult.value) {
                //     let visitor = new GenericStringVisitor((stringValue: Json.StringValue): void => {
                //         // asdf better way to go from Json.Value to Json.Token?
                //         // Wny not just use the string value from the Json.Value?
                //         let jsonQuotedStringToken: Json.Token | null = this.getJSONTokenAtDocumentCharacterIndex(stringValue.span.startIndex);
                //         assert(!!jsonQuotedStringToken, "Expected token at this location, because the location came from a StringValue from the JSON parse");

                //         // tslint:disable-next-line:no-non-null-assertion // Asserted
                //         jsonQuotedStringToken = jsonQuotedStringToken!;
                //         assert(jsonQuotedStringToken.type === Json.TokenType.QuotedString, "Expected quoted string token");

                //         // Parse the string as a possible TLE expression
                //         let tleParseResult: TLE.ParseResult = TLE.Parser.parse(
                //             jsonQuotedStringToken.toString(),
                //             this._topLevelScope // asdf new TemplateScopeContext(this, stringValue));
                //         );

                //         // Cache the results of this parse by the string's value without the quotes
                //         // asdf: can't map by string value, they might be in different scopes, getting different results.  Need to cache by string and scope
                //         const unquoted = Utilities.unquote(jsonQuotedStringToken.toString());
                //         quotedStringToTleParseResultMap.set(unquoted, tleParseResult); // asdf Don't parse if already done so
                //     });
                //     this.jsonParseResult.value.accept(visitor);
            }

            return quotedStringToTleParseResultMap;
        });
    }

    /**
     * Get the document text as a string.
     */
    public get documentText(): string {
        return this._documentText;
    }

    /**
     * The unique identifier for this deployment template. Usually this will be a URI to the document.
     */
    public get documentId(): string {
        return this._documentId;
    }

    public get schemaUri(): string | null {
        return this._schemaUri.getOrCacheValue(() => {
            const value: Json.ObjectValue | null = Json.asObjectValue(this._jsonParseResult.value);
            if (value) {
                const schema: Json.Value | null = Json.asStringValue(value.getPropertyValue("$schema"));
                if (schema) {
                    return schema.toString();
                }
            }

            return null;
        });
    }

    public get errors(): Promise<language.Issue[]> {
        return this._errors.getOrCachePromise(async () => {
            // tslint:disable-next-line:typedef
            return new Promise<language.Issue[]>(async (resolve, reject) => {
                try {
                    let functions: FunctionsMetadata = await AzureRMAssets.getFunctionsMetadata();
                    const parseErrors: language.Issue[] = [];
                    for (const jsonQuotedStringToken of this.jsonQuotedStringTokens) {
                        const jsonTokenStartIndex: number = jsonQuotedStringToken.span.startIndex;

                        const tleParseResult: TLE.ParseResult | null = this.getTLEParseResultFromJSONToken(jsonQuotedStringToken);
                        if (tleParseResult) {
                            for (const error of tleParseResult.errors) {
                                parseErrors.push(error.translate(jsonTokenStartIndex));
                            }

                            const tleExpression: TLE.Value | null = tleParseResult.expression;

                            // Undefined parameter/variable references
                            const tleUndefinedParameterAndVariableVisitor =
                                TLE.UndefinedParameterAndVariableVisitor.visit(
                                    tleExpression,
                                    this,
                                    this.topLevelScope); //asdf
                            for (const error of tleUndefinedParameterAndVariableVisitor.errors) {
                                parseErrors.push(error.translate(jsonTokenStartIndex));
                            }

                            // Unrecognized function calls
                            const tleUnrecognizedFunctionVisitor = TLE.UnrecognizedFunctionVisitor.visit(this, tleExpression, functions);
                            for (const error of tleUnrecognizedFunctionVisitor.errors) {
                                parseErrors.push(error.translate(jsonTokenStartIndex));
                            }

                            // Incorrect number of function arguments
                            const tleIncorrectArgumentCountVisitor = TLE.IncorrectFunctionArgumentCountVisitor.visit(tleExpression, functions);
                            for (const error of tleIncorrectArgumentCountVisitor.errors) {
                                parseErrors.push(error.translate(jsonTokenStartIndex));
                            }

                            // Undefined variable properties
                            const tleUndefinedVariablePropertyVisitor = TLE.UndefinedVariablePropertyVisitor.visit(tleExpression, this);
                            for (const error of tleUndefinedVariablePropertyVisitor.errors) {
                                parseErrors.push(error.translate(jsonTokenStartIndex));
                            }
                        }
                    }

                    const deploymentTemplateObject: Json.ObjectValue | null = Json.asObjectValue(this.jsonParseResult.value);
                    if (deploymentTemplateObject) {
                        const variablesObject: Json.ObjectValue | null = Json.asObjectValue(deploymentTemplateObject.getPropertyValue("variables"));
                        if (variablesObject) {
                            const referenceInVariablesFinder = new ReferenceInVariableDefinitionJSONVisitor(
                                this
                                // , new Scope(variablesObject)); //asdf
                            );
                            variablesObject.accept(referenceInVariablesFinder);

                            // Can't call reference() inside variable definitions //asdf scopes
                            for (const referenceSpan of referenceInVariablesFinder.referenceSpans) {
                                parseErrors.push(
                                    new language.Issue(referenceSpan, "reference() cannot be invoked inside of a variable definition."));
                            }
                        }
                    }

                    resolve(parseErrors);
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    public get warnings(): language.Issue[] {
        // asdf do for all subscopes (user funcs, sub deployments)
        return this._warnings.getOrCacheValue(() => {
            const warnings: language.Issue[] = [];

            for (const parameterDefinition of this.parameterDefinitions) {
                const parameterReferences: Reference.List =
                    this.findReferences(Reference.ReferenceKind.Parameter, parameterDefinition.name.toString());
                if (parameterReferences.length === 1) {
                    warnings.push(
                        new language.Issue(parameterDefinition.name.span, `The parameter '${parameterDefinition.name.toString()}' is never used.`));
                }
            }

            for (const variableDefinition of this.variableDefinitions) {
                const variableReferences: Reference.List = this.findReferences(Reference.ReferenceKind.Variable, variableDefinition.name.toString());
                if (variableReferences.length === 1) {
                    warnings.push(
                        new language.Issue(variableDefinition.name.span, `The variable '${variableDefinition.name.toString()}' is never used.`));
                }
            }

            //asdf
            // for (const nsDefinition of this.namespaceDefinitions) {
            //     this._warnings.push(new language.Issue(nsDefinition.name.span, `namespace ${nsDefinition.name.toString()}`));

            //     for (const funcDefinition of nsDefinition.members) {
            //         this._warnings.push(new language.Issue(
            //             funcDefinition.name.span,
            //             `func ${funcDefinition.name.toString()}`)
            //         );
            //     }
            // }

            return warnings;
        });
    }

    public getFunctionCounts(): Histogram {
        const functionCounts = new Histogram();

        if (this.jsonParseResult.value) {
            // Our count should count every string in the template, even if it's repeated multiple times, so don't loop through
            //    _quotedStringToTleParseResultMap directly because that counts repeated strings only once.
            //
            let visitor = new GenericStringVisitor((stringValue: Json.StringValue): void => {
                const tleParseResult = this.getTLEParseResultFromJSONStringValue(stringValue);
                if (tleParseResult) {
                    let tleFunctionCountVisitor = TLE.FunctionCountVisitor.visit(tleParseResult.expression);
                    functionCounts.add(tleFunctionCountVisitor.functionCounts);
                }
            });

            this.jsonParseResult.value.accept(visitor);
        }

        return functionCounts;
    }

    public get jsonParseResult(): Json.ParseResult {
        return this._jsonParseResult;
    }

    /**
     * Get the number of lines that are in the file.
     */
    public get lineCount(): number {
        return this._jsonParseResult.lineLengths.length;
    }

    /**
     * Get the maximum column index for the provided line. For the last line in the file,
     * the maximum column index is equal to the line length. For every other line in the file,
     * the maximum column index is less than the line length.
     */
    public getMaxColumnIndex(lineIndex: number): number {
        return this._jsonParseResult.getMaxColumnIndex(lineIndex);
    }

    /**
     * Get the maximum document character index for this deployment template.
     */
    public get maxCharacterIndex(): number {
        return this._jsonParseResult.maxCharacterIndex;
    }

    public get parameterDefinitions(): ParameterDefinition[] {
        return this._topLevelScope.parameterDefinitions;
    }

    public get variableDefinitions(): Json.Property[] {
        return this._topLevelScope.variableDefinitions;
    }

    public get namespaceDefinitions(): UserFunctionNamespaceDefinition[] {
        return this._topLevelScope.namespaceDefinitions;
    }

    // asdf move to scope
    public getParameterDefinition(parameterName: string): ParameterDefinition | null {
        assert(parameterName, "parameterName cannot be null, undefined, or empty");

        const unquotedParameterName = Utilities.unquote(parameterName);
        let parameterNameLC = unquotedParameterName.toLowerCase();

        // Find the last definition that matches, because that's what Azure does
        for (let i = this.parameterDefinitions.length - 1; i >= 0; --i) {
            let pd = this.parameterDefinitions[i];
            if (pd.name.toString().toLowerCase() === parameterNameLC) {
                return pd;
            }
        }
        return null;
    }

    public getFunctionNamespaceDefinition(namespaceName: string): UserFunctionNamespaceDefinition | undefined {
        assert(!!namespaceName, "namespaceName cannot be null, undefined, or empty");
        let namespaceNameLC = namespaceName.toLowerCase();
        return this.namespaceDefinitions.find((nd: UserFunctionNamespaceDefinition) => nd.namespaceName.toString().toLowerCase() === namespaceNameLC);
    }

    public getFunctionDefinition(namespaceName: string, functionName: string): UserFunctionDefinition | null {
        assert(!!functionName, "functionName cannot be null, undefined, or empty");
        let nd = this.getFunctionNamespaceDefinition(namespaceName);
        if (nd) {
            let result = nd.getMemberDefinition(functionName);
            return result ? result : null;
        }

        return null;
    }

    // asdf: move to scope
    public getVariableDefinition(variableName: string): Json.Property | null {
        assert(variableName, "variableName cannot be null, undefined, or empty");

        const unquotedVariableName = Utilities.unquote(variableName);
        const variableNameLC = unquotedVariableName.toLowerCase();

        // Find the last definition that matches, because that's what Azure does
        for (let i = this.variableDefinitions.length - 1; i >= 0; --i) {
            let vd = this.variableDefinitions[i];
            if (vd.name.toString().toLowerCase() === variableNameLC) {
                return vd;
            }
        }

        return null;
    }

    // asdf: findNamespaceDefinitionsWithPrefix

    /**
     * If the function call is a variables() reference, return the related variable definition
     */
    public getVariableDefinitionFromFunctionCall(tleFunction: TLE.FunctionCallValue): Json.Property | null {
        let result: Json.Property | null = null;

        if (tleFunction.isBuiltin("variables")) { // asdf
            const variableName: TLE.StringValue | null = TLE.asStringValue(tleFunction.argumentExpressions[0]);
            if (variableName) {
                result = this.getVariableDefinition(variableName.toString());
            }
        }

        return result;
    }

    /**
     * If the function call is a parameters() reference, return the related parameter definition
     */
    public getParameterDefinitionFromFunctionCall(tleFunction: TLE.FunctionCallValue): ParameterDefinition | null {
        assert(tleFunction);

        let result: ParameterDefinition | null = null;

        if (tleFunction.nameToken.stringValue === "parameters") {
            const propertyName: TLE.StringValue | null = TLE.asStringValue(tleFunction.argumentExpressions[0]);
            if (propertyName) {
                result = this.getParameterDefinition(propertyName.toString());
            }
        }

        return result;
    }

    public findParameterDefinitionsWithPrefix(parameterNamePrefix: string): ParameterDefinition[] {
        assert(parameterNamePrefix !== null, "parameterNamePrefix cannot be null");
        assert(parameterNamePrefix !== undefined, "parameterNamePrefix cannot be undefined");

        let result: ParameterDefinition[] = [];

        if (parameterNamePrefix !== "") {
            let lowerCasedPrefix = parameterNamePrefix.toLowerCase();
            for (let parameterDefinition of this.parameterDefinitions) {
                if (parameterDefinition.name.toString().toLowerCase().startsWith(lowerCasedPrefix)) {
                    result.push(parameterDefinition);
                }
            }
        } else {
            result = this.parameterDefinitions;
        }

        return result;
    }

    public findVariableDefinitionsWithPrefix(variableNamePrefix: string): Json.Property[] {
        assert(variableNamePrefix !== null, "variableNamePrefix cannot be null");
        assert(variableNamePrefix !== undefined, "variableNamePrefix cannot be undefined");

        let result: Json.Property[];
        if (variableNamePrefix) {
            result = [];

            const lowerCasedPrefix = variableNamePrefix.toLowerCase();
            for (const variableDefinition of this.variableDefinitions) {
                if (variableDefinition.name.toString().toLowerCase().startsWith(lowerCasedPrefix)) {
                    result.push(variableDefinition);
                }
            }
        } else {
            result = this.variableDefinitions;
        }

        return result;
    }

    public getDocumentCharacterIndex(documentLineIndex: number, documentColumnIndex: number): number {
        return this._jsonParseResult.getCharacterIndex(documentLineIndex, documentColumnIndex);
    }

    public getDocumentPosition(documentCharacterIndex: number): language.Position {
        return this._jsonParseResult.getPositionFromCharacterIndex(documentCharacterIndex);
    }

    public getJSONTokenAtDocumentCharacterIndex(documentCharacterIndex: number): Json.Token | null {
        return this._jsonParseResult.getTokenAtCharacterIndex(documentCharacterIndex);
    }

    public getJSONValueAtDocumentCharacterIndex(documentCharacterIndex: number): Json.Value | null {
        return this._jsonParseResult.getValueAtCharacterIndex(documentCharacterIndex);
    }

    public getContextFromDocumentLineAndColumnIndexes(documentLineIndex: number, documentColumnIndex: number): PositionContext {
        return PositionContext.fromDocumentLineAndColumnIndexes(this, documentLineIndex, documentColumnIndex);
    }

    public getContextFromDocumentCharacterIndex(documentCharacterIndex: number): PositionContext {
        return PositionContext.fromDocumentCharacterIndex(this, documentCharacterIndex);
    }

    /**
     * Can return null if the token is not in a valid portion of the template (e.g. there's no top-level object)asdf
     */
    public getTLEParseResultFromJSONToken(jsonToken: Json.Token | null): TLE.ParseResult | null {
        if (!jsonToken || jsonToken.type !== Json.TokenType.QuotedString) {
            // Don't do a map lookup if it's not a quoted string parse
            return null;
        }

        const unquoted = Utilities.unquote(jsonToken.toString());
        return this.getTLEParseResultFromString(unquoted);
    }

    /**
     * Can return null if the string is not in a valid portion of the template (e.g. there's no top-level object) asdf
     */
    public getTLEParseResultFromJSONStringValue(jsonStringValue: Json.StringValue | null): TLE.ParseResult | null {
        if (!jsonStringValue) {
            return null;
        }

        const result = this.getTLEParseResultFromString(jsonStringValue.toString());
        assert(result); // asdf why would this be null?  - probably best to be safe and remove this assert
        return result;
    }

    /**
     * Can return null if the string is not in a valid portion of the template (e.g. there's no top-level object)asdf
     */
    private getTLEParseResultFromString(value: string): TLE.ParseResult | null {
        let result: TLE.ParseResult | undefined;
        if (typeof value === "string") {
            result = this.quotedStringToTleParseResultMap.get(value);
        }

        return result ? result : null;
    }

    public findReferences(referenceType: Reference.ReferenceKind, referenceName: string): Reference.List {
        const result: Reference.List = new Reference.List(referenceType);

        if (referenceName) {
            switch (referenceType) {
                case Reference.ReferenceKind.Parameter:
                    const parameterDefinition: ParameterDefinition | null = this.getParameterDefinition(referenceName);
                    if (parameterDefinition) {
                        result.add(parameterDefinition.name.unquotedSpan);
                    }
                    break;

                case Reference.ReferenceKind.Variable:
                    const variableDefinition: Json.Property | null = this.getVariableDefinition(referenceName);
                    if (variableDefinition) {
                        result.add(variableDefinition.name.unquotedSpan);
                    }
                    break;

                default:
                    assert.fail(`Unrecognized Reference.Kind: ${referenceType}`);
                    break;
            }

            for (const jsonStringToken of this.jsonQuotedStringTokens) {
                const tleParseResult: TLE.ParseResult | null = this.getTLEParseResultFromJSONToken(jsonStringToken);
                if (tleParseResult && tleParseResult.expression) {
                    const visitor = TLE.FindReferencesVisitor.visit(tleParseResult.expression, referenceType, referenceName);
                    result.addAll(visitor.references.translate(jsonStringToken.span.startIndex));
                }
            }
        }

        return result;
    }
}
