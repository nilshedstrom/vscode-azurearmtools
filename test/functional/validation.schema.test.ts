// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

// tslint:disable:object-literal-key-quotes no-http-string max-func-body-length

import { sources, testDiagnostics } from "../support/diagnostics";
import { testWithLanguageServer } from "../support/testWithLanguageServer";

suite("Schema validation", () => {
    suite("Case-insensitivity", async () => {
        testWithLanguageServer(
            'Resource type miscapitalized',
            async () =>
                await testDiagnostics(
                    {
                        $schema: "http://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                        contentVersion: "1.0.0.0",
                        parameters: {
                            "publicIpAddressName": {
                                "type": "string"
                            },
                            "publicIpAddressType": {
                                type: "string"
                            },
                            publicIpAddressSku: {
                                type: "string"
                            },
                            location: {
                                type: "string"
                            }
                        },
                        resources: [{
                            "name": "[parameters('publicIpAddressName')]",
                            "type": "Microsoft.Network/publicIpAddresses", // should be publicIPAddresses
                            "apiVersion": "2018-08-01",
                            "location": "[parameters('location')]",
                            "properties": {
                                "publicIpAllocationMethod": "[parameters('publicIpAddressType')]" // should be publicIPAllocationMethod
                            },
                            "SKU": { // should be sku
                                "name": "[parameters('publicIpAddressSku')]"
                            },
                            "tags": {}
                        }
                        ]
                    },
                    {
                        includeSources: [sources.schema]
                    },
                    [
                    ])
        );
    });

    suite("More specific error messages for schema problems", async () => {
        testWithLanguageServer(
            'Resource type miscapitalized (https://github.com/microsoft/vscode-azurearmtools/issues/238)',
            async () =>
                await testDiagnostics(
                    {
                        $schema: "http://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                        contentVersion: "1.0.0.0",
                        resources: [
                            {
                                name: "example",
                                type: "Microsoft.Network/publicIPAddresses",
                                apiVersion: "2018-08-01",
                                location: "westus",
                                properties: {},
                            }]
                    },
                    {},
                    [
                        "Warning: OneOf (Require 1 match, following 2 not matched):\r\n    Missing required property \"publicIPAllocationMethod\"\r\n    string (arm-template (schema))"
                    ])
        );
    });

    suite("All root schemas", async () => {
        const schemaBase = "//schema.management.azure.com/schemas/";
        const rootSchemaSuffixes = [
            "2015-01-01/deploymentTemplate.json#",
            "2019-04-01/deploymentTemplate.json#",
            "2014-04-01-preview/deploymentTemplate.json#",
            "2018-05-01/subscriptionDeploymentTemplate.json#",
            "2019-04-01/deploymentTemplate.json#",
            "2019-08-01/managementGroupDeploymentTemplate.json#",
            "2019-08-01/tenantDeploymentTemplate.json#"
        ];

        for (let protocol of ["https:", "http:"]) {
            for (let suffix of rootSchemaSuffixes) {
                const schema = protocol + schemaBase + suffix;
                testWithLanguageServer(
                    schema);
                // tslint:disable-next-line: no-suspicious-comment
                /* TODO
                async () =>
                    await testDiagnostics(
                        {
                            $schema: schema,
                            contentVersion: "1.0.0.0",
                            resources: [
                                {
                                    name: "example",
                                    type: "Microsoft.Network/publicIPAddresses",
                                    apiVersion: "2018-08-01",
                                    location: "westus",
                                    properties: {},
                                }]
                        },
                        {
                            includeSources: [sources.schema]
                        },
                        [
                            "Warning: OneOf (Require 1 match, following 2 not matched):\r\n    Missing required property \"publicIPAllocationMethod\"\r\n    string (arm-template (schema))"
                        ])
            );*/
            }
        }
    });
});
