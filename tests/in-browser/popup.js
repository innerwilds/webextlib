const {Messaging, Environment, CurrentEnvironment, Status} = webextlib;

const [greaterSender, greaterStream] = Messaging.createTube("greating");

const {failed, passed} = createPF("Popup Environment", 2);

greaterStream.on(async (data, req) => {
    const [target, message] = data.split(':');

    if (target === "POPUP") {
        req.sendResponse(message);
    }
});

async function setup() {
    const response = await greaterSender.send("BG:hello");

    if (response.data === "hello" && response.status === Status.Success && !response.error) {
        passed("sending message to bg and waiting for response.")
    }
    else {
        failed("sending message to bg and waiting for response.")
    }

    greaterSender.send('sendme')
}

setup();

if(Environment.Types.Popup === Environment.currentEnv) {
    passed("popup is popup by detector.")
}
else {
    failed("popup is popup by detector.")
}

function createPF(where, count) {
    let c = 0;
    return {
        failed (m) {
            c++;

            console.log(where + ":: " + "%c" + m, "color: red; font-weight: 600;");

            if (count === c) {
                console.log(where + ":: " + "%cLast test was failed...", "color: red; font-weight: 900; font-variant: uppercase;");
            }
        },
        passed (m) {
            c++;

            console.log(where + ":: " + "%c" + m, "color: rgb(0, 220, 0); font-weight: 600;");

            if (count === c) {
                console.log(where + ":: " + "%cLast test was complete!!!", "color: rgb(0, 220, 0); font-weight: 900;");
            }
        }
    }
}