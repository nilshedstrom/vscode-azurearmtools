import * as vscode from "vscode";
// tslint:disable-next-line:no-duplicate-imports
import { Uri } from "vscode";
import { resourceTypes } from "./ShowDocumentation.generated";

export class QuickPickItem<T> implements vscode.QuickPickItem {
    public label: string;
    public value: T;
    public description: string;

    constructor(label: string, value: T, description: string) {
        this.label = label;
        this.value = value;
        this.description = description;
    }
}

export function getResourceType(): QuickPickItem<Uri>[] {
    let items: QuickPickItem<Uri>[] = [];
    for (const resourceType of resourceTypes) {
        items.push(new QuickPickItem<Uri>(resourceType, Uri.parse(`https://docs.microsoft.com/azure/templates/${resourceType}`), ""));
    }
    return items;
}
