import { hasProperty } from "deflib";

function save(name: string, obj: any) {
    browser.storage.local.set({ [name]: obj });
}

export function createStoredObjectFrom(name: string, obj: any) {
    const properties = Object.getOwnPropertyDescriptors(obj);
    const keys = Object.keys(properties);

    keys.forEach(key => {
        const desc = properties[key];

        if (!desc.set || !desc.enumerable) {
            return;
        }

        const set = desc.set;

        desc.set = function(value) {
            set.call(this, value);
            save(name, obj);
        };

        Object.defineProperty(obj, key, desc);
    });
}

export async function loadStoredObject<T>(name: string): Promise<T | null> {
    const obj = await browser.storage.local.get(name);

    if (hasProperty(obj, name)) {
        return obj[name];
    }

    return null;
}