// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

export class CaseInsensitiveMap<TKey extends string, TValue> {
    // Keyed by lowercased key
    // Maps to tuple of original key plus value (last set key wins)
    private _map: Map<TKey, [TKey, TValue]> = new Map<TKey, [TKey, TValue]>();

    // tslint:disable-next-line: no-reserved-keywords
    public get(key: TKey): TValue | undefined {
        const found = this._map.get(<TKey>key.toLowerCase());
        return found ? found[1] : undefined;
    }
}
