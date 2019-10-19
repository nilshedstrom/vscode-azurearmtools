// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

// tslint:disable:no-unused-expression max-func-body-length promise-function-async max-line-length no-unnecessary-class
// tslint:disable:no-non-null-assertion object-literal-key-quotes variable-name no-constant-condition

suite("Variable iteration (copy blocks)", () => {

    //asdf
    // const template1: IDeploymentTemplate = {
    //     "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    //     "contentVersion": "1.0.0.0",
    //     "parameters": {},
    //     "variables": {
    //         "copy": [
    //             {
    //                 "name": "arrayTest",
    //                 "count": 5,
    //                 "input": "[concat('item', copyIndex('arrayTest', 1))]"
    //             }
    //         ]
    //     },
    //     "resources": [],
    //     "outputs": {
    //         "foo": {
    //             "type": "array",
    //             "value": "[variables('arrayTest')]"
    //         }
    //     }
    // };

    // test("one", async () => {
    //     // const { dt } = await parseTemplateWithMarkers(template1, []);
    // });

}); // Variable iteration (copy blocks)
