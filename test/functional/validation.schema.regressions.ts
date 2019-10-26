// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

// tslint:disable:object-literal-key-quotes no-http-string max-func-body-length

import { IDeploymentTemplate, sources, testDiagnostics, testDiagnosticsFromFile } from "../support/diagnostics";
import { testWithLanguageServer } from "../support/testWithLanguageServer";

suite("Schema validation regression testing", () => {
    testWithLanguageServer(
        "networkInterfaces 2018-10-01",
        async () =>
            await testDiagnosticsFromFile(
                'templates/networkInterfaces.json',
                {
                    search: /{{apiVersion}}/,
                    replace: "2018-10-01",
                    includeSources: [sources.schema]
                },
                [])
    );

    suite("Microsoft.Network/virtualNetworks/subnets 2017-06-01 (https://github.com/microsoft/vscode-azurearmtools/issues/28)", () => {
        const template: Partial<IDeploymentTemplate> = {
            contentVersion: "1.2.3.4",
            resources: [
                {
                    "apiVersion": "2017-06-01",
                    "type": "Microsoft.Network/virtualNetworks/subnets",
                    "name": "a",
                    "location": "West Central US",
                    "properties": {
                        "addressPrefix": "0"
                    }
                }]
        };

        testWithLanguageServer(
            "2015-01-01 schema",
            async () => {
                await testDiagnostics(
                    {
                        "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                        ...template
                    },
                    {
                        includeSources: [sources.schema]
                    },
                    []);
            });

        testWithLanguageServer(
            "2019-04-01 schema",
            async () => {
                await testDiagnostics(
                    {
                        "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
                        ...template
                    },
                    {
                        includeSources: [sources.schema]
                    },
                    []);
            });
    });

    testWithLanguageServer(
        "https://github.com/Azure/azure-resource-manager-schemas/issues/627",
        async () =>
            await testDiagnosticsFromFile(
                'templates/networkInterfaces.json',
                {
                    search: /{{apiVersion}}/,
                    replace: "2018-11-01",
                    includeSources: [sources.schema]
                },
                [])
    );

});
