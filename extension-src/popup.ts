import {Browser} from 'webextension-polyfill';
import {UpdateType} from '../src';
import StoredList from '../src/core/stored-list';
import {Entity} from './entity';

declare let browser: Browser;

async function setup() {
	const list = await StoredList.create<Entity>('Ababa', browser.storage.local);

	list.onUpdate.on(UpdateType.ItemAdded, i => {
		console.log('POPUP: ', i);
	});

	await list.append(new Entity(234, 'Paul'));
	await list.update(new Entity(234, 'James'));
	await list.remove(234);
}

setup().then(console.log).catch(console.error);
