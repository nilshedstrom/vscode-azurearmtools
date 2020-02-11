// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { Position, Range, TextDocument, workspace } from "vscode";
import { configKeys, configPrefix, languageId } from "./constants";
import { containsArmSchema } from "./schemas";

export const armDeploymentDocumentSelector = [
    { language: languageId, scheme: 'file' },
    { language: languageId, scheme: 'untitled' } // unsaved files
];

const maxLinesToDetectSchemaIn = 500;

function isJsonOrJsoncLangId(textDocument: TextDocument): boolean {
    return textDocument.languageId === 'json' || textDocument.languageId === 'jsonc';
}

// We keep track of arm-template files, of course,
// but also JSON/JSONC (unless auto-detect is disabled) so we can check them for the ARM schema
function shouldWatchDocument(textDocument: TextDocument): boolean {
    if (
        textDocument.uri.scheme !== 'file'
        && textDocument.uri.scheme !== 'untitled' // unsaved files
    ) {
        return false;
    }

    if (textDocument.languageId === languageId) {
        return true;
    }

    let enableAutoDetection = workspace.getConfiguration(configPrefix).get<boolean>(configKeys.autoDetectJsonTemplates);
    if (!enableAutoDetection) {
        return false;
    }

    return isJsonOrJsoncLangId(textDocument);
}

export function mightBeDeploymentTemplate(textDocument: TextDocument): boolean {
    if (!shouldWatchDocument(textDocument)) {
        return false;
    }

    if (textDocument.languageId === languageId) {
        return true;
    }

    if (isJsonOrJsoncLangId(textDocument)) {
        let startOfDocument = textDocument.getText(new Range(new Position(0, 0), new Position(maxLinesToDetectSchemaIn - 1, 0)));

        // Do a quick dirty check if the first portion of the JSON contains a schema string that we're interested in
        // (might not actually be in a $schema property, though)
        return !!startOfDocument && containsArmSchema(startOfDocument);
    }

    return false;
}
