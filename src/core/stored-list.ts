import { XEventTarget } from "deflib";
import { hasProperty } from "deflib";
import { isArray } from "deflib";
import type { Storage } from "webextension-polyfill";

interface ICoreStorageData<T> {
    items: T[];
    updateType: UpdateType;
    updateCounter: number;
    updateIds: number[];
}

interface ICoreStorageDataUpdateInfo<T> {
    updateType: UpdateType;
    updateIds: number[];
    item?: T;
}

export enum UpdateType {
    ListDeleted,
    ItemAdded,
    ItemDeleted,
    ListCleared,
    ItemUpdated,
    None
}

export interface IStoredListUpdateInfo<T> {
    type: UpdateType;
    ids: number[];
    external: boolean;
}

function validateCoreStorageData(data: ICoreStorageData<any>): boolean {
    if (!data || typeof data !== "object") {
        return false;
    }

    const props = Object.getOwnPropertyDescriptors(data);
    const keys = Object.keys(props);

    const checkEvery = (key: string) => {
        if (key === "items") {
            return isArray(data[key]);
        }
        else if (key === "updateIds") {
            return isArray(data[key]);
        }
        else if (key === "updateCounter") {
            return isFinite(data[key]) && data[key] !== null;
        }
        else if (key === "updateType") {
            return Object.values(UpdateType).includes(data[key]);
        }

        return false;
    }

    return keys.every(checkEvery);
}

export class StoredList<T extends { id: number }> {

    public readonly name: string;
    public onUpdate: XEventTarget<IStoredListUpdateInfo<T>>;

    private storage: Storage.StorageArea;
    private items: T[];
    private updateCounter: number;
    private deleted: boolean;

    private constructor(name: string, storage: Storage.StorageArea) {
        this.name = name;
        this.storage = storage;
        this.deleted = false;
        this.items = [];
        this.updateCounter = 0;
        this.onUpdate = new XEventTarget<IStoredListUpdateInfo<T>>();
    }

    public static async create<T extends { id: number }>(name: string, storage: Storage.StorageArea): Promise<StoredList<T>> {
        const list = new StoredList<T>(name, storage);

        if (!(await list.validateStorage())) {
            await list.recreateStorage();
        }
        else {
            await list.loadStorageData();
        }

        list.storage.onChanged.addListener(list.handleChanges);

        return list;
    }

    private handleChanges = (changes: Storage.StorageAreaOnChangedChangesType): void => {
        const changeInfo: Storage.StorageAreaOnChangedChangesType = changes[this.name] as Storage.StorageAreaOnChangedChangesType;

        if (!changeInfo || !changeInfo.newValue) {
            console.warn("Handle undefined changes ", changes);
            return;
        }

        const info: ICoreStorageData<T> = changeInfo.newValue;

        if (info.updateType === UpdateType.None) {
            console.warn("Some other StoredList has been recreate the storage, when this StoredList is exists.");
            this.delete(true);
            return;
        }

        if (info.updateType === UpdateType.ListDeleted) {
            this.delete(true);
            return;
        }

        if (info.updateCounter === this.updateCounter) {
            return;
        }

        this.localUpdate(info);

        this.onUpdate.dispatch({ ids: info.updateIds, type: info.updateType, external: true })
    }

    private localUpdate(info: ICoreStorageData<T>) {
        const {updateType, updateIds, items} = info;

        if (updateType === UpdateType.ListCleared) {
            this.items.length = 0;
        }
        else if (updateType === UpdateType.ItemAdded) {
            for (const id of updateIds)
                if (!this.items.some(i => i.id === id)) {
                    const found = items.find(i => i.id === id);

                    if (found) {
                        this.items.push(found);
                    }
                }
        }
        else if (updateType === UpdateType.ItemDeleted) {
            for (const id of updateIds)
            {
                const index = this.items.findIndex(i => i.id === id);
                this.items.splice(index, 1);
            }
        }
        else if (updateType === UpdateType.ItemUpdated) {
            for (const item of items) {
                const index = this.items.findIndex(i => i.id === item.id);
                this.items[index] = item;
            }
        }

        this.updateCounter = info.updateCounter;
    }

    private async recreateStorage() {
        if (this.deleted) {
            throw new TypeError("List has been deleted.");
        }

        const data: ICoreStorageData<T> = {
            items: [],
            updateType: UpdateType.None,
            updateCounter: 0,
            updateIds: [],
        };

        await this.storage.set({ [this.name]: data });

        this.items = [];
        this.updateCounter = 0;
    }

    private async validateStorage(): Promise<boolean> {
        if (this.deleted) {
            throw new TypeError("List has been deleted.");
        }

        const {storage, name} = this;

        const response = await storage.get(name);

        if (!hasProperty(response, name)) {
            return false;
        }

        const storageData = response[name];

        return validateCoreStorageData(storageData);
    }

    private async loadStorageData(): Promise<void> {
        if (this.deleted) {
            throw new TypeError("List has been deleted.");
        }

        const response = await this.storage.get(this.name);
        const data: ICoreStorageData<T> = response[this.name];

        this.updateCounter = data.updateCounter;
        this.items = data.items;
    }

    private async save(info: ICoreStorageDataUpdateInfo<T>) {
        if (this.deleted) {
            throw new TypeError("List has been deleted.");
        }

        const saveInfo: ICoreStorageData<T> = {
            items: this.items,
            updateCounter: ++this.updateCounter,
            updateIds: info.updateIds,
            updateType: info.updateType
        };

        this.onUpdate.dispatch({ ids: info.updateIds, type: info.updateType, external: false });

        await this.storage.set({ [this.name]: saveInfo });
    }

    public async append(...values: T[]): Promise<number> {
        if (this.deleted) {
            throw new TypeError("List has been deleted.");
        }

        const newIds = [];

        for (const value of values) {
            if (this.items.some(item => item.id === value.id)) {
                continue;
            }
            this.items.push(value);
            newIds.push(value.id);
        }

        if (newIds.length === 0) {
            return 0;
        }

        await this.save({ updateIds: newIds, updateType: UpdateType.ItemAdded });

        return newIds.length;
    }

    public async remove(...values: T[] | number[]): Promise<number> {
        if (this.deleted) {
            throw new TypeError("List has been deleted.");
        }

        const removedIds: number[] = [];

        if (typeof values[0] !== "number") {
            for (const value of values as T[]) {
                const index = this.items.findIndex(item => item.id === value.id);
                this.items.splice(index, 1);
                removedIds.push(value.id);
            }
        }
        else {
            for (const id of values as number[]) {
                const index = this.items.findIndex(item => item.id === id);
                this.items.splice(index, 1);
                removedIds.push(id);
            }
        }

        if (removedIds.length === 0) {
            return 0;
        }

        await this.save({ updateIds: removedIds, updateType: UpdateType.ItemDeleted });

        return removedIds.length;
    }
    
    public async update(...newValues: T[]): Promise<number> {
        if (this.deleted) {
            throw new TypeError("List has been deleted.");
        }

        const updatedIds: number[] = [];

        for (const value of newValues) {
            const index = this.items.findIndex(item => item.id === value.id);
            if (index === -1) {
                continue;
            }
            this.items[index] = value;
        }

        if (updatedIds.length === 0) {
            return 0;
        }

        await this.save({ updateIds: updatedIds, updateType: UpdateType.ItemUpdated });

        return updatedIds.length;
    }

    public find(predicate: (value: T) => boolean): T | null {
        if (this.deleted) {
            throw new TypeError("List has been deleted.");
        }

        const found = this.items.find(item => predicate(item));
        
        if (found)
            return found;

        return null;
    }

    public findById(id: number): T | null {
        if (this.deleted) {
            throw new TypeError("List has been deleted.");
        }

        const found = this.items.find(item => item.id === id);

        return found ? found : null;
    }

    public async clear(): Promise<boolean> {
        if (this.deleted) {
            throw new TypeError("List has been deleted.");
        }

        if (this.items.length === 0) {
            return false;
        }

        const removedIds = this.items.map(item => item.id);

        this.items.length = 0;

        await this.save({
            updateIds: removedIds,
            updateType: UpdateType.ListCleared
        });

        return true;
    }

    public async delete(deletedByOther=false): Promise<boolean> {
        if (this.deleted) {
            return false;
        }

        this.deleted = true;
        this.items.length = 0;

        this.storage.onChanged.removeListener(this.handleChanges);

        if (!deletedByOther) {
            await this.storage.set({ [this.name]: { updateType: UpdateType.ItemDeleted } });
        }

        return true;
    }
}