export function isString(o: any): o is string {
    return typeof o === 'string';
}

export function isObject(o: any): o is object {
    return o !== null && typeof o === 'object';
}

export const has: (obj: any, key: string) => boolean = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

export function inEnum(enu: any, value: string | number): boolean {
    return Object.values(enu).includes(value);
}

export function unique() {
    return Date.now().toString(16) + '-' + Math.random().toString(16).slice(2);
}