const {Message, EnvironmentType, CurrentEnvironment, Status} = webextlib;

const greater = new Message("greating");

greater.on(async (data, req) => {
    const [target, message] = data.split(':');

    if (target === "POPUP") {
        req.sendResponse(message);
    }
});

async function setup() {
    const response = await greater.sendMessage("BG:hello");

    if (response.data === "hello" && response.status === Status.Success && !response.error) {
        console.log("3. sending message to bg and waiting for response. Success.")
    }

    greater.sendMessage('sendme')
}

setup();

if(EnvironmentType.Popup === CurrentEnvironment) {
    console.log("4. popup is popup by detector. Success.")
}