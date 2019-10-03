// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

// tslint:disable:no-unused-expression max-func-body-length promise-function-async max-line-length no-unnecessary-class
// tslint:disable:no-non-null-assertion object-literal-key-quotes variable-name

import { Reference } from "../extension.bundle";
import { DeploymentTemplate } from "../src/DeploymentTemplate";
import { assert } from "../src/fixed_assert";
import { IDeploymentTemplate } from "./support/diagnostics";
import { parseTemplate, parseTemplateWithMarkers } from "./support/parseTemplate";

suite("User functions", () => {

    // #region
    suite("Malformed", () => {
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

            const dt = await parseTemplate(template, [
                // Since the function isn't valid, the parameter show as missing
                "Undefined parameter reference: 'number'"
            ]);
            assert.equal(0, dt.topLevelScope.namespaceDefinitions.length);
        });

        test("missing function name", async () => {
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

            const dt = await parseTemplate(template, [
                // Since the function isn't valid, the parameter shows as missing
                "Undefined parameter reference: 'number'"
            ]);
            assert.equal(0, dt.topLevelScope.namespaceDefinitions.length);
        });

        test("No top-level object value", async () => {
            const template = [{
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
            }];

            const dt = await parseTemplate(template, [
                // Since the function (and entire deployment) isn't valid, the parameter shows as missing
                "Undefined parameter reference: 'number'"
            ]);
            assert.equal(0, dt.topLevelScope.namespaceDefinitions.length);
        });

    });
    // #endregion

    // #region
    suite("Function definitions", () => {
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

            await parseTemplate(template, []);
        });

        test("function definition with local parameter reference in output", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "functions": [
                    {
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
                    }
                ]
            };

            await parseTemplate(template, []);
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

            const dt = await parseTemplate(template, []);
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
                                "value": "[equals(mod(parameters('number'), 2), 1)]"
                            }
                        }
                    }
                }]
            };

            await parseTemplate(template, []);
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

            await parseTemplate(template, [
                "Undefined parameter reference: 'outerParam'"
            ]);
        });

        // CONSIDER: Better error message
        // Right now we get:
        //   Template validation failed: The template function 'a' at line '11' and column '22' is not valid. These function calls are not supported in a function definition: 'variables'. Please see https://aka.ms/arm-template/#functions for usage details.
        //   Undefined variable reference: 'var1'
        test("function definition can't access variables", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "functions": [
                    {
                        "namespace": "udf",
                        "members": {
                            "a": {
                                "output": {
                                    "value": "[variables('var1')]",
                                    "type": "int"
                                }
                            }
                        }
                    }
                ],
                "resources": [],
                "variables": {
                    "var1": 1
                }
            };

            await parseTemplate(template, [
                "Undefined variable reference: 'var1'"
            ]);
        });

        test("function definition output can't access parameter from outer scope", async () => {
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

            await parseTemplate(template, [
                "Undefined parameter reference: 'outerParam'"
            ]);
        });

        test("function can't access parameter from outer scope", async () => {
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

            await parseTemplate(template, [
                "Undefined parameter reference: 'outerParam'"
            ]);
        });

        test("function parameter names are case insensitive", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "functions": [{
                    "namespace": "udf",
                    "members": {
                        "odd": {
                            "parameters": [
                                {
                                    "name": "NUMBER",
                                    "type": "Int"
                                }
                            ],
                            "output": {
                                "type": "bool",
                                "value": "[parameters('nuMber')]"
                            }
                        }
                    }
                }]
            };

            await parseTemplate(template, []);
        });

    });

    // #endregion

    // #region

    suite("Calling user functions", () => {

        test("Calling function with no parameters and no output", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "variables": {
                    v1: "[udf.func1()]"
                },
                "functions": [{
                    "namespace": "udf",
                    "members": {
                        "func1": {
                        }
                    }
                }]
            };

            await parseTemplate(template, []);
        });

        test("Calling function with no parameters", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "variables": {
                    v1: "[udf.nothing()]"
                },
                "functions": [{
                    "namespace": "udf",
                    "members": {
                        "nothing": {
                            "output": {
                                "type": "bool",
                                "value": true
                            }
                        }
                    }
                }]
            };

            await parseTemplate(template, []);
        });

        test("Calling function with no parameters, with extra arg", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "variables": {
                    tooManyArgs: "[udf.nothing('this arg doesn''t belong here')]"
                },
                "functions": [{
                    "namespace": "udf",
                    "members": {
                        "nothing": {
                            "output": {
                                "type": "bool",
                                "value": true
                            }
                        }
                    }
                }]
            };

            await parseTemplate(template, [
                'The function \'udf.nothing\' takes 0 arguments.'
            ]);
        });

        test("Unrecognized function name", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "variables": {
                    v1: "[udf.boo()]"
                },
                "functions": [{
                    "namespace": "udf",
                    "members": {
                        "hoo": {
                        }
                    }
                }]
            };

            await parseTemplate(template, [
                'Unrecognized function name \'boo\' in user-defined namespace \'udf\'.'
            ]);
        });

        test("Unrecognized namespace", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "variables": {
                    v1: "[ufo.boo()]"
                },
                "functions": [{
                    "namespace": "udf",
                    "members": {
                        "boo": {
                        }
                    }
                }]
            };

            await parseTemplate(template, [
                'Unrecognized user-defined function namespace \'ufo\'.'
            ]);
        });

        test("Missing function argument list 1", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "variables": {
                    v1: "[udf.boo]"
                },
                "functions": [{
                    "namespace": "udf",
                    "members": {
                        "boo": {
                        }
                    }
                }]
            };

            await parseTemplate(template, [
                'Missing function argument list.'
            ]);
        });

        test("Missing function argument list 2", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "variables": {
                    v1: "[ufo.boo(]"
                },
                "functions": [{
                    "namespace": "udf",
                    "members": {
                        "boo": {
                        }
                    }
                }]
            };

            await parseTemplate(template, [
                'Expected a right parenthesis (\')\').',
                'Unrecognized user-defined function namespace \'ufo\'.'
            ]);
        });

        test("Calling functions from two namespaces", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "variables": {
                    v1: "[udf1.oddSum(udf2.oddSum(2))]"
                },
                "functions": [
                    {
                        "namespace": "udf1",
                        "members": {
                            "oddSum": {
                                "parameters": [
                                    {
                                        "name": "number",
                                        "type": "Int"
                                    }
                                ],
                                "output": {
                                    "type": "bool",
                                    "value": "[equals(mod(parameters('number'), 2), 0)]"
                                }
                            }
                        }
                    },
                    {
                        "namespace": "udf2",
                        "members": {
                            "oddSum": {
                                "parameters": [
                                    {
                                        "name": "number",
                                        "type": "Int"
                                    }
                                ],
                                "output": {
                                    "type": "bool",
                                    "value": "[equals(mod(parameters('number'), 2), 0)]"
                                }
                            }
                        }
                    }]
            };

            await parseTemplate(template, []);
        });

        test("Calling function with one parameter", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "variables": {
                    v1: "[udf.oddSum(1)]"
                },
                "functions": [{
                    "namespace": "udf",
                    "members": {
                        "oddSum": {
                            "parameters": [
                                {
                                    "name": "number",
                                    "type": "Int"
                                }
                            ],
                            "output": {
                                "type": "bool",
                                "value": "[equals(mod(parameters('number'), 2), 0)]"
                            }
                        }
                    }
                }]
            };

            await parseTemplate(template, []);
        });

        test("Calling function with one parameter, only giving one argument", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "variables": {
                    notEnoughArgs: "[udf.odd()]"
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
                                "value": "[equals(mod(parameters('number'), 2), 0)]"
                            }
                        }
                    }
                }]
            };

            await parseTemplate(template, [
                "The function 'udf.odd' takes 1 argument."
            ]);
        });

        test("Calling function with one parameter, giving an extra argument", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "variables": {
                    tooManyArgs: "[udf.odd()]"
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
                                "value": "[equals(mod(parameters('number'), 2), 0)]"
                            }
                        }
                    }
                }]
            };

            await parseTemplate(template, [
                "The function 'udf.odd' takes 1 argument."
            ]);
        });

        test("Calling function with two parameters", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                outputs: {
                    output1: {
                        type: 'bool',
                        value: "[udf.oddSum(1, 2)]"
                    }
                },
                "functions": [{
                    "namespace": "udf",
                    "members": {
                        "oddSum": {
                            "parameters": [
                                {
                                    "name": "number",
                                    "type": "Int"
                                },
                                {
                                    "name": "sum",
                                    "type": "Int"
                                }
                            ],
                            "output": {
                                "type": "bool",
                                "value": "[equals(mod(add(parameters('number'),parameters('sum')), 2), 0)]"
                            }
                        }
                    }
                }]
            };

            await parseTemplate(template, []);
        });

        test("Calling function with two parameters", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                outputs: {
                    output1: {
                        type: 'bool',
                        value: "[udf.oddSum(1, 2)]"
                    }
                },
                "functions": [{
                    "namespace": "udf",
                    "members": {
                        "oddSum": {
                            "parameters": [
                                {
                                    "name": "number",
                                    "type": "Int"
                                },
                                {
                                    "name": "sum",
                                    "type": "Int"
                                }
                            ],
                            "output": {
                                "type": "bool",
                                "value": "[equals(mod(add(parameters('number'),parameters('sum')), 2), 0)]"
                            }
                        }
                    }
                }]
            };

            await parseTemplate(template, []);
        });

        test("Namespaces are case insensitive", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "variables": {
                    v1: "[udF.boo()]"
                },
                "functions": [{
                    "namespace": "UDF",
                    "members": {
                        "boo": {
                        }
                    }
                }]
            };

            await parseTemplate(template, []);
        });

        test("Function names are case insensitive", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "variables": {
                    v1: "[udf.bOO()]"
                },
                "functions": [{
                    "namespace": "udf",
                    "members": {
                        "Boo": {
                        }
                    }
                }]
            };

            await parseTemplate(template, []);
        });

        // CONSIDER: Give better error message.  Right now we get this:
        //  Template validation failed: The template function 'b' at line '15' and column '22' is not valid. These function calls are not supported in a function definition: 'udf.a'. Please see https://aka.ms/arm-template/#functions for usage details.

        if (false) {
            test("User function can't call another user function", async () => {
                const template = {
                    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                    "contentVersion": "1.0.0.0",
                    "functions": [
                        {
                            "namespace": "udf",
                            "members": {
                                "a": {
                                    "output": {
                                        "value": {
                                        },
                                        "type": "Object"
                                    }
                                },
                                "b": {
                                    "output": {
                                        "type": "int",
                                        "value": "[udf.a()]"
                                    }
                                }
                            }
                        }
                    ],
                    "resources": []
                };

                await parseTemplate(template, []);
            });
        }

        test("Calling user function with same name as built-in function", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "variables": {
                    v1: "[udf.add()]"
                },
                "functions": [{
                    "namespace": "udf",
                    "members": {
                        "add": {
                        }
                    }
                }]
            };

            await parseTemplate(template, []);
        });

        test("Calling user function with namespace name same as built-in function", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "variables": {
                    v1: "[add.add()]"
                },
                "functions": [{
                    "namespace": "add",
                    "members": {
                        "add": {
                        }
                    }
                }]
            };

            await parseTemplate(template, []);

        });

        test("Function names are case insensitive", async () => {
            const template = {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "variables": {
                    v1: "[udf.bOO()]"
                },
                "functions": [{
                    "namespace": "udf",
                    "members": {
                        "Boo": {
                        }
                    }
                }]
            };

            await parseTemplate(template, []);
        });

    });
    // #endregion

    suite("References", () => {

        const userFuncsTemplate1: IDeploymentTemplate =
        {
            "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "functions": [
                {
                    "namespace": "udf",
                    "members": {
                        "date": {
                            "parameters": [
                                {
                                    "name": "<!udfYearDef!>year",
                                    "type": "Int"
                                },
                                {
                                    "name": "month",
                                    "type": "Int"
                                },
                                {
                                    "name": "day",
                                    "type": "Int"
                                }
                            ],
                            "output": {
                                "type": "string",
                                "value": "[concat(string(parameters('<!udfYearRef!>year')), '-', string(parameters('month')), '-', string(parameters('day')))]"
                            }
                        }
                    }
                }
            ],
            "resources": [
                {
                    "type": "Microsoft.Storage/storageAccounts",
                    "name": "[parameters('<!yearRef!>year')]",
                    "apiVersion": "[parameters('<!apiVersionRef!>apiVersion')]",
                    "location": "westus"
                }
            ],
            "parameters": {
                "<!yearDef!>year": {
                    "type": "int",
                    "defaultValue": 2010
                },
                "<!apiVersionDef!>apiVersion": {
                    "type": "int",
                    "defaultValue": 2010
                }
            }
        };

        function testReferences(dt: DeploymentTemplate, cursorIndex: number, expectedReferenceIndices: number[]): void {
            const pc = dt.getContextFromDocumentCharacterIndex(cursorIndex);
            const references: Reference.List = pc.references!;
            assert(references);

            const indices = references.spans.map(r => r.startIndex).sort();
            expectedReferenceIndices = expectedReferenceIndices.sort();

            assert.deepStrictEqual(indices, expectedReferenceIndices);
        }

        suite("Find parameter references", () => {
            test("At reference to top-level parameter", async () => {
                const { dt, markers: { apiVersionDef, apiVersionRef } } = await parseTemplateWithMarkers(userFuncsTemplate1, []);

                // Cursor at reference to "apiVersion" inside resources
                testReferences(dt, apiVersionRef.index, [apiVersionRef.index, apiVersionDef.index]);
            });

            test("At definition of top-level parameter", async () => {
                const { dt, markers: { apiVersionDef, apiVersionRef } } = await parseTemplateWithMarkers(userFuncsTemplate1, []);

                // Cursor at definition to "apiVersion" parameter
                testReferences(dt, apiVersionDef.index, [apiVersionDef.index, apiVersionRef.index]);
            });

            test("At reference to user function parameter", async () => {
                const { dt, markers: { udfYearRef, udfYearDef } } = await parseTemplateWithMarkers(userFuncsTemplate1, []);

                // Cursor at reference to "year" inside user function output
                testReferences(dt, udfYearRef.index, [udfYearRef.index, udfYearDef.index]);
            });

            test("At definition of user function parameter", async () => {
                const { dt, markers: { udfYearRef, udfYearDef } } = await parseTemplateWithMarkers(userFuncsTemplate1, []);

                // Cursor at definition of "year" inside user function
                testReferences(dt, udfYearDef.index, [udfYearRef.index, udfYearDef.index]);
            });

            test("At reference to parameter in user function only finds UDF scope parameter, not top-level param", async () => {
                const { dt, markers: { udfYearRef, udfYearDef } } = await parseTemplateWithMarkers(userFuncsTemplate1, []);

                // Cursor at reference to "year" inside user function output
                testReferences(dt, udfYearRef.index, [udfYearRef.index, udfYearDef.index]);
            });

            test("At definition to parameter in user function only finds UDF scope parameter, not top-level param", async () => {
                const { dt, markers: { udfYearRef, udfYearDef } } = await parseTemplateWithMarkers(userFuncsTemplate1, []);

                // Cursor at definition of "year" inside user function
                testReferences(dt, udfYearDef.index, [udfYearRef.index, udfYearDef.index]);
            });

            test("At reference to top-level parameter only finds top-level parameter definition, not param in user function", async () => {
                const { dt, markers: { udfYearRef, udfYearDef } } = await parseTemplateWithMarkers(userFuncsTemplate1, []);

                // Cursor at reference to "year" inside user function output
                testReferences(dt, udfYearRef.index, [udfYearRef.index, udfYearDef.index]);
            });
        });

    }); // suite References

}); // suite User Functions
