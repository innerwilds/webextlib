var webextlib = (function (exports) {
    'use strict';

    exports.Status = void 0;
    (function (Status) {
        Status[Status["InvalidResponse"] = 0] = "InvalidResponse";
        Status[Status["Success"] = 1] = "Success";
        Status[Status["Error"] = 2] = "Error";
        Status[Status["Yes"] = 3] = "Yes";
        Status[Status["No"] = 4] = "No";
    })(exports.Status || (exports.Status = {}));

    function isString(o) {
        return typeof o === 'string';
    }
    function isObject(o) {
        return o !== null && typeof o === 'object';
    }
    const has = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
    function inEnum(enu, value) {
        return Object.values(enu).includes(value);
    }

    const messageResponseValidator = {
        validate(value) {
            return isObject(value) && inEnum(exports.Status, value.status);
        },
    };

    const coreMessageValidator = {
        validate(value) {
            return isObject(value) && isString(value.key) &&
                has(value, 'data');
        },
    };

    const keys = new Set();
    class Message {
        key;
        listeners;
        constructor(key) {
            this.key = key;
            if (keys.has(key)) {
                throw new TypeError('Key ' + key + ' is in use');
            }
            keys.add(key);
            this.listeners = [];
            browser.runtime.onMessage.addListener(this.handleMessage);
        }
        async sendMessage(data, tabId) {
            const { key } = this;
            if (!keys.has(key)) {
                throw new TypeError('Message has been deleted.');
            }
            const coreMessage = {
                key,
                data,
            };
            let response;
            if (typeof tabId === 'number' && !isNaN(tabId)) {
                response = (await browser.tabs.sendMessage(tabId, coreMessage));
            }
            else {
                response = (await browser.runtime.sendMessage(coreMessage));
            }
            if (!messageResponseValidator.validate(response)) {
                return { status: exports.Status.InvalidResponse };
            }
            return response;
        }
        on(listener) {
            const { listeners } = this;
            if (listeners.includes(listener)) {
                return;
            }
            listeners.push(listener);
        }
        off(listener) {
            const { listeners } = this;
            const index = listeners.indexOf(listener);
            if (index > -1) {
                return;
            }
            listeners.splice(index, 1);
        }
        handleMessage = (coreMessage, sender) => {
            if (!coreMessageValidator.validate(coreMessage)) {
                return;
            }
            const { key, listeners } = this;
            if (coreMessage.key !== key) {
                return;
            }
            let isClosed = false;
            return new Promise(resolve => {
                for (const listener of listeners) {
                    const request = {
                        sender,
                        sendResponse,
                        sendStatus,
                    };
                    try {
                        listener(coreMessage.data, request);
                    }
                    catch { }
                }
                function sendResponse(data) {
                    if (isClosed) {
                        throw new TypeError('Response already sent');
                    }
                    isClosed = true;
                    const response = {
                        status: exports.Status.Success,
                        data,
                    };
                    resolve(response);
                }
                function sendStatus(status, error) {
                    if (isClosed) {
                        throw new TypeError('Response already sent');
                    }
                    isClosed = true;
                    const response = {
                        status,
                        error,
                    };
                    resolve(response);
                }
            });
        };
        destroy() {
            browser.runtime.onMessage.removeListener(this.handleMessage);
            keys.delete(this.key);
        }
    }

    exports.EnvironmentType = void 0;
    (function (EnvironmentType) {
        EnvironmentType[EnvironmentType["Tab"] = 0] = "Tab";
        EnvironmentType[EnvironmentType["Popup"] = 1] = "Popup";
        EnvironmentType[EnvironmentType["Background"] = 2] = "Background";
    })(exports.EnvironmentType || (exports.EnvironmentType = {}));
    function detectEnvironmentType() {
        const isHttp = Boolean(/^https?:$/i.exec(location.protocol));
        if (isHttp) {
            return exports.EnvironmentType.Tab;
        }
        const isMozExtension = Boolean(/^moz-extension:$/i.exec(location.protocol));
        if (!isMozExtension) {
            throw new TypeError('Environment type is not recognized. Protocol not recognized');
        }
        const isBackground = location.pathname.includes('background');
        if (isBackground) {
            return exports.EnvironmentType.Background;
        }
        const isPopup = location.pathname.includes('popup');
        if (isPopup) {
            return exports.EnvironmentType.Popup;
        }
        throw new TypeError('Environment type is not recognized. Is extension page, but pathname is not valid');
    }
    const type = detectEnvironmentType();

    exports.CurrentEnvironment = type;
    exports.Message = Message;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
