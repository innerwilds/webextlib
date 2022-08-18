import { TSR_URL_MATCH_PATTERN } from '../const';
import { download } from '../core/downloader';
import ModItem from '../entities/mod-item';
import { StoredList } from '../core/stored-list';
import browser from 'webextension-polyfill';
import { createMessage, Status } from '../core/message';
import { IMessage } from '../types';

const [sendDownloadEvent, streamDownloadEvents] = createMessage<ModItem, void>('DownloadEvents');
const [sendDownloadAll, streamDownloadAll] = createMessage<void, void>('DownloadAll');

function pingDownloadModItemEvent(modItem: ModItem) {
  sendDownloadEvent(modItem);
  browser.tabs.query({ url: TSR_URL_MATCH_PATTERN }).then((tabsList) => {
    for (const tabInfo of tabsList) sendDownloadEvent(modItem, tabInfo.id);
  });
}

class DownloadAPI {
  private items: StoredList<ModItem>;

  constructor(items: StoredList<ModItem>) {
    this.items = items;
  }

  public start() {
    streamDownloadAll.subscribe(this.handleDownloadAll);
  }

  public stop() {
    streamDownloadAll.unsubscribe(this.handleDownloadAll);
  }

  private handleDownloadAll = async (message: IMessage<void, void>) => {
    for (const modItem of this.items) {
      pingDownloadModItemEvent(modItem);

      try {
        await download(modItem);
      } catch (e) {
        pingDownloadModItemEvent(modItem);
        continue;
      }

      this.items.update(
        (mod) => mod.id === modItem.id,
        (mod) => {
          const newMod = new ModItem(mod);
          newMod.isDownloaded = true;
          return newMod;
        },
      );

      pingDownloadModItemEvent(modItem);
    }

    message.sendStatus(Status.Success);
  };
}

export { sendDownloadAll, streamDownloadEvents, DownloadAPI };
