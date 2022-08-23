import { Browser } from "webextension-polyfill";
import {StoredList} from "../src/core/stored-list";
import { Entity } from "./entity";

declare var browser: Browser;

async function setup() {
    const list = await StoredList.create<Entity>("Ababa", browser.storage.local);

    list.onUpdate.addListener(i => console.log("BG: ", i));

    list.append(new Entity(0, "Jake"));
}

setup();