// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { AzureRMAssets, FunctionsMetadata } from "./AzureRMAssets";
import { CachedPromise } from "./CachedPromise";
import { CachedValue } from "./CachedValue";
import { assert } from "./fixed_assert";
import { FunctionDefinition } from "./FunctionDefinition";
import { Histogram } from "./Histogram";
import * as Json from "./JSON";
import * as language from "./Language";
import { NamespaceDefinition } from "./NamespaceDefinition";
import { ParameterDefinition } from "./ParameterDefinition";
import { PositionContext } from "./PositionContext";
import * as Reference from "./Reference";
import { isArmSchema } from "./supported";
import { ITemplateScope, TemplateScope, TemplateScopeContext } from "./TemplateScope";
import * as TLE from "./TLE";
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
    private _quotedStringToTleParseResultMap: { [key: string]: TLE.ParseResult | undefined }; //asdf CahedValue?

    // A list of parse results for every quoted string in the template
    private _tleParseResults: CachedValue<TLE.ParseResult[]> = new CachedValue<TLE.ParseResult[]>();

    // The "functions" section (which is an array of namespace definitions)
    // https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-authoring-templates#functions
    private _namespaceDefinitions: CachedValue<NamespaceDefinition[]> = new CachedValue<NamespaceDefinition[]>();

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
     * Parse all JSON strings in the template and cache the resulting TLE.ParseResult.  Try to avoic
     * parsing the exact same expression string more than once for a given scope.
     * asdf Should be more lazy?
     */
    private get quotedStringToTleParseResultMap(): { [key: string]: TLE.ParseResult | undefined } {
        if (this._quotedStringToTleParseResultMap === undefined) {
            this._quotedStringToTleParseResultMap = {};

            let visitor = new GenericStringVisitor((stringValue: Json.StringValue): void => {
                // asdf better way to go from Json.Value to Json.Token?
                // Wny not just use the string value from the Json.Value?
                let jsonQuotedStringToken: Json.Token | null = this.getJSONTokenAtDocumentCharacterIndex(stringValue.span.startIndex);
                assert(!!jsonQuotedStringToken, "Expected token at this location, because the location came from a StringValue from the JSON parse");
                // tslint:disable-next-line:no-non-null-assertion // Asserted
                jsonQuotedStringToken = jsonQuotedStringToken!;
                assert(jsonQuotedStringToken.type === Json.TokenType.QuotedString, "Expected quoted string token");
                // Parse the string as a possible TLE expression
                let tleParseResult: TLE.ParseResult = TLE.Parser.parse(
                    jsonQuotedStringToken.toString(),
                    new TemplateScopeContext(this, stringValue)); // asdf

                // Cache the results of this parse by the string's value // asdf: can't map by string value, they might be in different scopes, getting different results.  Need to cache by string and scope
                this._quotedStringToTleParseResultMap[jsonQuotedStringToken.toString()] = tleParseResult;
            });

            if (this.jsonParseResult.value) {
                this.jsonParseResult.value.accept(visitor);
            }

            for (let jsonQuotedStringToken of this.jsonQuotedStringTokens) {
                let parseResult = this._quotedStringToTleParseResultMap[jsonQuotedStringToken.toString()];
                assert(!!parseResult, "Missed a quoted string token");

                // let jsonValue = this.getJSONValueAtDocumentCharacterIndex(jsonQuotedStringToken.span.startIndex);
                // assert(jsonValue);
                // let tleParseResult: TLE.ParseResult = TLE.Parser.parse(jsonQuotedStringToken.toString(), new Scope(this, jsonValue)); // asdf
                // if (tleParseResult) {
                //     this._quotedStringToTleParseResultMap[jsonQuotedStringToken.toString()] = tleParseResult;
                // }
            }
        }
        return this._quotedStringToTleParseResultMap;
    }

    private get tleParseResults(): TLE.ParseResult[] {
        return this._tleParseResults.getOrCacheValue(() => {
            const results: TLE.ParseResult[] = [];

            // tslint:disable-next-line:forin no-for-in // Grandfathered in
            for (let quotedString in this.quotedStringToTleParseResultMap) {
                // tslint:disable-next-line:no-non-null-assertion // Guaranted by for in
                results.push(this.quotedStringToTleParseResultMap[quotedString]!);
            }

            return results;
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
                        assert(tleParseResult);
                        if (tleParseResult) {
                            for (const error of tleParseResult.errors) {
                                parseErrors.push(error.translate(jsonTokenStartIndex));
                            }

                            const tleExpression: TLE.Value | null = tleParseResult.expression;
                            //asdf
                            // const tleUndefinedParameterAndVariableVisitor =
                            //     TLE.UndefinedParameterAndVariableVisitor.visit(
                            //         tleExpression,
                            //         this,
                            //         new Scope(jsonQuotedStringToken)); //asdf
                            // for (const error of tleUndefinedParameterAndVariableVisitor.errors) {
                            //     parseErrors.push(error.translate(jsonTokenStartIndex));
                            // }

                            const tleUnrecognizedFunctionVisitor = TLE.UnrecognizedFunctionVisitor.visit(this, tleExpression, functions);
                            for (const error of tleUnrecognizedFunctionVisitor.errors) {
                                parseErrors.push(error.translate(jsonTokenStartIndex));
                            }

                            const tleIncorrectArgumentCountVisitor = TLE.IncorrectFunctionArgumentCountVisitor.visit(tleExpression, functions);
                            for (const error of tleIncorrectArgumentCountVisitor.errors) {
                                parseErrors.push(error.translate(jsonTokenStartIndex));
                            }

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

        for (let tleParseResult of this.tleParseResults) {
            let tleFunctionCountVisitor = TLE.FunctionCountVisitor.visit(tleParseResult.expression);
            functionCounts.add(tleFunctionCountVisitor.functionCounts);
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

    public get namespaceDefinitions(): NamespaceDefinition[] {
        return this._namespaceDefinitions.getOrCacheValue(() => {
            const namespaceDefinitions: NamespaceDefinition[] = [];

            const value: Json.ObjectValue | null = Json.asObjectValue(this._jsonParseResult.value);
            if (value) {
                const namespaces: Json.ArrayValue | null = Json.asArrayValue(value.getPropertyValue("functions"));
                if (namespaces) {
                    for (const member of namespaces.elements) {
                        let valueObject = Json.asObjectValue(member);
                        if (valueObject) {
                            namespaceDefinitions.push(new NamespaceDefinition(valueObject));
                        }
                    }
                }
            }

            return namespaceDefinitions;
        });
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

    public getNamespaceDefinition(namespaceName: string): NamespaceDefinition | undefined {
        assert(!!namespaceName, "namespaceName cannot be null, undefined, or empty");
        let namespaceNameLC = namespaceName.toLowerCase();
        return this.namespaceDefinitions.find((nd: NamespaceDefinition) => !!nd.name && nd.name.toString().toLowerCase() === namespaceNameLC);
    }

    public getFunctionDefinition(namespaceName: string, functionName: string): FunctionDefinition | null {
        assert(!!functionName, "functionName cannot be null, undefined, or empty");
        let nd = this.getNamespaceDefinition(namespaceName);
        if (nd) {
            let result = nd.getFunctionDefinition(functionName);
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

    public getTLEParseResultFromJSONToken(jsonToken: Json.Token | null): TLE.ParseResult | null {
        return jsonToken ? this.getTLEParseResultFromString(jsonToken.toString()) : null;
    }

    public getTLEParseResultFromJSONStringValue(jsonStringValue: Json.StringValue | null): TLE.ParseResult | null {
        return jsonStringValue ? this.getTLEParseResultFromString(`"${jsonStringValue.toString()}"`) : null;
    }

    private getTLEParseResultFromString(value: string): TLE.ParseResult | null {
        let result: TLE.ParseResult | undefined;
        if (value) {
            result = this.quotedStringToTleParseResultMap[value];
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
