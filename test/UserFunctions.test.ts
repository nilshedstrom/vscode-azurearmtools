// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

// tslint:disable:no-unused-expression max-func-body-length promise-function-async max-line-length no-unnecessary-class
// tslint:disable:no-non-null-assertion object-literal-key-quotes variable-name

import { assert } from "../src/fixed_assert";
import { parseTemplateAndValidateErrors } from "./support/parseTemplate";

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

            const dt = await parseTemplateAndValidateErrors(template, [
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

            const dt = await parseTemplateAndValidateErrors(template, [
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

            const dt = await parseTemplateAndValidateErrors(template, [
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

            await parseTemplateAndValidateErrors(template, []);
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

            await parseTemplateAndValidateErrors(template, []);
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

            const dt = await parseTemplateAndValidateErrors(template, []);
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

            await parseTemplateAndValidateErrors(template, []);
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

            await parseTemplateAndValidateErrors(template, [
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

            await parseTemplateAndValidateErrors(template, [
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

            await parseTemplateAndValidateErrors(template, [
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

            await parseTemplateAndValidateErrors(template, [
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

            await parseTemplateAndValidateErrors(template, []);
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

            await parseTemplateAndValidateErrors(template, []);
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

            await parseTemplateAndValidateErrors(template, []);
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

            await parseTemplateAndValidateErrors(template, [
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

            await parseTemplateAndValidateErrors(template, [
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

            await parseTemplateAndValidateErrors(template, [
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

            await parseTemplateAndValidateErrors(template, [
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

            await parseTemplateAndValidateErrors(template, [
                'Expected a right parenthesis (\')\').',
                'Unrecognized user-defined function namespace \'ufo\'.'
            ]);
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

            await parseTemplateAndValidateErrors(template, []);
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

            await parseTemplateAndValidateErrors(template, [
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

            await parseTemplateAndValidateErrors(template, [
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

            await parseTemplateAndValidateErrors(template, []);
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

            await parseTemplateAndValidateErrors(template, []);
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

            await parseTemplateAndValidateErrors(template, []);
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

            await parseTemplateAndValidateErrors(template, []);
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

                await parseTemplateAndValidateErrors(template, []);
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

            await parseTemplateAndValidateErrors(template, []);
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

            await parseTemplateAndValidateErrors(template, []);

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

            await parseTemplateAndValidateErrors(template, []);
        });

    });
    // #endregion

});
