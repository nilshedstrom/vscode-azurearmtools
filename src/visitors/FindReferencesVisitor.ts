// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { Utilities } from "../../extension.bundle";
import * as Reference from "../Reference";
import { FunctionCallValue, StringValue, Value, Visitor } from "../TLE";
import { assertNever } from "../util/assertNever";

/**
 * A TLE visitor that searches a TLE value tree looking for references to the provided parameter or
 * variable.
 */
export class FindReferencesVisitor extends Visitor {
    private _references: Reference.List;
    private _lowerCasedFullName: string;

    constructor(private _kind: Reference.ReferenceKind, referenceFullName: string) {
        super();
        this._references = new Reference.List(_kind);
        this._lowerCasedFullName = Utilities.unquote(referenceFullName).toLowerCase();
    }

    public get references(): Reference.List {
        return this._references;
    }

    public visitFunctionCall(tleFunction: FunctionCallValue | null): void {
        if (tleFunction) {
            switch (this._kind) {
                case Reference.ReferenceKind.UserFunction:
                    if (tleFunction.namespaceToken && tleFunction.nameToken && tleFunction.fullName.toLowerCase() === this._lowerCasedFullName) {
                        this._references.add(tleFunction.nameToken.span);
                    }
                    break;

                case Reference.ReferenceKind.Namespace:
                    if (tleFunction.namespaceToken && tleFunction.namespaceToken.stringValue.toLowerCase() === this._lowerCasedFullName) {
                        this._references.add(tleFunction.namespaceToken.span);
                    }
                    break;

                case Reference.ReferenceKind.BuiltinFunction:
                    if (tleFunction.nameToken && tleFunction.fullName.toLowerCase() === this._lowerCasedFullName) {
                        this._references.add(tleFunction.nameToken.span);
                    }
                    break;

                case Reference.ReferenceKind.Parameter:
                case Reference.ReferenceKind.Variable:
                    break;

                default:
                    assertNever(this._kind);
                    break;
            }
        }

        super.visitFunctionCall(tleFunction);
    }

    public visitString(tleString: StringValue): void {
        if (Utilities.unquote(tleString.toString()).toLowerCase() === this._lowerCasedFullName) {
            switch (this._kind) {
                case Reference.ReferenceKind.Parameter:
                    if (tleString.isParametersArgument()) {
                        this._references.add(tleString.unquotedSpan);
                    }
                    break;
                case Reference.ReferenceKind.Variable:
                    if (tleString.isVariablesArgument()) {
                        this._references.add(tleString.unquotedSpan);
                    }
                    break;

                case Reference.ReferenceKind.Namespace:
                case Reference.ReferenceKind.UserFunction:
                case Reference.ReferenceKind.BuiltinFunction:
                    break;

                default:
                    assertNever(this._kind);
                    break;
            }
        }

        super.visitString(tleString);
    }
    public static visit(tleValue: Value | null, referenceType: Reference.ReferenceKind, referenceFullName: string): FindReferencesVisitor {
        const visitor = new FindReferencesVisitor(referenceType, referenceFullName);
        if (tleValue) {
            tleValue.accept(visitor);
        }
        return visitor;
    }
}
