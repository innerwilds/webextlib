import { Runtime } from "webextension-polyfill";
import { Status } from "./const";

export interface IValidator<T> {
  validate(value: T): boolean;
}

export interface IList<T> {
  append(value: T): boolean;
  clear(value: T): void;

  includes(value: T): boolean;
  includesByPredicate(predicate: (value: T) => boolean): boolean;

  remove(value: T): boolean;
  removeByPredicate(predicate: (value: T) => boolean): number;
  removeSingleByPredicate(predicate: (value: T) => boolean): boolean;

  findByPredicate(predicate: (value: T) => boolean): T | null;

  [Symbol.iterator](): Iterator<T>;
}

export interface IMessage<T, R> {
  sendResponse(data: R): void;
  sendStatus(status: Status, error?: Error): void;
  data: T;
  sender: Runtime.MessageSender;
}

export interface IResponse<T> {
  data?: T;
  error?: Error;
  status: Status;
}

export interface ICoreMessage<T> {
  key: string;
  data: T;
}

export interface ICreateMessage {
  <T, R>(key: string): [ISendMessage<T, R>, IMessageStream<T, R>];
}

export interface ISendMessage<T, R> {
  (data: T, tabId?: number): Promise<IResponse<R>>;
}

export interface IMessageStream<T, R> {
  subscribe(fn: (message: IMessage<T, R>) => void): void;
  unsubscribe(fn: (message: IMessage<T, R>) => void): void;
}