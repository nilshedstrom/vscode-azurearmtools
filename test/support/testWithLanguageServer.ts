// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

import { ITest, ITestCallbackContext } from "mocha";
import { DISABLE_LANGUAGE_SERVER_TESTS } from "../testConstants";

// Use this instead of "test" to test features which require the language server to be present
export function testWithLanguageServer(expectation: string, callback?: (this: ITestCallbackContext) => Promise<unknown>): ITest {
    return test(
        expectation,
        async function (this: ITestCallbackContext): Promise<unknown> {
            if (DISABLE_LANGUAGE_SERVER_TESTS) {
                console.log("Skipping test because DISABLE_LANGUAGE_SERVER_TESTS is enabled");
                this.skip();
            } else if (callback) {
                // tslint:disable-next-line: no-unsafe-any
                return await callback.call(this);
            } else {
                this.skip();
            }
        });
}
