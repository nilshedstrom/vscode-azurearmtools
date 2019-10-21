import { createCompletionsTest } from "./support/createCompletionsTest";
import { IDeploymentTemplate } from "./support/diagnostics";

// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

// tslint:disable:no-unused-expression max-func-body-length promise-function-async max-line-length no-unnecessary-class
// tslint:disable:no-non-null-assertion object-literal-key-quotes variable-name no-constant-condition

suite("Variable iteration (copy blocks)", () => {
    // Top-level copy block of object
    const disksTopLevelArrayTemplate: IDeploymentTemplate = {
        "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
        "contentVersion": "1.0.0.0",
        "variables": {
            "copy": [
                {
                    // Creates variable 'disks-top-level-array-of-object'
                    //   of type {name, diskIndex, data:{ diskSizeGB }}
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

    // const template1b: IDeploymentTemplate = {
    //     "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    //     "contentVersion": "1.0.0.0",
    //     "parameters": {},
    //     "variables": {
    //         "disk-array-on-object": {
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
    //             "value": "[variables('disk-array-on-object')]",
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
    //             "value": "[variables('disk-array-on-object').disks]",
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
    //         "disk-array-on-object": {
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
    //             "value": "[variables('disk-array-on-object')]",
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
    //             "value": "[variables('disk-array-on-object').disks]",
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

    suite("Variable iteration completion", () => {
        suite("Top-level copy block, array of object", () => {
            createCompletionsTest(disksTopLevelArrayTemplate, '<output1>', '[variables(!)]', ["'disks-top-level-array-of-object'"]);

            // We don't currently support completions from an array, so these should return an empty list
            createCompletionsTest(disksTopLevelArrayTemplate, '<output1>', "[variables('disks-top-level-array-of-object').!]", []);
            createCompletionsTest(disksTopLevelArrayTemplate, '<output1>', "[variables('disks-top-level-array-of-object').data!]", []);
        });
    });
}); // Variable iteration (copy blocks)
