interface IValidator<T> {
  validate(value: T): boolean;
}

interface IList<T> {
  append(value: T): boolean;
  clear(value: T): void;

  includes(value: T): boolean;
  includesByPredicate(predicate: (value: T) => boolean): boolean;

  remove(value: T): boolean;
  removeByPredicate(predicate: (value: T) => boolean): number;
  removeSingleByPredicate(predicate: (value: T) => boolean): boolean;

  findByPredicate(predicate: (value: T) => boolean): T;

  [Symbol.iterator](): Iterator<T>;
}

interface IMessage<T, R> {
  sendResponse(data: R): void;
  sendStatus(status: import("./core/message").Status, error?: Error): void;
  data: T;
  sender: import("webextension-polyfill").Runtime.MessageSender;
}

interface IResponse<T> {
  data?: T;
  error?: Error;
  status: import("./core/message").Status;
}

interface ICoreMessage<T> {
  key: string;
  data: T;
}

interface ICreateMessage {
  <T, R>(key: string): [ISendMessage<T, R>, IMessageStream<T, R>];
}

interface ISendMessage<T, R> {
  (data: T, tabId?: number): Promise<IResponse<R>>;
}

interface IMessageStream<T, R> {
  subscribe(fn: (message: IMessage<T, R>) => void): void;
  unsubscribe(fn: (message: IMessage<T, R>) => void): void;
}