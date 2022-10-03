var webextlib = (function (exports) {
    'use strict';

    exports.Status = void 0;
    (function (Status) {
        Status[Status["InvalidResponse"] = 0] = "InvalidResponse";
        Status[Status["InvalidRequest"] = 1] = "InvalidRequest";
        Status[Status["Success"] = 2] = "Success";
        Status[Status["Error"] = 3] = "Error";
        Status[Status["Yes"] = 4] = "Yes";
        Status[Status["No"] = 5] = "No";
        Status[Status["Busy"] = 6] = "Busy";
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
    function unique() {
        return Date.now().toString(16) + '-' + Math.random().toString(16).slice(2);
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

    const senderKeys = new Set();
    const streamKeys = new Set();
    class Sender {
        key;
        constructor(key) {
            this.key = key;
            if (senderKeys.has(key)) {
                throw new Error("Sender " + key + " already exists");
            }
            senderKeys.add(key);
        }
        async send(data, tabId) {
            const { key } = this;
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
                throw new Error("Response is invalid");
            }
            return response;
        }
    }
    class Stream {
        key;
        listeners;
        constructor(key) {
            this.key = key;
            if (streamKeys.has(key)) {
                throw new Error("Stream " + key + " already exists");
            }
            streamKeys.add(key);
            this.listeners = [];
            browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
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
    }
    var messaging = {
        Sender,
        Stream,
        createTube(key) {
            return [new Sender(key), new Stream(key)];
        }
    };

    var EnvType;
    (function (EnvType) {
        EnvType[EnvType["Tab"] = 0] = "Tab";
        EnvType[EnvType["Popup"] = 1] = "Popup";
        EnvType[EnvType["Background"] = 2] = "Background";
    })(EnvType || (EnvType = {}));
    var environment = {
        Types: EnvType,
        currentEnv: (() => {
            const isHttp = Boolean(/^https?:$/i.exec(location.protocol));
            if (isHttp) {
                return EnvType.Tab;
            }
            const isMozExtension = Boolean(/^moz-extension:$/i.exec(location.protocol));
            if (!isMozExtension) {
                throw new TypeError('Environment type is not recognized. Protocol not recognized');
            }
            const isBackground = location.pathname.includes('background');
            if (isBackground) {
                return EnvType.Background;
            }
            const isPopup = location.pathname.includes('popup');
            if (isPopup) {
                return EnvType.Popup;
            }
            throw new TypeError('Environment type is not recognized. Is extension page, but pathname is not valid');
        })()
    };

    function getCodeForReturnMethod(key, fname = "$$$return") {
        if (!Boolean(/^[a-z$_]+$/i.exec(fname))) {
            throw new Error("Tabs.execute fname can have only these chars in name: english letters, $ and _.");
        }
        return `
    var ${fname} = (function(){
        var end = !1;

        return executor;

        function executor(arg) {
            if (end) {
                throw new TypeError("You can return value by ${fname} only once");
            }
            end = !0;
            browser.runtime.sendMessage({
                k: "${key}", d: arg
            });
        }
    })();


    `;
    }
    function execute(options) {
        return new Promise(r => {
            const messagingKey = unique() + "_TabsExecute";
            browser.runtime.onMessage.addListener(listenToReturn);
            browser.tabs.executeScript(options.tabId, {
                code: getCodeForReturnMethod(messagingKey, options.fname) + options.code
            });
            setTimeout(() => {
                browser.runtime.onMessage.removeListener(listenToReturn);
            }, 60000);
            function listenToReturn(message) {
                if (!message)
                    return;
                if (message?.k === messagingKey) {
                    browser.runtime.onMessage.removeListener(listenToReturn);
                    r(message.d);
                }
            }
        });
    }
    var tabs = {
        execute
    };

    exports.Environment = environment;
    exports.Messaging = messaging;
    exports.Tabs = tabs;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
