/* eslint-disable @typescript-eslint/naming-convention */

import {Browser, Runtime} from 'webextension-polyfill';
import {Status, UpdateType} from './const';

declare let browser: Browser;

export type ICoreStorageData<T> = {
	items: T[];
	updateType: UpdateType;
	updateCounter: number;
	updateIds: number[];
};

export type ICoreStorageDataUpdateInfo<T> = {
	updateType: UpdateType;
	updateIds: number[];
	item?: T;
};

export type IStoredListUpdateInfo<T> = {
	ids: number[];
	type: UpdateType;
	external: boolean;
};

export type IMessage<T, R> = {
	data: T;
	sender: Runtime.MessageSender;
	sendResponse(data: R): void;
	sendStatus(status: Status, error?: Error): void;
};

export type IResponse<T> = {
	data?: T;
	error?: Error;
	status: Status;
};

export type ICoreMessage<T> = {
	key: string;
	data: T;
};

export type ICreateMessage = <T, R>(key: string) => [ISendMessage<T, R>, IMessageStream<T, R>];

export type ISendMessage<T, R> = (data: T, tabId?: number) => Promise<IResponse<R>>;

export type IMessageStream<T, R> = {
	subscribe(fn: (message: IMessage<T, R>) => void): void;
	unsubscribe(fn: (message: IMessage<T, R>) => void): void;
};
