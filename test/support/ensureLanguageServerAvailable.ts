// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import * as fse from 'fs-extra';
import { window, workspace } from 'vscode';
import { getLanguageServerState, LanguageServerState } from "../../extension.bundle";
import { DISABLE_LANGUAGE_SERVER_TESTS } from "../testConstants";
import { delay } from "./delay";
import { getTempFilePath } from "./getTempFilePath";

let isLanguageServerAvailable = false;

export async function ensureLanguageServerAvailable(): Promise<void> {
    if (DISABLE_LANGUAGE_SERVER_TESTS) {
        throw new Error("DISABLE_LANGUAGE_SERVER_TESTS is set, but this test is trying to call ensureLanguageServerAvailable");
    }

    if (!isLanguageServerAvailable) {
        // Ensure language server starts up by opening an ARM template
        let fileToDelete: string;
        try {
            const templateContents = JSON.stringify(
                {
                    $schema: "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                    contentVersion: '1.2.3.4',
                    resources: []
                },
                undefined,
                2);
            const tempPath = getTempFilePath(undefined, ".json");
            fse.writeFileSync(tempPath, templateContents);
            fileToDelete = tempPath;

            let doc = await workspace.openTextDocument(tempPath);
            await window.showTextDocument(doc);

            // tslint:disable-next-line: no-constant-condition
            while (true) {
                switch (getLanguageServerState()) {
                    case LanguageServerState.Failed:
                        throw new Error('Language server failed to start');
                    case LanguageServerState.NotStarted:
                    case LanguageServerState.Starting:
                        await delay(100);
                        break;
                    case LanguageServerState.Started:
                        await delay(1000); // Give vscode time to notice the new formatter available (I don't know of a way to detect this)

                        isLanguageServerAvailable = true;
                        return;
                    case LanguageServerState.Stopped:
                        throw new Error('Language server stopped');
                    default:
                        throw new Error('Unexpected languageServerState');
                }
            }
        } finally {
            if (fileToDelete) {
                fse.unlinkSync(fileToDelete);
            }
        }
    }
}
