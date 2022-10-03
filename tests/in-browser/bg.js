const {Messaging, Environment, Status, Tabs} = webextlib;

const [greaterSender, greaterStream] = Messaging.createTube("greating");

const {passed, failed} = createPF("BG", 4)

greaterStream.on(async (data, req) => {
    const [target, message] = data.split(':');

    if (target === "BG") {
        req.sendResponse(message);
    }
    else if (target === "sendme") {
        const response = await greaterSender.send("POPUP:hello");
        if (response.data === "hello" && response.status === Status.Success && !response.error) {
            passed("sending message to popup and waiting for response.")
        }
        else {
            failed("sending message to popup and waiting for response.")
        }
    }
});

if(Environment.Types.Background === Environment.currentEnv) {
    passed("bg is bg by detector.")
}
else {
    failed("bg is bg by detector.")
}

// Исполняет код во вкладке, встраивая дополнительный метод для возврата результата.
browser.tabs.create({
    url: "https://example.com/"
}).then(tab => {
    Tabs.execute({
        tabId: tab.id,
        code: `
            setTimeout(() => {
                document.body.style.backgroundColor = "red";
                $$$return(42);
            }, 1000);
        `,
    }).then(result => {
        if (result === 42) {
            passed("Tabs.execute is ok")
        }
        else {
            failed("Tabs.execute is not ok")
        }
    })
})

browser.tabs.create({
    url: "https://example.com/"
}).then(tab => {
    Tabs.execute({
        tabId: tab.id,
        code: `
            setTimeout(() => {
                document.body.style.backgroundColor = "red";
                just_an_function_that_return_value_to_back(42);
            }, 1000);
        `,
        fname: "just_an_function_that_return_value_to_back"
    }).then(result => {
        if (result === 42) {
            passed("Tabs.execute is ok")
        }
        else {
            failed("Tabs.execute is not ok")
        }
    })
})

browser.tabs.create({
    url: "https://example.com/"
}).then(tab => {
    Tabs.execute({
        tabId: tab.id,
        code: `
            setTimeout(() => {
                document.body.style.backgroundColor = "red";
                a(42);
            }, 1000);
        `,
        fname: "just_an_function_that_return_value_to_back"
    })
})

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