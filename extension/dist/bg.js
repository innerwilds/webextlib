(function () {
    'use strict';

    const isArray = Array.isArray;
    const arrayRemove = (array, item) => {
        let i = array.indexOf(item);
        if (i > -1) {
            array.splice(i, 1);
            return true;
        }
        return false;
    };
    const hasProperty = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

    class QEventTarget {
        constructor() {
            this.listeners = [];
        }
        addListener(listener) {
            if (typeof listener !== 'function') {
                throw new TypeError('listener is not a function');
            }
            const { listeners } = this;
            if (!listeners.includes(listener)) {
                listeners.push(listener);
            }
        }
        removeListener(listener) {
            if (typeof listener !== 'function') {
                throw new TypeError('listener is not a function');
            }
            const { listeners } = this;
            arrayRemove(listeners, listener);
        }
        dispatch(data, context) {
            const { listeners } = this;
            listeners.forEach((listener) => {
                try {
                    listener.call(context, data);
                }
                catch (_a) { }
            });
        }
    }

    var Status;
    (function (Status) {
        Status[Status["Success"] = 0] = "Success";
        Status[Status["Error"] = 1] = "Error";
        Status[Status["Yes"] = 2] = "Yes";
        Status[Status["No"] = 3] = "No";
    })(Status || (Status = {}));
    var UpdateType;
    (function (UpdateType) {
        UpdateType[UpdateType["ListDeleted"] = 0] = "ListDeleted";
        UpdateType[UpdateType["ItemAdded"] = 1] = "ItemAdded";
        UpdateType[UpdateType["ItemDeleted"] = 2] = "ItemDeleted";
        UpdateType[UpdateType["ListCleared"] = 3] = "ListCleared";
        UpdateType[UpdateType["ItemUpdated"] = 4] = "ItemUpdated";
        UpdateType[UpdateType["None"] = 5] = "None";
    })(UpdateType || (UpdateType = {}));

    function validateCoreStorageData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        const props = Object.getOwnPropertyDescriptors(data);
        const keys = Object.keys(props);
        const checkEvery = (key) => {
            if (key === 'items') {
                return isArray(data[key]);
            }
            if (key === 'updateIds') {
                return isArray(data[key]);
            }
            if (key === 'updateCounter') {
                return isFinite(data[key]) && data[key] !== null;
            }
            if (key === 'updateType') {
                return Object.values(UpdateType).includes(data[key]);
            }
            return false;
        };
        return keys.every(checkEvery);
    }
    class StoredList {
        name;
        storage;
        static async create(name, storage) {
            const list = new StoredList(name, storage);
            const isValid = await list.validateStorage();
            if (isValid) {
                await list.loadStorageData();
            }
            else {
                await list.recreateStorage();
            }
            list.storage.onChanged.addListener(list.handleChanges);
            return list;
        }
        onUpdate;
        items;
        updateCounter;
        deleted;
        constructor(name, storage) {
            this.name = name;
            this.storage = storage;
            this.name = name;
            this.storage = storage;
            this.deleted = false;
            this.items = [];
            this.updateCounter = 0;
            this.onUpdate = new QEventTarget();
        }
        async append(...values) {
            if (this.deleted) {
                throw new TypeError('List has been deleted.');
            }
            const newIds = [];
            for (const value of values) {
                if (this.items.some(item => item.id === value.id)) {
                    continue;
                }
                this.items.push(value);
                newIds.push(value.id);
            }
            if (newIds.length === 0) {
                return 0;
            }
            await this.save({ updateIds: newIds, updateType: UpdateType.ItemAdded });
            return newIds.length;
        }
        async remove(...values) {
            if (this.deleted) {
                throw new TypeError('List has been deleted.');
            }
            const removedIds = [];
            if (typeof values[0] === 'number') {
                for (const id of values) {
                    const index = this.items.findIndex(item => item.id === id);
                    this.items.splice(index, 1);
                    removedIds.push(id);
                }
            }
            else {
                for (const value of values) {
                    const index = this.items.findIndex(item => item.id === value.id);
                    this.items.splice(index, 1);
                    removedIds.push(value.id);
                }
            }
            if (removedIds.length === 0) {
                return 0;
            }
            await this.save({ updateIds: removedIds, updateType: UpdateType.ItemDeleted });
            return removedIds.length;
        }
        async update(...newValues) {
            if (this.deleted) {
                throw new TypeError('List has been deleted.');
            }
            const updatedIds = [];
            for (const value of newValues) {
                const index = this.items.findIndex(item => item.id === value.id);
                if (index === -1) {
                    continue;
                }
                this.items[index] = value;
            }
            if (updatedIds.length === 0) {
                return 0;
            }
            await this.save({ updateIds: updatedIds, updateType: UpdateType.ItemUpdated });
            return updatedIds.length;
        }
        find(predicate) {
            if (this.deleted) {
                throw new TypeError('List has been deleted.');
            }
            const found = this.items.find(item => predicate(item));
            return found;
        }
        findById(id) {
            if (this.deleted) {
                throw new TypeError('List has been deleted.');
            }
            const found = this.items.find(item => item.id === id);
            return found;
        }
        async clear() {
            if (this.deleted) {
                throw new TypeError('List has been deleted.');
            }
            if (this.items.length === 0) {
                return false;
            }
            const removedIds = this.items.map(item => item.id);
            this.items.length = 0;
            await this.save({
                updateIds: removedIds,
                updateType: UpdateType.ListCleared,
            });
            return true;
        }
        async delete(deletedByOther = false) {
            if (this.deleted) {
                return false;
            }
            this.deleted = true;
            this.items.length = 0;
            this.storage.onChanged.removeListener(this.handleChanges);
            if (!deletedByOther) {
                await this.storage.set({ [this.name]: { updateType: UpdateType.ItemDeleted } });
            }
            return true;
        }
        handleChanges = async (changes) => {
            const changeInfo = changes[this.name];
            if (!changeInfo?.newValue) {
                console.warn('Handle undefined changes ', changes);
                return;
            }
            // Write an validator
            const info = changeInfo.newValue;
            if (info.updateType === UpdateType.None) {
                console.warn('Some other StoredList has been recreate the storage, when this StoredList is exists.');
                await this.delete(true);
                return;
            }
            if (info.updateType === UpdateType.ListDeleted) {
                await this.delete(true);
                return;
            }
            if (info.updateCounter === this.updateCounter) {
                return;
            }
            this.localUpdate(info);
            this.onUpdate.dispatch({ ids: info.updateIds, type: info.updateType, external: true });
        };
        localUpdate(info) {
            const { updateType, updateIds, items } = info;
            if (updateType === UpdateType.ListCleared) {
                this.items.length = 0;
            }
            else if (updateType === UpdateType.ItemAdded) {
                for (const id of updateIds) {
                    if (!this.items.some(i => i.id === id)) {
                        const found = items.find(i => i.id === id);
                        if (found) {
                            this.items.push(found);
                        }
                    }
                }
            }
            else if (updateType === UpdateType.ItemDeleted) {
                for (const id of updateIds) {
                    const index = this.items.findIndex(i => i.id === id);
                    this.items.splice(index, 1);
                }
            }
            else if (updateType === UpdateType.ItemUpdated) {
                for (const item of items) {
                    const index = this.items.findIndex(i => i.id === item.id);
                    this.items[index] = item;
                }
            }
            this.updateCounter = info.updateCounter;
        }
        async recreateStorage() {
            if (this.deleted) {
                throw new TypeError('List has been deleted.');
            }
            const data = {
                items: [],
                updateType: UpdateType.None,
                updateCounter: 0,
                updateIds: [],
            };
            await this.storage.set({ [this.name]: data });
            this.items = [];
            this.updateCounter = 0;
        }
        async validateStorage() {
            if (this.deleted) {
                throw new TypeError('List has been deleted.');
            }
            const { storage, name } = this;
            const response = await storage.get(name);
            if (!hasProperty(response, name)) {
                return false;
            }
            const storageData = response[name];
            return validateCoreStorageData(storageData);
        }
        async loadStorageData() {
            if (this.deleted) {
                throw new TypeError('List has been deleted.');
            }
            const response = await this.storage.get(this.name);
            // Write an validator
            const data = response[this.name];
            this.updateCounter = data.updateCounter;
            this.items = data.items;
        }
        async save(info) {
            if (this.deleted) {
                throw new TypeError('List has been deleted.');
            }
            const saveInfo = {
                items: this.items,
                updateCounter: ++this.updateCounter,
                updateIds: info.updateIds,
                updateType: info.updateType,
            };
            this.onUpdate.dispatch({ ids: info.updateIds, type: info.updateType, external: false });
            await this.storage.set({ [this.name]: saveInfo });
        }
    }

    class Entity {
        id;
        name;
        constructor(id, name) {
            this.id = id;
            this.name = name;
        }
    }

    async function setup() {
        const list = await StoredList.create('Ababa', browser.storage.local);
        list.onUpdate.addListener(i => {
            console.log('BG: ', i);
        });
        await list.append(new Entity(0, 'Jake'));
    }
    setup().then(console.log).catch(console.error);

})();
//# sourceMappingURL=bg.js.map
