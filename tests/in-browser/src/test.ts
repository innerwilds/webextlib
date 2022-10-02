const key = "^#@testPassedNumber";

export default async function passed(name: string) {
    const rec = await browser.storage.local.get(key);

    let n = rec[key] ? rec[key] : 1;

    console.log("Test " + name + " is passed #" + n);

    browser.storage.local.set({[key]: ++n});
}