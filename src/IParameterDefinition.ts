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

    supportsDescription: boolean;
    description: string | null;

    supportsDefaultValue: boolean;
    defaultValue: Json.Value | null;
}
