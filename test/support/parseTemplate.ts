// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import * as assert from 'assert';
import { DeploymentTemplate } from "../../src/DeploymentTemplate";
import { Issue } from '../../src/Language';
import { stringify } from "./stringify";

export async function parseTemplate(template: string | {}, expectedErrors?: string[]): Promise<DeploymentTemplate> {
    const json = typeof template === "string" ? template : stringify(template);
    const dt = new DeploymentTemplate(json, "id");
    const errors: Issue[] = await dt.errors;
    const errorMessages = errors.map(e => e.message);
    if (expectedErrors) {
        assert.deepStrictEqual(errorMessages, expectedErrors);
    }

    return dt;
}

interface Marker {
    name: string;
    index: number;
}

interface Markers {
    [markerName: string]: Marker;
}

/**
 * Pass in a template with positions marked using the notation <!tagname!>
 * Returns the parsed document without the tags, plus a dictionary of the tags and their positions
 */
export async function parseTemplateWithMarkers(
    template: string | {},
    expectedErrors?: string[]
): Promise<{ dt: DeploymentTemplate; markers: Markers }> {
    const { text, markers } = getDocumentMarkers(template);
    const dt = new DeploymentTemplate(text, "id");

    if (expectedErrors) {
        const errors: Issue[] = await dt.errors;
        const errorMessages = errors.map(e => e.message);
        assert.deepStrictEqual(errorMessages, expectedErrors);
    }

    return { dt, markers };
}

/**
 * Pass in a template with positions marked using the notation <!tagname!>
 * Returns the document without the tags, plus a dictionary of the tags and their positions
 */
export function getDocumentMarkers(template: object | string): { text: string; markers: Markers } {
    let markers: Markers = {};
    template = typeof template === "string" ? template : stringify(template);

    // tslint:disable-next-line:no-constant-condition
    while (true) {
        let match: RegExpMatchArray | null = template.match(/<!([a-zA-Z][a-zA-Z0-9]*)!>/);
        if (!match) {
            break;
        }

        // tslint:disable-next-line:no-non-null-assertion // Tested above
        const index: number = match.index!;
        const name = match[1];
        const marker: Marker = { name, index };
        markers[marker.name] = marker;

        // Remove marker from the document
        template = template.slice(0, marker.index) + template.slice(index + match[0].length);
    }

    return {
        text: template,
        markers
    };
}
