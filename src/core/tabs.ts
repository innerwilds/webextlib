import { unique } from '../utils';

type TabExecuteOptions = {
    tabId: number,
    code: string,
    fname: string,
}

function getCodeForReturnMethod(key: string, fname: string = "$$$return") {
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

function execute(options: TabExecuteOptions): Promise<any[]> {
    return new Promise(r => {
        const messagingKey = unique() + "_TabsExecute";

        browser.runtime.onMessage.addListener(listenToReturn);

        browser.tabs.executeScript(options.tabId, {
            code: getCodeForReturnMethod(messagingKey, options.fname) + options.code
        });

        setTimeout(() => {
            browser.runtime.onMessage.removeListener(listenToReturn);
        }, 60000);

        function listenToReturn(message: { k: string, d: any }) {
            if (!message) return;
            if (message?.k === messagingKey) {
                browser.runtime.onMessage.removeListener(listenToReturn);
                r(message.d);
            }
        }
    });
}

export default {
    execute
}