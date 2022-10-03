import type {Runtime} from 'webextension-polyfill';
import type {ICoreMessage, IResponse, IRequest} from '../types';

import {Status} from '../const';

import messageResponseValidator from '../validators/message-response';
import coreMessageValidator from '../validators/core-message';

const senderKeys = new Set<string>();
const streamKeys = new Set<string>();

class Sender<T, R> {
	constructor(public readonly key: string) {
		if (senderKeys.has(key)) {
			throw new Error("Sender " + key + " already exists");
		}

		senderKeys.add(key);
	}

	async send(data: T, tabId?: number): Promise<IResponse<R>> {
		const {key} = this;

		const coreMessage: ICoreMessage<T> = {
			key,
			data,
		};

		let response: IResponse<R>;

		if (typeof tabId === 'number' && !isNaN(tabId)) {
			response = (await browser.tabs.sendMessage(tabId, coreMessage)) as IResponse<R>;
		} else {
			response = (await browser.runtime.sendMessage(coreMessage)) as IResponse<R>;
		}

		if (!messageResponseValidator.validate(response)) {
			throw new Error("Response is invalid");
		}

		return response;
	}
}

class Stream<T, R> {
	private readonly listeners: Array<(data: Readonly<T>, request: IRequest<R>) => void>;

	constructor(public readonly key: string) {
		if (streamKeys.has(key)) {
			throw new Error("Stream " + key + " already exists");
		}

		streamKeys.add(key);

		this.listeners = [];

		browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
	}

	public on(listener: (data: Readonly<T>, request: IRequest<R>) => void) {
		const {listeners} = this;

		if (listeners.includes(listener)) {
			return;
		}

		listeners.push(listener);
	}

	public off(listener: (data: Readonly<T>, request: IRequest<R>) => void) {
		const {listeners} = this;

		const index = listeners.indexOf(listener);

		if (index > -1) {
			return;
		}

		listeners.splice(index, 1);
	}

	private readonly handleMessage = (coreMessage: ICoreMessage<T>, sender: Runtime.MessageSender) => {
		if (!coreMessageValidator.validate(coreMessage)) {
			return;
		}

		const {key, listeners} = this;

		if (coreMessage.key !== key) {
			return;
		}

		let isClosed = false;

		return new Promise(resolve => {
			for (const listener of listeners) {
				const request: IRequest<R> = {
					sender,
					sendResponse,
					sendStatus,
				};
				try {
					listener(coreMessage.data, request);
				} catch {}
			}

			function sendResponse(data: R) {
				if (isClosed) {
					throw new TypeError('Response already sent');
				}

				isClosed = true;

				const response: IResponse<R> = {
					status: Status.Success,
					data,
				};

				resolve(response);
			}

			function sendStatus(status: Status, error?: Error) {
				if (isClosed) {
					throw new TypeError('Response already sent');
				}

				isClosed = true;

				const response: IResponse<R> = {
					status,
					error,
				};
				
				resolve(response);
			}
		});
	};
}

export default {
	Sender,
	Stream,
	createTube<T,R>(key: string) {
		return [new Sender<T,R>(key), new Stream<T,R>(key)]
	}
}