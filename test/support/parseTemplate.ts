// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import * as assert from 'assert';
import { DeploymentTemplate } from "../../src/DeploymentTemplate";
import { Issue } from '../../src/Language';
import { stringify } from "./stringify";

export function parseTemplate(template: string | {}): DeploymentTemplate {
    const json = typeof template === "string" ? template : stringify(template);
    const dt = new DeploymentTemplate(json, "id");
    return dt;
}

export async function parseTemplateAndValidateErrors(template: string | {}, expectedErrors: string[]): Promise<DeploymentTemplate> {
    const dt = parseTemplate(template);
    const errors: Issue[] = await dt.errors;
    const errorMessages = errors.map(e => e.message);
    assert.deepStrictEqual(errorMessages, expectedErrors);

    return dt;
}

