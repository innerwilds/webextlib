/* eslint-disable @typescript-eslint/naming-convention */

import {Browser, Runtime} from 'webextension-polyfill';
import {Status} from './const';

declare let browser: Browser;

export type IRequest<R> = {
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

export type Validator<T> = {
	validate(value: any): value is T;
};
