import { hasProperty } from "deflib";
import { XEventTarget } from "deflib";
import type { Storage } from "webextension-polyfill";

export default class Saver {
    private storage: Storage.StorageArea;
    private onChanged: XEventTarget<{ [key: string]: Storage.StorageAreaOnChangedChangesType }>;

    constructor(storage: Storage.StorageArea) {
        this.storage = storage;
        this.onChanged = new XEventTarget();
        this.storage.onChanged.addListener(this.handleChanges);
    }

    private handleChanges(changes: any) {
        this.onChanged.dispatch(changes);
    }

    public async save(name: string, value: any) {
        await this.storage.set({ [name]: value });
    }

    public async load<T>(name: string): Promise<T | null> {
        const stor = await this.storage.get(name);
        return hasProperty(stor, name) ? stor[name] : null;
    }
}