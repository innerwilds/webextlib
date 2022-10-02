import {CurrentEnvironment, EnvironmentType, Message, Status} from "../../../src";
import passed from "./test";

const greater = new Message<string, string>("greating");

greater.on(async (data, req) => {
    const [target, message] = data.split(':');

    if (target === "POPUP") {
        req.sendResponse(message);
    }
});

async function setup() {
    const response = await greater.sendMessage("BG:hello");

    if (response.data === "hello" && response.status === Status.Success && !response.error) {
        passed("sending message to bg and waiting for response")
    }

    greater.sendMessage('sendme')
}

setup();

if(EnvironmentType.Popup === CurrentEnvironment) {
    passed("popup is popup by detector")
}