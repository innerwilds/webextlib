import {Browser} from 'webextension-polyfill';
import { clearTarget, deleteEntity, deleteTarget, saveEntity, StorageEventEmitter } from '../src';
import {Entity} from './entity';

declare let browser: Browser;

console.log("LAUNCH BACKGROUND!");

const entity = new Entity(0, "Jake");

StorageEventEmitter.addListener('*:saved', console.log);
StorageEventEmitter.addListener('*:deleted', console.log);
StorageEventEmitter.addListener('*:destroyed', console.log);
StorageEventEmitter.addListener('*:cleared', console.log);
StorageEventEmitter.addListener('*:updated', console.log);

saveEntity('list', entity)
.then(async () => {

	entity.name = "Paul";

	await saveEntity('list', entity);
	await deleteEntity('list', entity.id);
	await clearTarget('list');
	await deleteTarget('list');

});