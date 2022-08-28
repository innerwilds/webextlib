import { EventEmitter } from "eventemitter3";
import { isArray } from "underscore";
import type { Storage } from "webextension-polyfill";

const storage = browser.storage.local;

/*
	Event types:
		<target>:saved -> SavedInfo
		<target>:deleted -> DeletedInfo
		<target>:destroyed -> TargetDeletedInfo
		<target>:cleared -> TargetClearedInfo
		<target>:updated -> UpdatedInfo
		*:saved -> EntityUpdateInfo
		*:deleted -> EntityUpdateInfo
		*:destroyed -> TargetUpdateInfo
		*:updated -> EntityUpdateInfo
		*:cleared -> TargetClearedInfo
*/
const ee = new EventEmitter<string>();

function createEntityKey(target: string, id: number) {
	return "@@@" + target + "_" + id;
}

async function loadIds(target: string): Promise<number[]> {
	const key = "$$$" + target;
	const response = await storage.get(key);
	return isArray(response[key]) ? response[key] : [];
}

export async function saveEntity<T extends { id: number }>(target: string, entity: T) {
	const key = createEntityKey(target, entity.id);
	const ids = await loadIds(target);
	
	let isUpdate = false;

	if (!ids.includes(entity.id)) {
		ids.push(entity.id);
	}
	else {
		isUpdate = true;
	}

	await storage.set({
		[key]: entity,
		["$$$" + target]: ids,
		entitySaved: {
			target,
			id: entity.id,
			isUpdate
		}
	})
}

export async function deleteEntity(target: string, entityId: number) {
	const ids = await loadIds(target);

	const index = ids.indexOf(entityId);

	if (index === -1) {
		return;
	}

	ids.splice(index);

	const key = createEntityKey(target, entityId);

	await storage.remove(key);
	await storage.set({
		['$$$' + target]: ids,
		entityDeleted: {
			target,
			id: entityId,
		}
	});
}

export async function loadEntities<T extends { id: number }>(target: string): Promise<T[]> {
	const ids = await loadIds(target);
	const keys = ids.map(id => createEntityKey(target, id));
	const entities = await storage.get(keys);
	return Object.values(entities);
}

export async function loadEntity<T extends { id: number }>(target: string, id: number): Promise<T | undefined> {
	const key = createEntityKey(target, id);
	const response = await storage.get(key);

	if (response[key]) {
		return response[key];
	}

	return undefined;
}

export async function deleteTarget(target: string) {
	const ids = await loadIds(target);
	const keys = ids.map(id => createEntityKey(target, id));
	keys.push("$$$" + target);
	await storage.remove(keys);
	await storage.set({
		targetDeleted: {
			target
		}
	});
}

export async function clearTarget(target: string) {
	const ids = await loadIds(target);
	const keys = ids.map(id => createEntityKey(target, id));

	await storage.remove(keys);

	await storage.set({
		['$$$' + target]: [],
		targetCleared: {
			target
		}
	});
}

type SavedInfo = {
	id: number;
	target: string;
}

type IsUpdate = {
	isUpdate: boolean;
}

type DeletedInfo = {
	id: number;
	target: string;
}

type UpdatedInfo = {
	id: number;
	target: string;
}

type TargetDeletedInfo = {
	target: string;
}

type TargetClearedInfo = {
	target: string;
}

export enum UpdateType {
	TargetDeleted = "TargetDeleted",
	EntitySaved = "EntitySaved",
	EntityDeleted = "EntityDeleted",
	TargetCleared = "TargetCleared",
	EntityUpdated = "EntityUpdated"
}

export type EntityUpdateEvent = {
	type: UpdateType;
	info: SavedInfo | DeletedInfo | UpdatedInfo;
}

export type TargetUpdateEvent = {
	type: UpdateType.TargetDeleted | UpdateType.TargetCleared;
	info: TargetDeletedInfo;
}

export { ee as StorageEventEmitter };

function dispatch(target: string, type: string, event: TargetUpdateEvent | EntityUpdateEvent) {
	const targetEvent = target + ':' + type;
	const anyTargetEvent = '*:' + type;
	const anyEvent = '*';

	const targetCount = ee.listenerCount(targetEvent);
	const anyTargetCount = ee.listenerCount(anyTargetEvent);
	const anyCount = ee.listenerCount(anyEvent);
	
	if (targetCount > 0) {
		ee.emit(targetEvent, event);
	}

	if (anyTargetCount > 0) {
		ee.emit(anyTargetEvent, event);
	}

	if (anyCount > 0) {
		ee.emit(anyEvent, event);
	}
}

function onSaved(changes: Storage.StorageChange) {
	const info = changes.newValue as SavedInfo & IsUpdate;

	const event: EntityUpdateEvent = {
		type: info.isUpdate ? UpdateType.EntityUpdated : UpdateType.EntitySaved,
		info: {
			target: info.target,
			id: info.id
		},
	}

	if (info.isUpdate) {
		dispatch(info.target, 'updated', event);
	}
	else {
		dispatch(info.target, 'saved', event);
	}
}

function onDeleted(changes: Storage.StorageChange) {
	const info = changes.newValue as DeletedInfo;;

	const event: EntityUpdateEvent = {
		type: UpdateType.EntityDeleted,
		info,
	}

	dispatch(info.target, 'deleted', event);
}

function onTargetDeleted(changes: Storage.StorageChange) {
	const info = changes.newValue as TargetDeletedInfo;

	const event: TargetUpdateEvent = {
		type: UpdateType.TargetDeleted,
		info,
	}

	dispatch(info.target, 'destroyed', event);
}

function onTargetCleared(changes: Storage.StorageChange) {
	const info = changes.newValue as TargetClearedInfo;

	const event: TargetUpdateEvent = {
		type: UpdateType.TargetCleared,
		info,
	}

	dispatch(info.target, 'cleared', event);
}

storage.onChanged.addListener((changes) => {
	if (changes.entitySaved) {
		onSaved(changes.entitySaved as Storage.StorageChange);
	}
	else if (changes.entityDeleted) {
		onDeleted(changes.entityDeleted as Storage.StorageChange);
	}
	else if (changes.targetDeleted) {
		onTargetDeleted(changes.targetDeleted as Storage.StorageChange);
	}
	else if (changes.targetCleared) {
		onTargetCleared(changes.targetCleared as Storage.StorageChange);
	}
});