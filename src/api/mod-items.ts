import { TSR_URL_MATCH_PATTERN } from '../const';
import ModItem from '../entities/mod-item';
import { StoredList, IStorageUpdated } from '../core/stored-list';
import browser from 'webextension-polyfill';
import { createMessage, Status } from '../core/message';
import ModItemValidator from '../validators/mod-item';

const [sendSaveModItem, streamSaveModItem] = createMessage<ModItem, boolean>('SaveModItem');
const [sendDeleteModItem, streamDeleteModItem] = createMessage<number, boolean>('DeleteModItem');
const [sendCheckModItem, streamHasModItem] = createMessage<number, boolean>('CheckModItem');
const [sendGetModItems, streamGetModItems] = createMessage<void, ModItem[]>('GetModItems');
const [sendClearModItems, streamClearModItems] = createMessage<void, boolean>('ClearModItems');
const [sendModItemsEvent, streamModItemsEvents] = createMessage<IStorageUpdated<ModItem>, void>('ModItemsEvents');

class ModItemsAPI {
  constructor(private items: StoredList<ModItem>) {}

  private pingEvent(info: IStorageUpdated<ModItem>) {
    sendModItemsEvent(info);
    browser.tabs.query({ url: TSR_URL_MATCH_PATTERN }).then((tabsList) => {
      for (const tabInfo of tabsList) sendModItemsEvent(info, tabInfo.id);
    });
  }

  private handleCollectionAdded = (info: IStorageUpdated<ModItem>) => this.pingEvent(info);
  private handleCollectionRemoved = (info: IStorageUpdated<ModItem>) => this.pingEvent(info);
  private handleCollectionUpdated = (info: IStorageUpdated<ModItem>) => this.pingEvent(info);
  private handleCollectionCleared = (info: IStorageUpdated<ModItem>) => this.pingEvent(info);

  public async start() {
    streamSaveModItem.subscribe(this.handleSaveItem);
    streamDeleteModItem.subscribe(this.handleDeleteItem);
    streamHasModItem.subscribe(this.handleHasItem);
    streamGetModItems.subscribe(this.handleGetItems);
    streamClearModItems.subscribe(this.handleClearItems);

    this.items.onAdded.addListener(this.handleCollectionAdded);
    this.items.onRemoved.addListener(this.handleCollectionRemoved);
    this.items.onUpdated.addListener(this.handleCollectionUpdated);
    this.items.onCleared.addListener(this.handleCollectionCleared);
  }

  public async stop() {
    streamSaveModItem.unsubscribe(this.handleSaveItem);
    streamDeleteModItem.unsubscribe(this.handleDeleteItem);
    streamHasModItem.unsubscribe(this.handleHasItem);
    streamGetModItems.unsubscribe(this.handleGetItems);
    streamClearModItems.unsubscribe(this.handleClearItems);

    this.items.onAdded.removeListener(this.handleCollectionAdded);
    this.items.onRemoved.removeListener(this.handleCollectionRemoved);
    this.items.onUpdated.removeListener(this.handleCollectionUpdated);
    this.items.onCleared.removeListener(this.handleCollectionCleared);
  }

  private handleSaveItem = ({ data, sendStatus, sendResponse }: IMessage<ModItem, boolean>) => {
    if (!ModItemValidator.validate(data)) {
      return sendStatus(Status.Error, new TypeError('Invalid data'));
    }

    const modItem = new ModItem(data);
    const { items } = this;
    const predicate = (mod) => mod.id === modItem.id;

    if (items.includesByPredicate(predicate)) items.update(predicate, (mod) => modItem);
    else items.append(modItem);

    sendResponse(true);
  };

  private handleHasItem = ({ data, sendStatus, sendResponse }: IMessage<number, boolean>) => {
    if (typeof data !== 'number') {
      return sendStatus(Status.Error, new TypeError('Invalid data'));
    }

    sendResponse(this.items.includesByPredicate((mod) => mod.id === data));
  };

  private handleDeleteItem = ({ data, sendResponse, sendStatus }: IMessage<number, boolean>) => {
    if (typeof data !== 'number') {
      return sendStatus(Status.Error, new TypeError('Invalid data'));
    }

    this.items.removeSingleByPredicate((mod) => mod.id === data);

    sendResponse(true);
  };

  private handleClearItems = ({ data, sendResponse }: IMessage<void, boolean>) => {
    this.items.clear();
    sendResponse(true);
  };

  private handleGetItems = ({ data, sendResponse }: IMessage<void, ModItem[]>) => {
    sendResponse([...this.items]);
  };
}

export {
  sendSaveModItem,
  sendCheckModItem,
  sendDeleteModItem,
  sendGetModItems,
  sendClearModItems,
  streamModItemsEvents,
  ModItemsAPI,
};
