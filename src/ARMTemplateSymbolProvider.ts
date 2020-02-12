
// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------
import * as vscode from 'vscode';
import * as Json from "./JSON";
import * as language from "./Language";

export class ARMTemplateSymbolProvider implements vscode.DocumentSymbolProvider {
    public async provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.DocumentSymbol[]> {

        try {
            let text = document.getText();
            let tree = Json.parse(text);
            if (tree === undefined || tree.value === undefined) {
                return [];
            }
            if (tree.value instanceof Json.ObjectValue) {
                let symbols = tree.value.properties.map(x => this.getDocumentSymbol(x, document));
                return symbols;
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    private getDocumentSymbol(value: Json.Value, document: vscode.TextDocument): vscode.DocumentSymbol {
        let range = this.getRange(value.span, document);
        if (value instanceof Json.Property && value.value !== undefined) {
            let documentSymbol = new vscode.DocumentSymbol(value.nameValue.toFriendlyString(), value.value.toFriendlyString(), vscode.SymbolKind.String, range, range);
            if (value.value instanceof Json.ArrayValue) {
                documentSymbol.kind = vscode.SymbolKind.Array;
                documentSymbol.children = value.value.elements.map(x => this.getDocumentSymbol(x, document));
            }
            if (value.value instanceof Json.ObjectValue) {
                documentSymbol.kind = vscode.SymbolKind.Object;
                documentSymbol.children = value.value.properties.map(x => this.getDocumentSymbol(x, document));
            }
            return documentSymbol;
        }
        if (value instanceof Json.ObjectValue) {
            let documentSymbol = new vscode.DocumentSymbol("", "", vscode.SymbolKind.Object, range, range);
            documentSymbol.children = value.properties.map(x => this.getDocumentSymbol(x, document));
        }
        if (value instanceof Json.StringValue) {
            return new vscode.DocumentSymbol(value.unquotedValue, /*detail*/ "", vscode.SymbolKind.String, range, range);
        }
        return new vscode.DocumentSymbol("Unknown", /*detail*/ "", vscode.SymbolKind.Field, range, range);
    }

    private getRange(span: language.Span, document: vscode.TextDocument): vscode.Range {
        return new vscode.Range(document.positionAt(span.startIndex), document.positionAt(span.afterEndIndex));
    }
}
