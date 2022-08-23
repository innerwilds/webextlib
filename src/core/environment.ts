enum EnvironmentType {
	Tab,
	Popup,
	Background,
}

function detectEnvironmentType() {
	const isHttp = Boolean(/^https?:$/i.exec(location.protocol));

	if (isHttp) {
		return EnvironmentType.Tab;
	}

	const isMozExtension = Boolean(/^moz-extension:$/i.exec(location.protocol));

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

export default {
	environmentType: detectEnvironmentType(),
	environmentTypes: EnvironmentType,
};
