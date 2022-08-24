import {EventEmitter} from 'events';
import type {Storage} from 'webextension-polyfill';

export default class Saver {
	private readonly onChanged: EventEmitter<Record<string, Storage.StorageAreaSyncOnChangedChangesType>>;

	constructor(private readonly storage: Storage.StorageArea) {
		this.storage = storage;
		this.onChanged = new EventEmitter();
		this.storage.onChanged.addListener(this.handleChanges);
	}

	public async save<T>(name: string, value: T) {
		await this.storage.set({[name]: value});
	}

	public async load<T>(name: string): Promise<T | undefined> {
		const stor = await this.storage.get(name);
		return stor[name] as T;
	}

	private handleChanges(changes: any) {
		this.onChanged.emit(changes);
	}
}
