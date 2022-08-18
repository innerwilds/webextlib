import ModItem from '../entities/mod-item';
import browser, { Downloads, Tabs } from 'webextension-polyfill';

export function download(modItem: ModItem) {
  const url = 'https://www.thesimsresource.com/downloads/details/id/' + modItem.id;

  return new Promise(async (resolve) => {
    const tab = await browser.tabs.create({ active: true, muted: true });

    browser.downloads.onCreated.addListener(handleDownloadsCreated);
    browser.tabs.onUpdated.addListener(handleTabUpdated, { properties: ['url'] });
    browser.tabs.update(tab.id, { url });

    async function handleTabUpdated(tabId: number, changeInfo: Tabs.UpdateUpdatePropertiesType) {
      if (!changeInfo.url) {
        return;
      }

      const { pathname } = new URL(changeInfo.url);

      if (pathname.startsWith('/downloads/details')) {
        await forceDownloadsDetails();
      } else if (pathname.startsWith('/downloads/download')) {
        await forceDownloadsDownload();
      }
    }

    async function extractFileURLFromThankYouPage(): Promise<string> {
      const execute = async () =>
        await browser.tabs.executeScript(tab.id, {
          code: `
                    let href = null;
                    const anchor = document.querySelector("#dlhref");
                    if (anchor && anchor.href.length > 10) {
                        href = anchor.href;
                    }
                    href;
                `,
        });

      console.log(await execute());

      return 'https://example.com/';
    }

    async function forceDownloadsDetails() {
      const execute = async () =>
        await browser.tabs.executeScript(tab.id, {
          code: `
                    let flag = false;
                    const btn = document.querySelector(".download-button");
                    if (btn) {
                        btn.click();
                        flag = true;
                    }
                    flag;
                `,
        });

      console.log(await execute());
    }

    async function forceDownloadsDownload() {
      const execute = async () =>
        await browser.tabs.executeScript(tab.id, {
          code: `
                    let flag = false;
                    const timerEl = document.querySelector("#dlmessage .countdown");

                    if (!timerEl) {
                        return flag;
                    }
        
                    if (+timerEl.innerText > 0) {
                        return flag;
                    }
        
                    const btn = document.querySelector(".downloader");
        
                    if (btn) {
                        btn.click();
                        flag = true;
                    }
        
                    flag;
                `,
        });

      console.log(await execute());
    }

    async function handleDownloadsCreated({ url: downloadURL }: Downloads.DownloadItem) {
      const downloadURLObj = new URL(downloadURL);
      const fileURLObj = new URL(await extractFileURLFromThankYouPage());

      if (downloadURLObj.pathname === fileURLObj.pathname && downloadURLObj.host === fileURLObj.host) {
        browser.downloads.onCreated.removeListener(handleDownloadsCreated);
        browser.tabs.remove(tab.id!);
        resolve(true);
      }
    }
  });
}
