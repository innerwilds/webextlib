import {CurrentEnvironment, EnvironmentType, Message, Status} from "../../../src";
import passed from "./test";

const greater = new Message<string, string>("greating");

greater.on(async (data, req) => {
    const [target, message] = data.split(':');

    if (target === "BG") {
        req.sendResponse(message);
    }
    else if (target === "sendme") {
        const response = await greater.sendMessage("POPUP:hello");
        if (response.data === "hello" && response.status === Status.Success && !response.error) {
            passed("sending message to popup and waiting for response")
        }
    }
});

if(EnvironmentType.Background === CurrentEnvironment) {
    passed("bg is bg by detector")
}