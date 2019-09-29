// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import * as Json from "../JSON";

/**
 * A visitor for Json.StringValue that calls generic code for each JSON string
 */
export class GenericStringVisitor extends Json.Visitor {
    private constructor(private _visitStringValue: (stringValue: Json.StringValue) => void) {
        super();
    }

    public static visit(value: Json.Value, visitStringValue: (stringValue: Json.StringValue) => void): void {
        const visitor = new GenericStringVisitor(visitStringValue);
        value.accept(visitor);
    }

    public visitStringValue(stringValue: Json.StringValue): void {
        this._visitStringValue(stringValue);
    }
}
