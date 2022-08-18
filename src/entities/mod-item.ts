import ModItemValidator from '../validators/mod-item';

export default class ModItem {
  public id: number;
  public title: string;
  public isDownloaded: boolean;

  constructor(id: number | ModItem, title?: string, isDownloaded = false) {
    // id: ModItem
    if (ModItemValidator.validate(id as ModItem)) {
      const item = id as ModItem;

      this.id = item.id;
      this.title = item.title;
      this.isDownloaded = item.isDownloaded;

      return this;
    }
    this.id = id as number;
    this.title = title as string;
    this.isDownloaded = isDownloaded;
  }
}
