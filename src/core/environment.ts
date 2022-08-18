enum EnvironmentType {
  Tab,
  Popup,
  Background,
}

function detectEnvironmentType() {
  const isHTTP = !!location.protocol.match(/^https?\:$/i);

  if (isHTTP) return EnvironmentType.Tab;

  const isMozExtension = !!location.protocol.match(/^moz-extension\:$/i);

  if (!isMozExtension) {
    throw new TypeError('Environment type is not recognized. Is not extension page');
  }

  const isBackground = location.pathname.includes('background');

  if (isBackground) {
    return EnvironmentType.Background;
  }

  const isPopup = location.pathname.includes('popup');

  if (isPopup) {
    return EnvironmentType.Popup;
  }

  throw new TypeError('Environment type is not recognized. Is extension page, but pathname is not valid');
}

export default class Environment {
  public static readonly type: EnvironmentType = detectEnvironmentType();
  public static readonly Types: typeof EnvironmentType = EnvironmentType;
}
