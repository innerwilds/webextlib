import type {Runtime} from 'webextension-polyfill';
import type {ICoreMessage, IMessage, IResponse} from '../types';
import {Status} from '../const';
import messageResponseValidator from '../validators/message-response';
import coreMessageValidator from '../validators/core-message';

const keys = new Set();

export default class Message<T, R> {
	private readonly listeners: Array<(message: IMessage<T, R>) => void>;

	constructor(private readonly key: string) {
		if (keys.has(key)) {
			throw new TypeError('Key ' + key + ' is in use');
		}

		this.listeners = [];

		browser.runtime.onMessage.addListener(this.handleMessage);
	}

	public async sendMessage(data: T, tabId?: number): Promise<IResponse<R>> {
		const {key} = this;

		if (!keys.has(key)) {
			throw new TypeError('Message has been deleted.');
		}

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
			return {status: Status.InvalidResponse};
		}

		return response;
	}

	public on(listener: (message: IMessage<T, R>) => void) {
		const {listeners} = this;

		if (listeners.includes(listener)) {
			return;
		}

		listeners.push(listener);
	}

	public off(listener: (message: IMessage<T, R>) => void) {
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
				const message: IMessage<T, R> = {
					data: coreMessage.data,
					sender,
					sendResponse,
					sendStatus,
				};
				try {
					listener(message);
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
