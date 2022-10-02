const {Message, EnvironmentType, CurrentEnvironment, Status} = webextlib;

const greater = new Message("greating");

console.log("4 Tests. Unordered logging.")

greater.on(async (data, req) => {
    const [target, message] = data.split(':');

    if (target === "BG") {
        req.sendResponse(message);
    }
    else if (target === "sendme") {
        const response = await greater.sendMessage("POPUP:hello");
        if (response.data === "hello" && response.status === Status.Success && !response.error) {
            console.log("1. sending message to popup and waiting for response. Success.")
        }
    }
});

if(EnvironmentType.Background === CurrentEnvironment) {
    console.log("2. bg is bg by detector. Success.")
}