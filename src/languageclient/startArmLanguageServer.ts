// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

// tslint:disable:no-suspicious-comment max-line-length // TODO:

import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext, window, workspace } from 'vscode';
import { callWithTelemetryAndErrorHandlingSync, parseError } from 'vscode-azureextensionui';
import { Trace } from 'vscode-jsonrpc';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient';
import { armDeploymentLanguageId } from '../constants';
import { ext } from '../extensionVariables';
import { armDeploymentDocumentSelector } from '../supported';

const languageServerName = 'ARM Language Server';

export function startArmLanguageServer(context: ExtensionContext): void {
    callWithTelemetryAndErrorHandlingSync('startArmLanguageClient', () => {
        // The server is implemented in node // TODO:
        // let serverExe = 'dotnet';

        // let serverExe = 'C:\\Users\\stephwe\\Repos\\arm-language-server\\Microsoft.ArmLanguageServer\\bin\\Debug\\netcoreapp2.2\\win-x64\\Microsoft.ArmLanguageServer.exe';
        // let serverDll = 'C:\\Users\\stephwe\\Repos\\arm-language-server\\Microsoft.ArmLanguageServer\\bin\\Debug\\netcoreapp2.2\\Microsoft.ArmLanguageServer.dll';
        let serverExe = 'dotnet.exe'; // 'c:\\Users\\stephwe\\.dotnet\\x64\\dotnet.exe';

        // asdf remove old setting
        let serverDllPath = workspace.getConfiguration('azurermtools').get<string | undefined>('languageServer.path');

        if (typeof serverDllPath !== 'string' || serverDllPath === '') {
            // Check for the files under LanguageServerBin
            let serverFolderPath = context.asAbsolutePath('LanguageServerBin');
            serverDllPath = path.join(serverFolderPath, 'Microsoft.ArmLanguageServer.dll');
            if (!fs.existsSync(serverFolderPath) || !fs.existsSync(serverDllPath)) {
                window.showErrorMessage(`Couldn't find the ARM language server at ${serverDllPath}.  Please reinstall the extension or set azurermtools.languageServer.path to the path to Microsoft.ArmLanguageServer.dll (File->Preferences->Settings)`);
                return;
            }

            serverDllPath = path.join(serverFolderPath, 'Microsoft.ArmLanguageServer.dll');
        }

        // let serverExe = context.asAbsolutePath('D:/Development/Omnisharp/omnisharp-roslyn/artifacts/publish/OmniSharp.Stdio/win7-x64/OmniSharp.exe');
        // The debug options for the server
        // let debugOptions = { execArgv: ['-lsp', '-d' };

        // If the extension is launched in debug mode then the debug server options are used
        // Otherwise the run options are used

        ext.outputChannel.appendLine(`Starting ARM language server from ${serverDllPath}`);

        let commonArgs = [
            serverDllPath,
            '--logLevel', // TODO: Difference between this and client.trace
            getLogLevelString(Trace.Verbose)
        ];

        if (workspace.getConfiguration('azurermtools').get<boolean>('languageServer.waitForDebugger', false) === true) {
            commonArgs.push('--wait-for-debugger');
        }

        let serverOptions: ServerOptions = {
            run: { command: serverExe, args: commonArgs },
            debug: { command: serverExe, args: commonArgs }
        };

        // Options to control the language client
        let clientOptions: LanguageClientOptions = {
            documentSelector: armDeploymentDocumentSelector,
            // synchronize: {
            //     // Synchronize the setting section 'languageServerExample' to the server
            //     // TODO: configurationSection: 'languageServerExampleTODO',
            //     fileEvents: workspace.createFileSystemWatcher('**/*.json')
            // },
            // asdf errorHandler:
            //asdf initializationFailedHandler
        };

        // Create the language client and start the client.
        // tslint:disable-next-line:no-single-line-block-comment
        const client = new LanguageClient(armDeploymentLanguageId, languageServerName, serverOptions, clientOptions, true/*asdf*/);
        let trace: string = workspace.getConfiguration('azurermtools').get<string>("languageServer.traceLevel", "Off");
        client.trace = Trace.fromString(trace);

        // TODO: client.clientOptions.errorHandler
        //let handler = client.createDefaultErrorHandler();

        try {
            let disposable = client.start();
            // Push the disposable to the context's subscriptions so that the
            // client can be deactivated on extension deactivation
            context.subscriptions.push(disposable);
        } catch (error) {
            throw new Error(
                // tslint:disable-next-line: prefer-template
                `${languageServerName} unexpectedly failed to start, please check the output window.\n\n` +
                parseError(error).message);
        }
    });
}

function getLogLevelString(trace: Trace): string {
    switch (trace) {
        case Trace.Off:
            return 'None';
        case Trace.Messages:
            return 'Information';
        case Trace.Verbose:
            return 'Trace';
        default:
            throw new Error(`Unexpected trace value: '${Trace[trace]}'`);
    }
}
