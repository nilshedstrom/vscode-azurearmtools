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

    suite("Malformed functions", () => {
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

        test("missing function name name", async () => {
            const template =
                `"$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "functions": [
                {
                    "namespace": "udf",
                    "members": {
                        : {
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
            ]`;

            const dt = await parseDeploymentTemplate(template, [
                // Since the function isn't valid, the parameter show as missing
                "Undefined parameter reference: 'number'"
            ]);
            assert.equal(0, dt.topLevelScope.namespaceDefinitions.length);
        });

    }); // end suite: Malformed functions

    test("simple function definition", async () => {
        const template = {
            "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "functions": [{
                "namespace": "udf",
                "members": {
                    "odd": {
                    }
                }
            }]
        };

        await parseDeploymentTemplate(template, []);
    });

    test("function definition with local parameter reference in output", async () => {
        const template = {
            "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "functions": [namespace_udf_odd]
        };

        await parseDeploymentTemplate(template, []);
    });

    test("Case insensitive keys in definition", async () => {
        const template = {
            "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "Functions": [
                {
                    "NAMEspace": "udf",
                    "Members": {
                        "odd": {
                            "PARAMETERs": [
                                {
                                    "NAme": "NUmber",
                                    "typeE": "Int"
                                }
                            ],
                            "outPUT": {
                                "tyPE": "bOol",
                                "valUe": "[equals(mod(parameters('number'), 2), 1)]"
                            }
                        },
                        "even": {
                        }
                    }
                }
            ]
        };

        const dt = await parseDeploymentTemplate(template); //asdf, []);
        assert.equal(dt.topLevelScope.parameterDefinitions.length, 0);
        assert(!dt.topLevelScope.getParameterDefinition('notfound'));
        assert.equal(dt.topLevelScope.namespaceDefinitions.length, 1);
        assert.equal(dt.topLevelScope.namespaceDefinitions[0].members.length, 2);
        assert.equal(dt.topLevelScope.namespaceDefinitions[0].namespaceName.toFriendlyString(), "udf");
        assert.equal(dt.topLevelScope.namespaceDefinitions[0].getMemberDefinition('odd')!.name.toString(), "odd");
        assert.equal(dt.topLevelScope.namespaceDefinitions[0].getMemberDefinition('ODD')!.name.toString(), "odd");
        assert.equal(dt.topLevelScope.namespaceDefinitions[0].members[0].parameterDefinitions.length, 1);
    });

    test("function definition with local parameter reference in output", async () => {
        const template = {
            "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "functions": [namespace_udf_odd]
        };

        await parseDeploymentTemplate(template, []);
    });

    test("function definition can't access parameter from outer scope", async () => {
        const template = {
            "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "parameters": {
                "outerParam": {
                    "name": "number",
                    "type": "Int"
                }
            },
            "functions": [{
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
                            "value": "[parameters('outerParam')]"
                        }
                    }
                }
            }]
        };

        await parseDeploymentTemplate(template, [
            "Undefined parameter reference: 'outerParam'"
        ]);
    });

    test("function definition can't access variables"); //asdf

    test("function definition access parameter from outer scope", async () => {
        const template = {
            "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "parameters": {
                "outerParam": {
                    "name": "number",
                    "type": "Int"
                }
            },
            "functions": [{
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
                            "value": "[parameters('outerParam')]"
                        }
                    }
                }
            }]
        };

        await parseDeploymentTemplate(template, [
            "Undefined parameter reference: 'outerParam'"
        ]);
    });

});
