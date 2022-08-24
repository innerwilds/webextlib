import {EventEmitter} from 'events';
import {has} from 'lodash';
import type {Storage} from 'webextension-polyfill';
import {UpdateType} from '../const';
import type {ICoreStorageData, ICoreStorageDataUpdateInfo, IStoredListUpdateInfo} from '../types';

function validateCoreStorageData(data: any): boolean {
	if (!data || typeof data !== 'object') {
		return false;
	}

	const props = Object.getOwnPropertyDescriptors(data);
	const keys = Object.keys(props);

	const checkEvery = (key: string) => {
		if (key === 'items') {
			return Array.isArray(data[key]);
		}

		if (key === 'updateIds') {
			return Array.isArray(data[key]);
		}

		if (key === 'updateCounter') {
			return isFinite(data[key]) && data[key] !== null;
		}

		if (key === 'updateType') {
			return Object.values(UpdateType).includes(data[key]);
		}

		return false;
	};

	return keys.every(checkEvery);
}

export default class StoredList<T extends {id: number}> {
	public static async create<T extends {id: number}>(name: string, storage: Storage.StorageArea): Promise<StoredList<T>> {
		const list = new StoredList<T>(name, storage);

		const isValid = await list.validateStorage();

		if (isValid) {
			await list.loadStorageData();
		} else {
			await list.recreateStorage();
		}

		list.storage.onChanged.addListener(list.handleChanges);

		return list;
	}

	public onUpdate: EventEmitter<IStoredListUpdateInfo<T>, UpdateType>;
	private items: T[];
	private updateCounter: number;
	private deleted: boolean;

	private constructor(public readonly name: string, private readonly storage: Storage.StorageArea) {
		this.name = name;
		this.storage = storage;
		this.deleted = false;
		this.items = [];
		this.updateCounter = 0;
		this.onUpdate = new EventEmitter();
	}

	public async append(...values: T[]): Promise<number> {
		if (this.deleted) {
			throw new TypeError('List has been deleted.');
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

		await this.save({updateIds: newIds, updateType: UpdateType.ItemAdded});

		return newIds.length;
	}

	public async remove(...values: T[] | number[]): Promise<number> {
		if (this.deleted) {
			throw new TypeError('List has been deleted.');
		}

		const removedIds: number[] = [];

		if (typeof values[0] === 'number') {
			for (const id of values as number[]) {
				const index = this.items.findIndex(item => item.id === id);
				this.items.splice(index, 1);
				removedIds.push(id);
			}
		} else {
			for (const value of values as T[]) {
				const index = this.items.findIndex(item => item.id === value.id);
				this.items.splice(index, 1);
				removedIds.push(value.id);
			}
		}

		if (removedIds.length === 0) {
			return 0;
		}

		await this.save({updateIds: removedIds, updateType: UpdateType.ItemDeleted});

		return removedIds.length;
	}

	public async update(...newValues: T[]): Promise<number> {
		if (this.deleted) {
			throw new TypeError('List has been deleted.');
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

		await this.save({updateIds: updatedIds, updateType: UpdateType.ItemUpdated});

		return updatedIds.length;
	}

	public find(predicate: (value: T) => boolean): T | undefined {
		if (this.deleted) {
			throw new TypeError('List has been deleted.');
		}

		const found = this.items.find(item => predicate(item));

		return found;
	}

	public findById(id: number): T | undefined {
		if (this.deleted) {
			throw new TypeError('List has been deleted.');
		}

		const found = this.items.find(item => item.id === id);

		return found;
	}

	public async clear(): Promise<boolean> {
		if (this.deleted) {
			throw new TypeError('List has been deleted.');
		}

		if (this.items.length === 0) {
			return false;
		}

		const removedIds = this.items.map(item => item.id);

		this.items.length = 0;

		await this.save({
			updateIds: removedIds,
			updateType: UpdateType.ListCleared,
		});

		return true;
	}

	public async delete(deletedByOther = false): Promise<boolean> {
		if (this.deleted) {
			return false;
		}

		this.deleted = true;
		this.items.length = 0;

		this.storage.onChanged.removeListener(this.handleChanges);

		if (!deletedByOther) {
			await this.storage.set({[this.name]: {updateType: UpdateType.ItemDeleted}});
		}

		return true;
	}

	private readonly handleChanges = async (changes: Storage.StorageAreaOnChangedChangesType): Promise<void> => {
		const changeInfo: Storage.StorageAreaOnChangedChangesType = changes[this.name] as Storage.StorageAreaOnChangedChangesType;

		if (!changeInfo?.newValue) {
			console.warn('Handle undefined changes ', changes);
			return;
		}

		// Write an validator
		const info: ICoreStorageData<T> = changeInfo.newValue as ICoreStorageData<T>;

		if (info.updateType === UpdateType.None) {
			console.warn('Some other StoredList has been recreate the storage, when this StoredList is exists.');
			await this.delete(true);
			return;
		}

		if (info.updateType === UpdateType.ListDeleted) {
			await this.delete(true);
			return;
		}

		if (info.updateCounter === this.updateCounter) {
			return;
		}

		this.localUpdate(info);

		this.onUpdate.emit(info.updateType, {ids: info.updateIds, type: info.updateType, external: true});
	};

	private localUpdate(info: ICoreStorageData<T>) {
		const {updateType, updateIds, items} = info;

		if (updateType === UpdateType.ListCleared) {
			this.items.length = 0;
		} else if (updateType === UpdateType.ItemAdded) {
			for (const id of updateIds) {
				if (!this.items.some(i => i.id === id)) {
					const found = items.find(i => i.id === id);

					if (found) {
						this.items.push(found);
					}
				}
			}
		} else if (updateType === UpdateType.ItemDeleted) {
			for (const id of updateIds) {
				const index = this.items.findIndex(i => i.id === id);
				this.items.splice(index, 1);
			}
		} else if (updateType === UpdateType.ItemUpdated) {
			for (const item of items) {
				const index = this.items.findIndex(i => i.id === item.id);
				this.items[index] = item;
			}
		}

		this.updateCounter = info.updateCounter;
	}

	private async recreateStorage() {
		if (this.deleted) {
			throw new TypeError('List has been deleted.');
		}

		const data: ICoreStorageData<T> = {
			items: [],
			updateType: UpdateType.None,
			updateCounter: 0,
			updateIds: [],
		};

		await this.storage.set({[this.name]: data});

		this.items = [];
		this.updateCounter = 0;
	}

	private async validateStorage(): Promise<boolean> {
		if (this.deleted) {
			throw new TypeError('List has been deleted.');
		}

		const {storage, name} = this;

		const response = await storage.get(name);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		if (!has(response, name)) {
			return false;
		}

		const storageData: unknown = response[name];

		return validateCoreStorageData(storageData);
	}

	private async loadStorageData(): Promise<void> {
		if (this.deleted) {
			throw new TypeError('List has been deleted.');
		}

		const response = await this.storage.get(this.name);
		// Write an validator
		const data: ICoreStorageData<T> = response[this.name] as ICoreStorageData<T>;

		this.updateCounter = data.updateCounter;
		this.items = data.items;
	}

	private async save(info: ICoreStorageDataUpdateInfo<T>) {
		if (this.deleted) {
			throw new TypeError('List has been deleted.');
		}

		const saveInfo: ICoreStorageData<T> = {
			items: this.items,
			updateCounter: ++this.updateCounter,
			updateIds: info.updateIds,
			updateType: info.updateType,
		};

		this.onUpdate.emit(info.updateType, {ids: info.updateIds, type: info.updateType, external: false});

		await this.storage.set({[this.name]: saveInfo});
	}
}
