// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

// tslint:disable:no-unused-expression max-func-body-length promise-function-async max-line-length no-unnecessary-class
// tslint:disable:no-non-null-assertion object-literal-key-quotes variable-name

import { DeploymentTemplate } from "../src/DeploymentTemplate";
import { assert } from "../src/fixed_assert";
import { Issue } from "../src/Language";
import { IDeploymentNamespaceDefinition } from "./support/diagnostics";
import { stringify } from "./support/stringify";

suite("DeploymentTemplate - User functions", () => {

    async function parseDeploymentTemplate(template: string | {}, expectedErrors?: string[]): Promise<DeploymentTemplate> {
        const json = typeof template === "string" ? template : stringify(template);
        const dt = new DeploymentTemplate(json, "id");

        if (expectedErrors) {
            const errors: Issue[] = await dt.errors;
            const errorMessages = errors.map(e => e.message);
            assert.deepStrictEqual(errorMessages, expectedErrors);
        }

        return dt;
    }

    const namespace_udf_odd: IDeploymentNamespaceDefinition = {
        "namespace": "udf",
        "members": {
            "odd": {
                "parameters": [
                    {
                        "name": "number",
                        "type": "Int"
                    }
                ],
                "output": {
                    "type": "bool",
                    "value": "[equals(mod(parameters('number'), 2), 1)]"
                }
            }
        }
    };

    test("simple  function definition, no errors", async () => {
        const template = {
            "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "functions": [namespace_udf_odd]
        };

        await parseDeploymentTemplate(template, []);
    });

    test("missing namespace name", async () => {
        const template = {
            "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "functions": [
                {
                    "members": {
                        "odd": {
                            "parameters": [
                                {
                                    "name": "number",
                                    "type": "Int"
                                }
                            ],
                            "output": {
                                "type": "bool",
                                "value": "[equals(mod(parameters('number'), 2), 1)]"
                            }
                        }
                    }
                }
            ]
        };

        const dt = await parseDeploymentTemplate(template, [
            // Since the function isn't valid, the parameter show as missing
            "Undefined parameter reference: 'number'"
        ]);
        assert.equal(0, dt.topLevelScope.namespaceDefinitions.length);
    });
});
