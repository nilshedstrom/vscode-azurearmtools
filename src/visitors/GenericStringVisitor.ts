// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import * as Json from "../JSON";

/**
 * A visitor for Json.StringValue that calls generic code for each JSON string
 */
export class GenericStringVisitor extends Json.Visitor {
    constructor(private _visitStringValue: (stringValue: Json.StringValue) => void) {
        super();
    }

    public visitStringValue(stringValue: Json.StringValue): void {
        this._visitStringValue(stringValue);
    }
}
