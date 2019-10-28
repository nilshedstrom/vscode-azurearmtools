// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

// tslint:disable:no-unused-expression max-func-body-length promise-function-async max-line-length no-unnecessary-class
// tslint:disable:no-non-null-assertion object-literal-key-quotes variable-name no-constant-condition

import { DeploymentTemplate, Json } from "../extension.bundle";
import { assert } from "../src/fixed_assert";
import { createCompletionsTest } from "./support/createCompletionsTest";
import { IDeploymentTemplate } from "./support/diagnostics";
import { parseTemplate } from "./support/parseTemplate";
import { stringify } from "./support/stringify";

suite("Variable iteration (copy blocks)", () => {

    suite("top-level variable copy blocks", () => {
        const topLevelVariableCopyBlocks = <Partial<IDeploymentTemplate>>{
            variables: {
                copy: [{
                    // This creates a loop variable 'diskNames' whose value is
                    //   an array of strings with the values
                    //   [
                    //     'myDataDisk1',
                    //     'myDataDisk2',
                    //     'myDataDisk3
                    //   ]
                    name: "diskNames",
                    count: 3,
                    input: "[concat('myDataDisk', copyIndex('diskNames', 1))]"
                }, {
                    name: "disks",
                    count: 3,
                    input: {
                        "name": "[concat('myDataDisk', copyIndex('disks', 1))]",
                        "diskSizeGB": "1",
                        "diskIndex": "[copyIndex('disks')]"
                    }
                }]
            }
        };

        test("'copy' not found as a variable", async () => {
            const dt = await parseTemplate(topLevelVariableCopyBlocks);
            assert(!dt.topLevelScope.getVariableDefinition('copy'));
        });

        test("copy block names are added as variables", async () => {
            const dt = await parseTemplate(topLevelVariableCopyBlocks);

            assert(dt.topLevelScope.variableDefinitions.length === 2);
            assert(dt.topLevelScope.variableDefinitions[0].nameValue.unquotedValue === "diskNames");
            assert(!!dt.topLevelScope.getVariableDefinition('diskNames'));
            assert(!!dt.topLevelScope.getVariableDefinition('disks'));
        });

        test("copy block value is an array of the input property", async () => {
            const dt = await parseTemplate(topLevelVariableCopyBlocks);

            const value = dt.topLevelScope.getVariableDefinition('diskNames')!.value!;
            assert(value);
            assert(value instanceof Json.ArrayValue);
            assert((<Json.ArrayValue>value).elements[0] instanceof Json.StringValue);
            // Right now the value consists of just a single array element of the 'input' property value
            assert.equal((<Json.StringValue>(<Json.ArrayValue>value).elements[0]).unquotedValue, "[concat('myDataDisk', copyIndex('diskNames', 1))]");
        });

        test("copy block usage info", async () => {
            const dt = await parseTemplate(topLevelVariableCopyBlocks);

            const diskNames = dt.topLevelScope.getVariableDefinition('diskNames')!;
            assert.deepStrictEqual(diskNames.usageInfo, {
                description: undefined,
                friendlyType: "iteration variable",
                usage: "diskNames"
            });
        });

        //asdf refs etc.

        test("case insensitive keys", () => {
            const dt = new DeploymentTemplate(
                stringify(<Partial<IDeploymentTemplate>>{
                    variables: {
                        "COPY": [{
                            NAME: "diskNames",
                            COUNT: 3,
                            INPUT: "[concat('myDataDisk', copyIndex('diskNames', 1))]"
                        }]
                    }
                }),
                "id");
            assert(!!dt.topLevelScope.getVariableDefinition('diskNames'));
        });

        test("no input property asdf", () => {
            const dt = new DeploymentTemplate(
                stringify(<Partial<IDeploymentTemplate>>{
                    variables: {
                        "COPY": [{
                            name: "diskNames",
                            count: 3
                        }]
                    }
                }),
                "id");
            assert(!!dt.topLevelScope.getVariableDefinition('diskNames'));
        });

        test("no name property asdf", () => {
            const dt = new DeploymentTemplate(
                stringify(<Partial<IDeploymentTemplate>>{
                    variables: {
                        "COPY": [{
                            count: 3,
                            input: 123
                        }]
                    }
                }),
                "id");
            assert(!!dt.topLevelScope.getVariableDefinition('diskNames'));
        });

        test("case insensitive lookup", async () => {
            const dt = await parseTemplate(topLevelVariableCopyBlocks);

            assert(!!dt.topLevelScope.getVariableDefinition('DISKnAMES'));
        });

        test("Regular and iteration vars together", async () => {
            const dt = new DeploymentTemplate(
                stringify(<Partial<IDeploymentTemplate>><unknown>{
                    variables: {
                        "var1": "hello",
                        copy: [{ name: "diskNames" }, { name: "disks" }],
                        "var2": "hello 2",
                    }
                }),
                "id");

            assert.deepStrictEqual(
                dt.topLevelScope.variableDefinitions.map(v => v.nameValue.unquotedValue),
                ["var1", "diskNames", "disks", "var2"]
            );
        });
    }); // end suite top-level copy block

    suite("embedded variable copy blocks", async () => {
        let dt: DeploymentTemplate;

        const embeddedVariableCopyBlocks = {
            "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "parameters": {},
            "variables": {
                // This creates an object variable disk-array-in-object
                //   with two members: disks and member2
                //   Disks is of type array of {name, diskSizeGB, diskIndex}
                // //asdf deeper examples
                "disk-array-in-object": {
                    "copy": [
                        {
                            "name": "disks",
                            "count": 5,
                            "input": {
                                "name": "[concat('myDataDisk', copyIndex('disks', 1))]",
                                "diskSizeGB": "1",
                                "diskIndex": "[copyIndex('disks')]"
                            }
                        }
                    ],
                    "member2": "abc"
                }
            },
            "resources": [],
            "outputs": {
                "disk-array-in-object": {
                    // Returns an object with members disks and member2
                    "value": "[variables('disk-array-in-object')]",
                    "type": "object"
                },
                "disk-array-in-object-disks": {
                    // Returns an array of {name, diskSizeGB, diskIndex}
                    "value": "[variables('disk-array-in-object').disks]",
                    "type": "array"
                },
                "disk-array-in-object-member2": {
                    // Returns a string
                    "value": "[variables('disk-array-in-object').member2]",
                    "type": "array"
                }
            }
        };

        suiteSetup(async () => {
            dt = await parseTemplate(embeddedVariableCopyBlocks);
        });

        test("No errors", async () => {
            const errors = await dt.errorsPromise;
            assert.deepStrictEqual(errors, []);
        });

        test("'copy' not found as a variable", async () => {
            //const dt = await parseTemplate(embeddedVariableCopyBlocks);

            assert(!dt.topLevelScope.getVariableDefinition('copy'));
        });

        test("'copy' not found as member of the variable", async () => {
            //const dt = await parseTemplate(embeddedVariableCopyBlocks);

            assert(!dt.topLevelScope.getVariableDefinition('copy'));
        });

        test("copy block names are added as variables", async () => {
            //const dt = await parseTemplate(embeddedVariableCopyBlocks);

            assert(dt.topLevelScope.variableDefinitions.length === 2);
            assert(dt.topLevelScope.variableDefinitions[0].nameValue.unquotedValue === "diskNames");
            assert(!!dt.topLevelScope.getVariableDefinition('diskNames'));
            assert(!!dt.topLevelScope.getVariableDefinition('disks'));
        });

        test("copy block value is an array of the input property", async () => {
            const value = dt.topLevelScope.getVariableDefinition('diskNames')!.value!;
            assert(value);
            assert(value instanceof Json.ArrayValue);
            assert((<Json.ArrayValue>value).elements[0] instanceof Json.StringValue);
            // Right now the value consists of just a single array element of the 'input' property value
            assert.equal((<Json.StringValue>(<Json.ArrayValue>value).elements[0]).unquotedValue, "[concat('myDataDisk', copyIndex('diskNames', 1))]");
        });

        test("copy block usage info", async () => {
            const diskNames = dt.topLevelScope.getVariableDefinition('diskNames')!;
            assert.deepStrictEqual(diskNames.usageInfo, {
                description: undefined,
                friendlyType: "iteration variable",
                usage: "diskNames"
            });
        });

        //asdf refs etc.

        test("case insensitive keys", () => {
            const dt2 = new DeploymentTemplate(
                stringify(<Partial<IDeploymentTemplate>>{
                    variables: {
                        "COPY": [{
                            NAME: "diskNames",
                            COUNT: 3,
                            INPUT: "[concat('myDataDisk', copyIndex('diskNames', 1))]"
                        }]
                    }
                }),
                "id");
            assert(!!dt2.topLevelScope.getVariableDefinition('diskNames'));
        });

        test("no input property asdf", () => {
            const dt2 = new DeploymentTemplate(
                stringify(<Partial<IDeploymentTemplate>>{
                    variables: {
                        "COPY": [{
                            name: "diskNames",
                            count: 3
                        }]
                    }
                }),
                "id");
            assert(!!dt2.topLevelScope.getVariableDefinition('diskNames'));
        });

        test("no name property asdf", () => {
            const dt = new DeploymentTemplate(
                stringify(<Partial<IDeploymentTemplate>>{
                    variables: {
                        "COPY": [{
                            count: 3,
                            input: 123
                        }]
                    }
                }),
                "id");
            assert(!!dt.topLevelScope.getVariableDefinition('diskNames'));
        });

        test("case insensitive lookup", async () => {
            const dt = await parseTemplate(embeddedVariableCopyBlocks);

            assert(!!dt.topLevelScope.getVariableDefinition('DISKnAMES'));
        });

        test("Regular and iteration vars together", () => {
            const dt = new DeploymentTemplate(
                stringify(<Partial<IDeploymentTemplate>><unknown>{
                    variables: {
                        "var1": "hello",
                        copy: [{ name: "diskNames" }, { name: "disks" }],
                        "var2": "hello 2",
                    }
                }),
                "id");

            assert.deepStrictEqual(
                dt.topLevelScope.variableDefinitions.map(v => v.nameValue.unquotedValue),
                ["var1", "diskNames", "disks", "var2"]
            );
        });
    }); // end suite embedded variable copy blocks

    //asdf
    // Source: https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-multiple#variable-iteration
    const variableCopySampleTemplate = {
        "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
        "contentVersion": "1.0.0.0",
        "parameters": {},
        "variables": {
            "disk-array-in-object": {
                "copy": [
                    {
                        "name": "disks",
                        "count": 5,
                        "input": {
                            "name": "[concat('myDataDisk', copyIndex('disks', 1))]",
                            "diskSizeGB": "1",
                            "diskIndex": "[copyIndex('disks')]"
                        }
                    },
                    {
                        "name": "diskNames",
                        "count": 5,
                        "input": "[concat('myDataDisk', copyIndex('diskNames', 1))]"
                    }
                ]
            },
            "copy": [
                {
                    "name": "top-level-object-array",
                    "count": 5,
                    "input": {
                        "name": "[concat('myDataDisk', copyIndex('top-level-object-array', 1))]",
                        "diskSizeGB": "1",
                        "diskIndex": "[copyIndex('top-level-object-array')]"
                    }
                },
                {
                    "name": "top-level-string-array",
                    "count": 5,
                    "input": "[concat('myDataDisk', copyIndex('top-level-string-array', 1))]"
                },
                {
                    "name": "top-level-integer-array",
                    "count": 5,
                    "input": "[copyIndex('top-level-integer-array')]"
                }
            ]
        },
        "resources": [],
        "outputs": {
            "exampleObject": {
                "value": "[variables('disk-array-in-object')]",
                "type": "object"
            },
            "exampleArrayOnObject": {
                "value": "[variables('disk-array-in-object').disks]",
                "type": "array"
            },
            "exampleObjectArray": {
                "value": "[variables('top-level-object-array')]",
                "type": "array"
            },
            "exampleStringArray": {
                "value": "[variables('top-level-string-array')]",
                "type": "array"
            },
            "exampleIntegerArray": {
                "value": "[variables('top-level-integer-array')]",
                "type": "array"
            }
        }
    };

    suite("Top-level copy block", async () => {
        // Top-level copy block of object
        const disksTopLevelArrayTemplate: IDeploymentTemplate = {
            "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
            "contentVersion": "1.0.0.0",
            "variables": {
                "copy": [
                    {
                        // Creates variable 'disks-top-level-array-of-object'
                        //   of type arry of {name, diskIndex, data:{ diskSizeGB }}
                        "name": "disks-top-level-array-of-object",
                        "count": 5,
                        "input": {
                            "name": "[concat('myDataDisk', copyIndex('disks-top-level-array-of-object', 1))]",
                            "diskIndex": "[copyIndex('disks-top-level-array-of-object')]",
                            "data": {
                                "diskSizeGB": "1"
                            }
                        }
                    }
                ]
            },
            "resources": [],
            "outputs": {
                "o1ArrayOfObject": {
                    "value": "[variables('disks-top-level-array-of-object')]",
                    "type": "array"
                },
                "o2Elem": {
                    "value": "[variables('disks-top-level-array-of-object')[1]]",
                    "type": "object"
                },
                "o2ElemDotData": {
                    "value": "[variables('disks-top-level-array-of-object')[1].data]",
                    "type": "object"
                },
                "o2ElemDotDataDotDiskSizeGB": {
                    "value": "[variables('disks-top-level-array-of-object')[1].data.diskSizeGB]",
                    "type": "int"
                },
                "output1": {
                    "value": "<output1>",
                    "type": "int"
                }
            }
        };

        const dt = await parseTemplate(disksTopLevelArrayTemplate, []);

        test("No errors", async () => {
            assert.equal((await dt.errorsPromise).length, 0);
        });

        test("No warnings", async () => {
            assert.equal(dt.warnings.length, 0);
        });

        test("variable is array", async () => {
            //asdf assert.equal(dt.topLevelScope.getVariableDefinition('disks-top-level-array-of-object')!);
        });

        suite("Completion", () => {
            createCompletionsTest(disksTopLevelArrayTemplate, '<output1>', '[variables(!)]', ["'disks-top-level-array-of-object'"]);

            // We don't currently support completions from an array, so these should return an empty list
            createCompletionsTest(disksTopLevelArrayTemplate, '<output1>', "[variables('disks-top-level-array-of-object').!]", []);
            createCompletionsTest(disksTopLevelArrayTemplate, '<output1>', "[variables('disks-top-level-array-of-object').data!]", []);
        });

    });

    // Embedded copy block
    // const template1b: IDeploymentTemplate = {
    //     "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    //     "contentVersion": "1.0.0.0",
    //     "parameters": {},
    //     "variables": {
    //         "disk-array-in-object": {
    //             "copy": [
    //                 {
    //                     "name": "disks",
    //                     "count": 5,
    //                     "input": {
    //                         "name": "[concat('myDataDisk', copyIndex('disks', 1))]",
    //                         "diskSizeGB": "1",
    //                         "diskIndex": "[copyIndex('disks')]"
    //                     }
    //                 }
    //             ]
    //         },
    //         "copy": [
    //             {
    //                 "name": "disks-top-level-array-of-object",
    //                 "count": 5,
    //                 "input": {
    //                     "name": "[concat('myDataDisk', copyIndex('disks-top-level-array-of-object', 1))]",
    //                     "diskSizeGB": "1",
    //                     "diskIndex": "[copyIndex('disks-top-level-array-of-object')]"
    //                 }
    //             }
    //         ]
    //     },
    //     "resources": [],
    //     "outputs": {
    //         /*
    //           "exampleObject": {
    //             "type": "Object",
    //             "value": {
    //               "disks": [
    //                 {
    //                   "diskIndex": 0,
    //                   "diskSizeGB": "1",
    //                   "name": "myDataDisk1"
    //                 },
    //                 {
    //                   "diskIndex": 1,
    //                   "diskSizeGB": "1",
    //                   "name": "myDataDisk2"
    //                 },
    //                 ...
    //               ]
    //             }
    //           */
    //         "exampleObject": {
    //             "value": "[variables('disk-array-in-object')]",
    //             "type": "object"
    //         },
    //         /*
    //         "exampleArrayOnObject": {
    //           "type": "Array",
    //           "value": [
    //             {
    //               "diskIndex": 0,
    //               "diskSizeGB": "1",
    //               "name": "myDataDisk1"
    //             },
    //             {
    //               "diskIndex": 1,
    //               "diskSizeGB": "1",
    //               "name": "myDataDisk2"
    //             },
    //             ...
    //           ]
    //         }
    //       */
    //         "exampleArrayOnObject": {
    //             "value": "[variables('disk-array-in-object').disks]",
    //             "type": "array"
    //         },

    //         /*
    //         "exampleArray": {
    //           "type": "Array",
    //           "value": [
    //             {
    //               "diskIndex": 0,
    //               "diskSizeGB": "1",
    //               "name": "myDataDisk1"
    //             },
    //             {
    //               "diskIndex": 1,
    //               "diskSizeGB": "1",
    //               "name": "myDataDisk2"
    //             },
    //             ...
    //           ]
    //         }
    //         */
    //         "exampleArray": {
    //             "value": "[variables('disks-top-level-array-of-object')]",
    //             "type": "array"
    //         }
    //     }
    // };

    // const template1c: IDeploymentTemplate = {
    //     "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    //     "contentVersion": "1.0.0.0",
    //     "parameters": {},
    //     "variables": {
    //         "disk-array-in-object": {
    //             "copy": [
    //                 {
    //                     "name": "disks",
    //                     "count": 5,
    //                     "input": {
    //                         "name": "[concat('myDataDisk', copyIndex('disks', 1))]",
    //                         "diskSizeGB": "1",
    //                         "diskIndex": "[copyIndex('disks')]"
    //                     }
    //                 }
    //             ]
    //         },
    //         "copy": [
    //             {
    //                 "name": "disks-top-level-array-of-object",
    //                 "count": 5,
    //                 "input": {
    //                     "name": "[concat('myDataDisk', copyIndex('disks-top-level-array-of-object', 1))]",
    //                     "diskSizeGB": "1",
    //                     "diskIndex": "[copyIndex('disks-top-level-array-of-object')]"
    //                 }
    //             }
    //         ]
    //     },
    //     "resources": [],
    //     "outputs": {
    //         /*
    //           "exampleObject": {
    //             "type": "Object",
    //             "value": {
    //               "disks": [
    //                 {
    //                   "diskIndex": 0,
    //                   "diskSizeGB": "1",
    //                   "name": "myDataDisk1"
    //                 },
    //                 {
    //                   "diskIndex": 1,
    //                   "diskSizeGB": "1",
    //                   "name": "myDataDisk2"
    //                 },
    //                 ...
    //               ]
    //             }
    //           */
    //         "exampleObject": {
    //             "value": "[variables('disk-array-in-object')]",
    //             "type": "object"
    //         },
    //         /*
    //         "exampleArrayOnObject": {
    //           "type": "Array",
    //           "value": [
    //             {
    //               "diskIndex": 0,
    //               "diskSizeGB": "1",
    //               "name": "myDataDisk1"
    //             },
    //             {
    //               "diskIndex": 1,
    //               "diskSizeGB": "1",
    //               "name": "myDataDisk2"
    //             },
    //             ...
    //           ]
    //         }
    //       */
    //         "exampleArrayOnObject": {
    //             "value": "[variables('disk-array-in-object').disks]",
    //             "type": "array"
    //         },

    //         /*
    //         "exampleArray": {
    //           "type": "Array",
    //           "value": [
    //             {
    //               "diskIndex": 0,
    //               "diskSizeGB": "1",
    //               "name": "myDataDisk1"
    //             },
    //             {
    //               "diskIndex": 1,
    //               "diskSizeGB": "1",
    //               "name": "myDataDisk2"
    //             },
    //             ...
    //           ]
    //         }
    //         */
    //         "exampleArray": {
    //             "value": "[variables('disks-top-level-array-of-object')]",
    //             "type": "array"
    //         }
    //     }
    // };

}); // Variable iteration (copy blocks)
