// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import * as Json from "./JSON";
import * as language from "./Language";

/**
 * This class represents the definition of any kind of parameter in a deployment template.
 */
export interface IParameterDefinition {
    name: Json.StringValue;
    span: language.Span;

    // We don't currently need access to the parameter's "type" or other properties

    supportsDescription: boolean;
    description: string | null;

    supportsDefaultValue: boolean; //asdf?
    defaultValue: Json.Value | null;
}
