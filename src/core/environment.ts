enum EnvType {
	Tab,
	Popup,
	Background,
}

export default {
	Types: EnvType,
	currentEnv: (() => {
		const isHttp = Boolean( /^https?:$/i.exec(location.protocol) );

		if (isHttp) {
			return EnvType.Tab;
		}

		const isMozExtension = Boolean( /^moz-extension:$/i.exec(location.protocol) );

		if (!isMozExtension) {
			throw new TypeError('Environment type is not recognized. Protocol not recognized');
		}

		const isBackground = location.pathname.includes('background');

		if (isBackground) {
			return EnvType.Background;
		}

		const isPopup = location.pathname.includes('popup');

		if (isPopup) {
			return EnvType.Popup;
		}

		throw new TypeError('Environment type is not recognized. Is extension page, but pathname is not valid');
	})()
}