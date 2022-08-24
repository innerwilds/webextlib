import {Browser} from 'webextension-polyfill';
import {UpdateType} from '../src';
import StoredList from '../src/core/stored-list';
import {Entity} from './entity';

declare let browser: Browser;

async function setup() {
	const list = await StoredList.create<Entity>('Ababa', browser.storage.local);

	list.onUpdate.on(UpdateType.ItemAdded, i => {
		console.log('BG Added: ', i);
	});

	list.onUpdate.on(UpdateType.ItemDeleted, i => {
		console.log('BG Removed: ', i);
	});

	await list.append(new Entity(0, 'Jake'));
}

setup().then(console.log).catch(console.error);
