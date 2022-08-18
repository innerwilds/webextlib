import { Runtime } from 'webextension-polyfill';
import browser from 'webextension-polyfill';
import type { ICoreMessage, ICreateMessage, IMessage, IMessageStream, IResponse, ISendMessage } from '../types';
import { Status } from '../const';

const keys = new Set();

const createMessage: ICreateMessage = function <T, R>(key: string) {
  if (keys.has(key)) {
    throw new TypeError('Key ' + key + ' is not already unique');
  }
  return [createSendMessage<T, R>(key), createMessageStream(key)];
};

const createMessageStream = <T, R>(key: string): IMessageStream<T, R> => {
  const fns: ((message: IMessage<T, R>) => void)[] = [];

  browser.runtime.onMessage.addListener(handleMessage);

  function handleMessage(coreMessage: ICoreMessage<T>, sender: Runtime.MessageSender) {
    if (coreMessage.key !== key) {
      return;
    }

    let isClosed = false;

    return new Promise((resolve) => {
      for (const fn of fns) {
        const message: IMessage<T, R> = {
          data: coreMessage.data,
          sender,
          sendResponse: sendResponse,
          sendStatus: sendStatus,
        };
        fn(message);
      }

      function sendResponse(data: R) {
        if (isClosed) {
          throw new TypeError('Response already sent');
        }
        isClosed = true;
        const response: IResponse<R> = {
          status: Status.Success,
          data: data,
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
  }

  return {
    subscribe(fn) {
      if (fns.includes(fn)) {
        return;
      }
      fns.push(fn);
    },
    unsubscribe(fn) {
      const index = fns.indexOf(fn);
      if (index > -1) {
        return;
      }
      fns.push(fn);
    },
  };
};

const createSendMessage = <T, R>(key: string): ISendMessage<T, R> => {
  async function sendMessage(data: T, tabId?: number): Promise<IResponse<R>> {
    const coreMessage: ICoreMessage<T> = {
      key,
      data,
    };

    let response: IResponse<R>;

    if (typeof tabId !== 'undefined') {
      if (typeof tabId !== 'number' || isNaN(tabId)) {
        throw new TypeError('tabId is not a number. Did you mean send message to runtime?');
      }

      response = await browser.tabs.sendMessage(tabId, coreMessage);
    } else {
      response = await browser.runtime.sendMessage(coreMessage);
    }

    return response;
  }
  return sendMessage;
};

export { createMessage, Status };
