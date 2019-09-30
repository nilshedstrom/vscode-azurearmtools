// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { CachedValue } from "./CachedValue";
import { assert } from './fixed_assert';
import { IParameterDefinition } from "./IParameterDefinition";
import * as Json from "./JSON";
import * as language from "./Language";

/**
 * This class represents the definition of a top-level parameter in a deployment template.
 */
export class ParameterDefinition implements IParameterDefinition {
    private _description: CachedValue<string | null> = new CachedValue<string | null>();
    private _defaultValue: CachedValue<Json.Value | null> = new CachedValue<Json.Value | null>();

    constructor(private _property: Json.Property) {
        assert(_property);
    }

    public get name(): Json.StringValue {
        return this._property.name;
    }

    public get span(): language.Span {
        return this._property.span;
    }

    public get supportsDescription(): boolean { return true; }
    public get description(): string | null {
        return this._description.getOrCacheValue(() => {
            const parameterDefinition: Json.ObjectValue | null = Json.asObjectValue(this._property.value);
            if (parameterDefinition) {
                const metadata: Json.ObjectValue | null = Json.asObjectValue(parameterDefinition.getPropertyValue("metadata"));
                if (metadata) {
                    const description: Json.StringValue | null = Json.asStringValue(metadata.getPropertyValue("description"));
                    if (description) {
                        return description.toString();
                    }
                }
            }

            return null;
        });
    }

    public get supportsDefaultValue(): boolean { return true; }
    public get defaultValue(): Json.Value | null {
        return this._defaultValue.getOrCacheValue(() => {
            const parameterDefinition: Json.ObjectValue | null = Json.asObjectValue(this._property.value);
            if (parameterDefinition) {
                return parameterDefinition.getPropertyValue("defaultValue");
            }

            return null;
        });
    }
}
