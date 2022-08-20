import { isArray, XEventTarget, IList } from 'deflib';
import { Storage } from 'webextension-polyfill';

export interface IStorageUpdated<T> {
  added?: T;
  removed?: T;
  cleared?: T[];
  updated?: {
    old: T;
    new: T;
  };
}

export class StoredList<T> implements IList<T> {
  //#region Fields
  public readonly name: string;

  private storage: Storage.StorageArea;
  private items: T[];
  private initialized: boolean;
  private saveTimeoutId: number | null;
  private timeoutTime: number;
  private deleted: boolean;

  public onAdded: XEventTarget<IStorageUpdated<T>>;
  public onRemoved: XEventTarget<IStorageUpdated<T>>;
  public onUpdated: XEventTarget<IStorageUpdated<T>>;
  public onCleared: XEventTarget<IStorageUpdated<T>>;
  public onDeleted: XEventTarget<void>;
  //#endregion

  //#region Init
  constructor(name: string, storage: Storage.LocalStorageArea) {
    this.name = name;
    this.storage = storage;
    this.initialized = false;
    this.saveTimeoutId = null;
    this.timeoutTime = 5000;
    this.deleted = false;

    this.items = [];

    this.onAdded = new XEventTarget<IStorageUpdated<T>>();
    this.onRemoved = new XEventTarget<IStorageUpdated<T>>();
    this.onUpdated = new XEventTarget<IStorageUpdated<T>>();
    this.onCleared = new XEventTarget<IStorageUpdated<T>>();
    this.onDeleted = new XEventTarget();
  }

  public async init(): Promise<void> {
    if (this.deleted) {
      throw new TypeError("Stored list " + this.name + " is deleted.");
    }

    if (this.initialized) {
      return;
    }

    const valid = await this.validateStorage();

    if (!valid) {
      await this.recreate();
    }

    this.items = await this.loadItems();
    this.initialized = true;
  }

  private async validateStorage(): Promise<boolean> {
    if (this.deleted) {
      throw new TypeError("Stored list " + this.name + " is deleted.");
    }
    
    const { name, storage } = this;

    const response = await storage.get(name);

    return isArray(response[name]);
  }

  private async recreate(): Promise<void> {
    if (this.deleted) {
      throw new TypeError("Stored list " + this.name + " is deleted.");
    }
    
    const { name, storage } = this;
    await storage.set({ [name]: [] });
  }

  private async loadItems(): Promise<T[]> {
    if (this.deleted) {
      throw new TypeError("Stored list " + this.name + " is deleted.");
    }
    
    const { name, initialized, storage } = this;

    const response = await storage.get(name);

    if (!isArray(response[name])) {
      if (!initialized) throw new TypeError('Call init before using StoredCollection');
      this.recreate();
    }

    return response[name];
  }

  private async save(): Promise<void> {
    if (this.deleted) {
      throw new TypeError("Stored list " + this.name + " is deleted.");
    }
    
    if (this.saveTimeoutId) {
      clearTimeout(this.saveTimeoutId);
      this.saveTimeoutId = null;
      this.timeoutTime -= 250; // Чем больше несохранено, тем выше риски потерять данные.
    }

    const { name, storage, items } = this;

    this.saveTimeoutId = setTimeout(() => {
      storage.set({ [name]: items });
      this.timeoutTime = 5000;
    }, this.timeoutTime);
  }

  //#endregion

  public append(item: T): boolean {
    if (this.deleted) {
      throw new TypeError("Stored list " + this.name + " is deleted.");
    }
    
    if (this.items.includes(item)) {
      return false;
    }
    this.items.push(item);
    this.save();
    this.onAdded.dispatch({ added: item });
    return true;
  }

  public remove(item: T): boolean {
    if (this.deleted) {
      throw new TypeError("Stored list " + this.name + " is deleted.");
    }
    
    const index = this.items.indexOf(item);
    if (index === -1) return false;
    this.items.splice(index, 1);
    this.save();
    this.onRemoved.dispatch({ removed: item });
    return true;
  }

  public removeByPredicate(predicate: (value: T) => boolean): number {
    if (this.deleted) {
      throw new TypeError("Stored list " + this.name + " is deleted.");
    }
    
    let index: number;
    let count = 0;
    while ((index = this.items.findIndex((item) => predicate(item))) > -1) {
      const lock = this.items[index];
      this.onRemoved.dispatch({ removed: lock });
      this.items.splice(index, 1);
      count++;
    }
    this.save();
    return count;
  }

  public removeSingleByPredicate(predicate: (value: T) => boolean): boolean {
    if (this.deleted) {
      throw new TypeError("Stored list " + this.name + " is deleted.");
    }
    
    const index = this.items.findIndex((item) => predicate(item));
    if (index === -1) return false;
    const lock = this.items[index];
    this.items.splice(index, 1);
    this.save();
    this.onRemoved.dispatch({ removed: lock });
    return true;
  }

  public clear(): void {
    if (this.deleted) {
      throw new TypeError("Stored list " + this.name + " is deleted.");
    }
    
    const lock = [...this.items];
    this.items.length = 0;
    this.save();
    this.onCleared.dispatch({ cleared: lock });
  }

  public includes(item: T): boolean {
    if (this.deleted) {
      throw new TypeError("Stored list " + this.name + " is deleted.");
    }
    
    return this.items.includes(item);
  }

  public includesByPredicate(predicate: (value: T) => boolean): boolean {
    if (this.deleted) {
      throw new TypeError("Stored list " + this.name + " is deleted.");
    }
    
    return this.items.findIndex((item) => predicate(item)) > -1;
  }

  public findByPredicate(predicate: (value: T) => boolean): T | null {
    if (this.deleted) {
      throw new TypeError("Stored list " + this.name + " is deleted.");
    }
    
    const result = this.items.find((item) => predicate(item));

    if (result) {
      return result;
    }

    return null;
  }

  public update(predicate: (value: T) => boolean, update: (value: Readonly<T>) => T) {
    if (this.deleted) {
      throw new TypeError("Stored list " + this.name + " is deleted.");
    }
    
    const { items } = this;
    let index = 0;

    for (const item of items) {
      const toUpdate = predicate(item);
      if (toUpdate) {
        const previous = items[index];
        const newItem = (items[index] = update(Object.freeze(item)));
        this.onUpdated.dispatch({ updated: { new: newItem, old: previous } });
      }
      index++;
    }

    this.save();
  }

  public *[Symbol.iterator](): Iterator<T> {
    if (this.deleted) {
      throw new TypeError("Stored list " + this.name + " is deleted.");
    }
    
    for (const item of this.items) {
      yield item;
    }
  }

  public delete() {
    if (this.deleted) {
      throw new TypeError("Stored list " + this.name + " is already deleted.");
    }
    
    this.deleted = true;
    this.storage.remove(this.name);
    this.onDeleted.dispatch();
  }
}
