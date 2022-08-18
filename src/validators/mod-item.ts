import ModItem from '../entities/mod-item';

const ModItemValidator: IValidator<ModItem> = {
  validate(obj: any): boolean {
    if (obj === null || typeof obj !== 'object') {
      return false;
    }

    const keys = Object.getOwnPropertyNames(obj);

    if (keys.length !== 3) {
      return false;
    }

    return keys.every((key) => ['id', 'title', 'isDownloaded'].includes(key));
  },
};

export default ModItemValidator;
